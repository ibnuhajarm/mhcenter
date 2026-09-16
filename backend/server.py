from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import requests
import csv
import io
import re
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'sales-monitor-secret-key-v1')
JWT_ALGO = 'HS256'
DEFAULT_ADMIN_PASSWORD = 'admin123'

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Models ----------
class LoginRequest(BaseModel):
    kode_sales: str
    password: str

class AdminLoginRequest(BaseModel):
    password: str

class SheetConfig(BaseModel):
    master_sales: str = ""
    master_produk: str = ""
    program_berjalan: str = ""
    stok_sales: str = ""
    stok_gudang: str = ""

class SalesLineItem(BaseModel):
    kode_produk: str
    nama_produk: str
    qty: int
    harga_jual: float
    bonus_qty: int = 0
    diskon: float = 0
    subtotal: float

class SalesTransaction(BaseModel):
    items: List[SalesLineItem]
    total: float
    note: Optional[str] = ""

class LoadingLineItem(BaseModel):
    kode_produk: str
    nama_produk: str
    qty: int
    harga_jual: float
    subtotal: float

class LoadingTransaction(BaseModel):
    items: List[LoadingLineItem]
    total: float
    note: Optional[str] = ""

class AdminPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

# ---------- Auth utility ----------
def create_token(payload: dict, hours: int = 24) -> str:
    data = payload.copy()
    data['exp'] = datetime.now(timezone.utc) + timedelta(hours=hours)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGO)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid atau sudah expired")

async def get_current_sales(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Otentikasi diperlukan")
    payload = decode_token(authorization.split(' ', 1)[1])
    if payload.get('role') != 'sales':
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return payload

async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Otentikasi admin diperlukan")
    payload = decode_token(authorization.split(' ', 1)[1])
    if payload.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Akses admin ditolak")
    return payload

# ---------- Google Sheets parsing ----------
def to_csv_url(url: str) -> str:
    """Convert any Google Sheets share/pubhtml URL to a CSV-exporting URL."""
    if not url:
        return url
    u = url.strip()
    # Already CSV
    if 'output=csv' in u:
        return u
    # /pubhtml (published) → /pub?output=csv
    if '/pubhtml' in u:
        return u.split('/pubhtml')[0] + '/pub?output=csv'
    # /edit or /view (normal share) → /export?format=csv
    m = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', u)
    if m:
        sheet_id = m.group(1)
        return f'https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv'
    return u

def parse_pubhtml(url: str) -> List[List[str]]:
    """Fetch a Google Sheets URL as CSV and return rows."""
    if not url:
        return []
    csv_url = to_csv_url(url)
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SalesMonitor/1.0)"}
    r = requests.get(csv_url, timeout=30, headers=headers, allow_redirects=True)
    r.raise_for_status()
    text = r.text
    reader = csv.reader(io.StringIO(text))
    rows = [row for row in reader if any(c.strip() for c in row)]
    return rows

def _norm_key(h: str) -> str:
    """Normalize a header string to a snake_case key, stripping parenthetical hints."""
    h = h.strip().lower()
    # remove content within parens: "beli(jumlah_bayar)" -> "beli"
    h = re.sub(r'\([^)]*\)', '', h)
    h = h.strip().replace(' ', '_')
    return h

def rows_to_dicts(rows: List[List[str]]) -> List[Dict[str, str]]:
    if not rows:
        return []
    header = [_norm_key(h) for h in rows[0]]
    data = []
    for row in rows[1:]:
        if not any(row):
            continue
        d = {}
        for i, h in enumerate(header):
            d[h] = row[i].strip() if i < len(row) else ""
        data.append(d)
    return data

def to_int(v, default=0):
    try:
        return int(float(str(v).replace(',', '').replace('.', '').strip())) if v else default
    except Exception:
        return default

def to_float(v, default=0.0):
    try:
        s = str(v).replace(',', '').strip()
        return float(s) if s else default
    except Exception:
        return default

# ---------- Config helpers ----------
async def get_config() -> dict:
    doc = await db.config.find_one({"_id": "sheet_config"})
    return doc or {}

async def save_config(cfg: dict):
    await db.config.update_one({"_id": "sheet_config"}, {"$set": cfg}, upsert=True)

async def get_admin_pw() -> str:
    doc = await db.config.find_one({"_id": "admin"})
    if not doc:
        return DEFAULT_ADMIN_PASSWORD
    return doc.get('password', DEFAULT_ADMIN_PASSWORD)

