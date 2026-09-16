"""Backend API tests for Sales Monitor app."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sales-dashboard-app-28.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_PW = "admin123"
SALES_KODE = "277"
SALES_PW = "12345"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()

@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/admin-login", json={"password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def sales_token(s):
    r = s.post(f"{API}/auth/login", json={"kode_sales": SALES_KODE, "password": SALES_PW}, timeout=30)
    assert r.status_code == 200, f"sales login failed: {r.status_code} {r.text}"
    return r.json()["token"]

def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
def test_root(s):
    r = s.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ---------- Auth ----------
def test_admin_login_success(s):
    r = s.post(f"{API}/auth/admin-login", json={"password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200
    assert "token" in r.json()

def test_admin_login_wrong(s):
    r = s.post(f"{API}/auth/admin-login", json={"password": "wrong"}, timeout=30)
    assert r.status_code == 401

def test_sales_login_success(s):
    r = s.post(f"{API}/auth/login", json={"kode_sales": SALES_KODE, "password": SALES_PW}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "token" in d
    assert d["sales"]["kode_sales"] == SALES_KODE
    assert d["sales"]["nama_sales"] == "DIDIK YULIANTO"
    assert d["sales"]["area_sales"] == "MUH KEDIRI1"

def test_sales_login_wrong_password(s):
    r = s.post(f"{API}/auth/login", json={"kode_sales": SALES_KODE, "password": "badpw"}, timeout=30)
    assert r.status_code == 401


# ---------- Protected routes / RBAC ----------
def test_me_missing_token(s):
    r = s.get(f"{API}/me", timeout=30)
    assert r.status_code == 401

def test_me_invalid_token(s):
    r = s.get(f"{API}/me", headers={"Authorization": "Bearer garbage"}, timeout=30)
    assert r.status_code == 401

def test_sales_cannot_access_admin(s, sales_token):
    r = s.get(f"{API}/admin/config", headers=auth(sales_token), timeout=30)
    assert r.status_code == 403

def test_admin_cannot_access_sales(s, admin_token):
    r = s.get(f"{API}/me", headers=auth(admin_token), timeout=30)
    assert r.status_code == 403


# ---------- Sales info & stock ----------
def test_me(s, sales_token):
    r = s.get(f"{API}/me", headers=auth(sales_token), timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["kode_sales"] == SALES_KODE
    assert d["nama_sales"] == "DIDIK YULIANTO"
    assert d["area_sales"] == "MUH KEDIRI1"

def test_stock_sales(s, sales_token):
    r = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    assert len(lst) > 0
    item = lst[0]
    for k in ["kode_produk", "nama_produk", "harga_jual", "qty"]:
        assert k in item

def test_stock_gudang(s, sales_token):
    r = s.get(f"{API}/stock/gudang", headers=auth(sales_token), timeout=30)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    assert len(lst) >= 1


# ---------- Admin config & sync ----------
def test_admin_config(s, admin_token):
    r = s.get(f"{API}/admin/config", headers=auth(admin_token), timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert "config" in d and "counts" in d
    counts = d["counts"]
    # Should already be populated
    assert counts["master_sales"] >= 1
    assert counts["stok_gudang"] >= 1

def test_admin_sync(s, admin_token):
    r = s.post(f"{API}/admin/sync", headers=auth(admin_token), timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("ok") is True
    counts = d["counts"]
    # Expected numbers from problem statement
    assert counts["master_sales"] == 28
    assert counts["master_produk"] == 65
    assert counts["program_berjalan"] == 2
    assert counts["stok_sales"] == 258
    assert counts["stok_gudang"] == 46


# ---------- Transactions ----------
def _pick_available_sales_item(s, sales_token, min_qty=2):
    r = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    assert r.status_code == 200
    for it in r.json():
        if it.get("qty", 0) >= min_qty:
            return it
    return None

def test_transaction_sales_insufficient_stock(s, sales_token):
    item = _pick_available_sales_item(s, sales_token, 1)
    assert item is not None
    payload = {
        "items": [{
            "kode_produk": item["kode_produk"],
            "nama_produk": item["nama_produk"],
            "qty": item["qty"] + 999,
            "harga_jual": item["harga_jual"],
            "subtotal": (item["qty"] + 999) * item["harga_jual"],
        }],
        "total": (item["qty"] + 999) * item["harga_jual"],
        "note": "test-insufficient",
    }
    r = s.post(f"{API}/transaction/sales", json=payload, headers=auth(sales_token), timeout=30)
    assert r.status_code == 400

def test_transaction_sales_success_and_stock_deduction(s, sales_token):
    item = _pick_available_sales_item(s, sales_token, 1)
    assert item is not None
    qty = 1
    before = item["qty"]
    payload = {
        "items": [{
            "kode_produk": item["kode_produk"],
            "nama_produk": item["nama_produk"],
            "qty": qty,
            "harga_jual": item["harga_jual"],
            "subtotal": qty * item["harga_jual"],
        }],
        "total": qty * item["harga_jual"],
        "note": "TEST_sales_txn",
    }
    r = s.post(f"{API}/transaction/sales", json=payload, headers=auth(sales_token), timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["type"] == "sales"
    assert "id" in d
    # Verify stock deducted
    r2 = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    after_map = {i["kode_produk"]: i["qty"] for i in r2.json()}
    assert after_map.get(item["kode_produk"], 0) == before - qty

def test_transaction_loading_insufficient(s, sales_token):
    # Get gudang stock, pick item and request too much
    r = s.get(f"{API}/stock/gudang", headers=auth(sales_token), timeout=30)
    gudang = r.json()
    assert len(gudang) > 0
    item = gudang[0]
    payload = {
        "items": [{
            "kode_produk": item["kode_produk"],
            "nama_produk": item["nama_produk"],
            "qty": item["qty"] + 9999,
            "harga_jual": item["harga_jual"],
            "subtotal": 0,
        }],
        "total": 0,
        "note": "test-insufficient-loading",
    }
    r2 = s.post(f"{API}/transaction/loading", json=payload, headers=auth(sales_token), timeout=30)
    assert r2.status_code == 400

def test_transaction_loading_success(s, sales_token):
    r = s.get(f"{API}/stock/gudang", headers=auth(sales_token), timeout=30)
    gudang = [g for g in r.json() if g.get("qty", 0) >= 1]
    assert len(gudang) > 0
    item = gudang[0]
    gudang_before = item["qty"]
    r_ss = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    sales_before = next((x["qty"] for x in r_ss.json() if x["kode_produk"] == item["kode_produk"]), 0)

    qty = 1
    payload = {
        "items": [{
            "kode_produk": item["kode_produk"],
            "nama_produk": item["nama_produk"],
            "qty": qty,
            "harga_jual": item["harga_jual"],
            "subtotal": qty * item["harga_jual"],
        }],
        "total": qty * item["harga_jual"],
        "note": "TEST_loading",
    }
    r2 = s.post(f"{API}/transaction/loading", json=payload, headers=auth(sales_token), timeout=30)
    assert r2.status_code == 200, r2.text
    d = r2.json()
    assert d["type"] == "loading"

    # Verify stock movement
    r3 = s.get(f"{API}/stock/gudang", headers=auth(sales_token), timeout=30)
    gudang_after = next(x["qty"] for x in r3.json() if x["kode_produk"] == item["kode_produk"])
    assert gudang_after == gudang_before - qty
    r4 = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    sales_after = next((x["qty"] for x in r4.json() if x["kode_produk"] == item["kode_produk"]), 0)
    assert sales_after == sales_before + qty

def test_transactions_history_sales(s, sales_token):
    r = s.get(f"{API}/transactions", headers=auth(sales_token), timeout=30)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    # should include at least one from earlier tests
    assert len(lst) >= 1

def test_admin_transactions(s, admin_token):
    r = s.get(f"{API}/admin/transactions", headers=auth(admin_token), timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Program Berjalan (bonus) ----------
def test_transaction_sales_with_program_bonus(s, sales_token):
    # Try kode 370072 (beli 1 gratis 1) if available
    r = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    items = r.json()
    prog_item = next((i for i in items if i["kode_produk"] == "370072" and i.get("qty", 0) >= 2 and i.get("program")), None)
    if not prog_item:
        pytest.skip("Program berjalan item 370072 not available with sufficient stock for sales 277")
    before = prog_item["qty"]
    payload = {
        "items": [{
            "kode_produk": prog_item["kode_produk"],
            "nama_produk": prog_item["nama_produk"],
            "qty": 1,
            "bonus_qty": 1,
            "harga_jual": prog_item["harga_jual"],
            "subtotal": prog_item["harga_jual"],
        }],
        "total": prog_item["harga_jual"],
        "note": "TEST_program",
    }
    r2 = s.post(f"{API}/transaction/sales", json=payload, headers=auth(sales_token), timeout=30)
    assert r2.status_code == 200, r2.text
    r3 = s.get(f"{API}/stock/sales", headers=auth(sales_token), timeout=30)
    after = next(x["qty"] for x in r3.json() if x["kode_produk"] == prog_item["kode_produk"])
    assert after == before - 2  # qty + bonus


# ---------- Admin password change ----------
def test_admin_password_change_and_rollback(s, admin_token):
    new_pw = "TEST_admin_new_pw_9182"
    # wrong current
    r = s.post(f"{API}/admin/password", headers=auth(admin_token),
               json={"current_password": "wrongpw", "new_password": new_pw}, timeout=30)
    assert r.status_code == 401

    # correct change
    r = s.post(f"{API}/admin/password", headers=auth(admin_token),
               json={"current_password": ADMIN_PW, "new_password": new_pw}, timeout=30)
    assert r.status_code == 200

    # login with new
    r = s.post(f"{API}/auth/admin-login", json={"password": new_pw}, timeout=30)
    assert r.status_code == 200
    new_token = r.json()["token"]

    # rollback
    r = s.post(f"{API}/admin/password", headers=auth(new_token),
               json={"current_password": new_pw, "new_password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200

    # verify original works
    r = s.post(f"{API}/auth/admin-login", json={"password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200