# ---------- Sync from Google Sheet ----------
async def sync_all_sheets() -> dict:
    cfg = await get_config()
    result = {"master_sales": 0, "master_produk": 0, "program_berjalan": 0, "stok_sales": 0, "stok_gudang": 0}

    # Master Sales
    if cfg.get('master_sales'):
        data = rows_to_dicts(parse_pubhtml(cfg['master_sales']))
        if data:
            await db.master_sales.delete_many({})
            docs = [{
                "kode_sales": str(d.get('kode_sales', '')).strip(),
                "nama_sales": d.get('nama_sales', '').strip(),
                "area_sales": d.get('area_sales', '').strip(),
                "password": str(d.get('password', '')).strip(),
            } for d in data if d.get('kode_sales')]
            if docs:
                await db.master_sales.insert_many(docs)
            result['master_sales'] = len(docs)

    # Master Produk
    if cfg.get('master_produk'):
        data = rows_to_dicts(parse_pubhtml(cfg['master_produk']))
        if data:
            await db.master_produk.delete_many({})
            docs = [{
                "kode_produk": str(d.get('kode_produk', '')).strip(),
                "nama_produk": d.get('nama_produk', '').strip(),
                "harga_jual": to_float(d.get('harga_jual', 0)),
            } for d in data if d.get('kode_produk')]
            if docs:
                await db.master_produk.insert_many(docs)
            result['master_produk'] = len(docs)

    # Program Berjalan
    if cfg.get('program_berjalan'):
        data = rows_to_dicts(parse_pubhtml(cfg['program_berjalan']))
        await db.program_berjalan.delete_many({})
        docs = [{
            "kode_produk": str(d.get('kode_produk', '')).strip(),
            "beli": to_int(d.get('beli', 0)),
            "gratis": to_int(d.get('gratis', 0)),
            "potongan_harga": to_float(d.get('potongan_harga', 0) or d.get('potongan', 0)),
        } for d in data if d.get('kode_produk')]
        if docs:
            await db.program_berjalan.insert_many(docs)
        result['program_berjalan'] = len(docs)

    # Stok Sales
    if cfg.get('stok_sales'):
        data = rows_to_dicts(parse_pubhtml(cfg['stok_sales']))
        await db.stok_sales.delete_many({})
        docs = [{
            "kode_sales": str(d.get('kode_sales', '')).strip(),
            "kode_produk": str(d.get('kode_produk', '')).strip(),
            "qty": to_int(d.get('qty_pembawaan', 0) or d.get('qty', 0)),
        } for d in data if d.get('kode_sales') and d.get('kode_produk')]
        if docs:
            await db.stok_sales.insert_many(docs)
        result['stok_sales'] = len(docs)

    # Stok Gudang
    if cfg.get('stok_gudang'):
        data = rows_to_dicts(parse_pubhtml(cfg['stok_gudang']))
        await db.stok_gudang.delete_many({})
        docs = [{
            "kode_produk": str(d.get('kode_produk', '')).strip(),
            "qty": to_int(d.get('qty_produk', 0) or d.get('qty', 0)),
        } for d in data if d.get('kode_produk')]
        if docs:
            await db.stok_gudang.insert_many(docs)
        result['stok_gudang'] = len(docs)

    await db.config.update_one(
        {"_id": "sync_meta"},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return result

# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Sales Monitor API", "status": "ok"}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    sales = await db.master_sales.find_one({"kode_sales": req.kode_sales.strip()})
    if not sales:
        raise HTTPException(status_code=401, detail="Kode sales tidak ditemukan. Pastikan admin sudah sinkronisasi data.")
    if str(sales.get('password', '')).strip() != req.password.strip():
        raise HTTPException(status_code=401, detail="Password salah")
    token = create_token({"role": "sales", "kode_sales": sales['kode_sales']})
    return {
        "token": token,
        "sales": {
            "kode_sales": sales['kode_sales'],
            "nama_sales": sales.get('nama_sales', ''),
            "area_sales": sales.get('area_sales', ''),
        }
    }

@api_router.post("/auth/admin-login")
async def admin_login(req: AdminLoginRequest):
    pw = await get_admin_pw()
    if req.password != pw:
        raise HTTPException(status_code=401, detail="Password admin salah")
    token = create_token({"role": "admin"}, hours=12)
    return {"token": token}

@api_router.get("/me")
async def me(user=Depends(get_current_sales)):
    sales = await db.master_sales.find_one({"kode_sales": user['kode_sales']})
    if not sales:
        raise HTTPException(status_code=404, detail="Sales tidak ditemukan")
    return {
        "kode_sales": sales['kode_sales'],
        "nama_sales": sales.get('nama_sales', ''),
        "area_sales": sales.get('area_sales', ''),
    }

@api_router.get("/stock/sales")
async def get_sales_stock(user=Depends(get_current_sales)):
    """Get products carried by current sales with current qty and price."""
    kode_sales = user['kode_sales']
    stocks = await db.stok_sales.find({"kode_sales": kode_sales}).to_list(2000)
    products = {}
    async for p in db.master_produk.find({}):
        products[p['kode_produk']] = p
    programs = {}
    async for pg in db.program_berjalan.find({}):
        programs[pg['kode_produk']] = pg

    result = []
    for s in stocks:
        prod = products.get(s['kode_produk'])
        if not prod:
            continue
        result.append({
            "kode_produk": s['kode_produk'],
            "nama_produk": prod.get('nama_produk', ''),
            "harga_jual": prod.get('harga_jual', 0),
            "qty": s.get('qty', 0),
            "program": {
                "beli": programs.get(s['kode_produk'], {}).get('beli', 0),
                "gratis": programs.get(s['kode_produk'], {}).get('gratis', 0),
                "potongan_harga": programs.get(s['kode_produk'], {}).get('potongan_harga', 0),
            } if s['kode_produk'] in programs else None,
        })
    result.sort(key=lambda x: x['nama_produk'])
    return result

@api_router.get("/stock/gudang")
async def get_gudang_stock(user=Depends(get_current_sales)):
    stocks = await db.stok_gudang.find({}).to_list(5000)
    products = {}
    async for p in db.master_produk.find({}):
        products[p['kode_produk']] = p
    result = []
    for s in stocks:
        prod = products.get(s['kode_produk'])
        if not prod:
            continue
        result.append({
            "kode_produk": s['kode_produk'],
            "nama_produk": prod.get('nama_produk', ''),
            "harga_jual": prod.get('harga_jual', 0),
            "qty": s.get('qty', 0),
        })
    result.sort(key=lambda x: x['nama_produk'])
    return result

@api_router.post("/transaction/sales")
async def submit_sales(txn: SalesTransaction, user=Depends(get_current_sales)):
    kode_sales = user['kode_sales']
    # Validate stock
    for item in txn.items:
        total_deduct = item.qty + item.bonus_qty
        stock = await db.stok_sales.find_one({"kode_sales": kode_sales, "kode_produk": item.kode_produk})
        if not stock or stock.get('qty', 0) < total_deduct:
            raise HTTPException(status_code=400, detail=f"Stok tidak cukup untuk {item.nama_produk}")
    # Stock is managed manually via Google Sheet sync; do not mutate here.
    # Save transaction
    doc = {
        "id": str(uuid.uuid4()),
        "type": "sales",
        "kode_sales": kode_sales,
        "items": [i.model_dump() for i in txn.items],
        "total": txn.total,
        "note": txn.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.post("/transaction/loading")
async def submit_loading(txn: LoadingTransaction, user=Depends(get_current_sales)):
    kode_sales = user['kode_sales']
    # Validate warehouse stock
    for item in txn.items:
        gudang = await db.stok_gudang.find_one({"kode_produk": item.kode_produk})
        if not gudang or gudang.get('qty', 0) < item.qty:
            raise HTTPException(status_code=400, detail=f"Stok gudang tidak cukup untuk {item.nama_produk}")
    # Stock is managed manually via Google Sheet sync; do not mutate here.
    doc = {
        "id": str(uuid.uuid4()),
        "type": "loading",
        "kode_sales": kode_sales,
        "items": [i.model_dump() for i in txn.items],
        "total": txn.total,
        "note": txn.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.get("/transactions")
async def list_transactions(user=Depends(get_current_sales)):
    kode_sales = user['kode_sales']
    txns = await db.transactions.find({"kode_sales": kode_sales}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return txns

# ---------- Admin routes ----------
@api_router.get("/admin/config")
async def admin_get_config(admin=Depends(get_current_admin)):
    cfg = await get_config()
    meta = await db.config.find_one({"_id": "sync_meta"}) or {}
    counts = {
        "master_sales": await db.master_sales.count_documents({}),
        "master_produk": await db.master_produk.count_documents({}),
        "program_berjalan": await db.program_berjalan.count_documents({}),
        "stok_sales": await db.stok_sales.count_documents({}),
        "stok_gudang": await db.stok_gudang.count_documents({}),
    }
    return {
        "config": {
            "master_sales": cfg.get('master_sales', ''),
            "master_produk": cfg.get('master_produk', ''),
            "program_berjalan": cfg.get('program_berjalan', ''),
            "stok_sales": cfg.get('stok_sales', ''),
            "stok_gudang": cfg.get('stok_gudang', ''),
        },
        "last_sync": meta.get('last_sync'),
        "counts": counts,
    }

@api_router.post("/admin/config")
async def admin_save_config(cfg: SheetConfig, admin=Depends(get_current_admin)):
    await save_config(cfg.model_dump())
    return {"ok": True}

@api_router.post("/admin/sync")
async def admin_sync(admin=Depends(get_current_admin)):
    try:
        result = await sync_all_sheets()
        return {"ok": True, "counts": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal sinkronisasi: {str(e)}")

@api_router.post("/admin/password")
async def admin_update_password(req: AdminPasswordUpdate, admin=Depends(get_current_admin)):
    current = await get_admin_pw()
    if req.current_password != current:
        raise HTTPException(status_code=401, detail="Password saat ini salah")
    await db.config.update_one({"_id": "admin"}, {"$set": {"password": req.new_password}}, upsert=True)
    return {"ok": True}

@api_router.get("/admin/transactions")
async def admin_transactions(admin=Depends(get_current_admin)):
    txns = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return txns


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
