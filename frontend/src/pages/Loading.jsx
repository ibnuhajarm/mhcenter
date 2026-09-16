import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, MagnifyingGlass, FloppyDisk, Trash, Truck } from "@phosphor-icons/react";
import { api, fmtRp } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ReceiptResult from "@/components/ReceiptResult";
import ReviewDialog from "@/components/ReviewDialog";

export default function Loading() {
  const { sales } = useAuth();
  const [stock, setStock] = useState([]);
  const [cart, setCart] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/stock/gudang");
      setStock(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal memuat stok gudang");
    } finally {
      setLoad(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return stock.filter(
      (p) => !q || p.nama_produk.toLowerCase().includes(q) || p.kode_produk.toLowerCase().includes(q)
    );
  }, [stock, query]);

  const items = useMemo(
    () =>
      stock
        .filter((p) => cart[p.kode_produk] > 0)
        .map((p) => ({
          kode_produk: p.kode_produk,
          nama_produk: p.nama_produk,
          qty: cart[p.kode_produk],
          harga_jual: p.harga_jual,
          subtotal: cart[p.kode_produk] * p.harga_jual,
        })),
    [cart, stock]
  );
  const grandTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalUnit = items.reduce((s, i) => s + i.qty, 0);

  const change = (p, delta) => {
    setCart((c) => {
      const cur = c[p.kode_produk] || 0;
      let next = cur + delta;
      if (next < 0) next = 0;
      if (next > p.qty) {
        toast.error(`Stok gudang hanya ${p.qty}`);
        return { ...c, [p.kode_produk]: p.qty };
      }
      return { ...c, [p.kode_produk]: next };
    });
  };

  const clearCart = () => setCart({});

  const submit = async () => {
    if (items.length === 0) return toast.error("Belum ada produk yang di-loading");
    setSaving(true);
    try {
      const payload = { items, total: grandTotal, note: "" };
      await api.post("/transaction/loading", payload);
      toast.success("Loading tersimpan");
      setConfirmed({ ...payload, dateStr: new Date().toLocaleString("id-ID") });
      setCart({});
      setReviewOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menyimpan loading");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4">
        <div className="label-caps">Panel</div>
        <h1 className="text-3xl font-black tracking-tight">INPUT LOADING</h1>
        <p className="text-sm text-zinc-600">Ambil stok dari gudang aktual untuk dibawa keluar.</p>
      </div>

      <div className="mb-3 flex items-center gap-2 border-2 border-zinc-900 bg-white px-3">
        <MagnifyingGlass size={18} weight="bold" />
        <input
          data-testid="search-gudang"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari kode / nama produk gudang..."
          className="w-full bg-transparent py-3 text-sm outline-none"
        />
      </div>

      <div className="border-2 border-zinc-900 bg-white" data-testid="gudang-list">
        {loading ? (
          <div className="p-6 text-center text-sm text-zinc-500">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            <Truck size={32} weight="light" className="mx-auto mb-2 opacity-50" />
            Stok gudang kosong. Admin perlu sinkronisasi.
          </div>
        ) : (
          <ul className="divide-y-2 divide-zinc-100">
            {filtered.map((p) => {
              const qty = cart[p.kode_produk] || 0;
              return (
                <li key={p.kode_produk} className="p-3" data-testid={`gudang-row-${p.kode_produk}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="mono text-[10px] font-bold text-zinc-500">{p.kode_produk}</div>
                      <div className="text-sm font-bold leading-tight">{p.nama_produk}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="mono font-bold">{fmtRp(p.harga_jual)}</span>
                        <span className="mono border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[10px]">
                          Gudang: {p.qty - qty}/{p.qty}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        data-testid={`btn-gudang-minus-${p.kode_produk}`}
                        onClick={() => change(p, -1)}
                        className="h-9 w-9 border-2 border-zinc-900 bg-white active:translate-y-[1px]"
                      >
                        <Minus size={14} weight="bold" className="mx-auto" />
                      </button>
                      <input
                        data-testid={`input-gudang-qty-${p.kode_produk}`}
                        type="number"
                        value={qty}
                        onChange={(e) => {
                          const n = parseInt(e.target.value || "0", 10);
                          setCart((c) => ({ ...c, [p.kode_produk]: Math.max(0, Math.min(n, p.qty)) }));
                        }}
                        className="mono h-9 w-12 border-y-2 border-zinc-900 bg-zinc-50 text-center font-bold outline-none"
                      />
                      <button
                        data-testid={`btn-gudang-plus-${p.kode_produk}`}
                        onClick={() => change(p, 1)}
                        className="h-9 w-9 border-2 border-zinc-900 bg-[#E11414] text-white active:translate-y-[1px]"
                      >
                        <Plus size={14} weight="bold" className="mx-auto" />
                      </button>
                    </div>
                  </div>
                  {qty > 0 ? (
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-zinc-300 pt-2 text-xs">
                      <span className="mono text-zinc-500">{qty} × {fmtRp(p.harga_jual)}</span>
                      <span className="mono font-black">{fmtRp(qty * p.harga_jual)}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {items.length > 0 && !confirmed && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t-2 border-zinc-900 bg-[#142043] text-white">
          <div className="mx-auto flex max-w-2xl items-center gap-3 p-3">
            <div className="flex-1">
              <div className="label-caps !text-zinc-400">{items.length} item · {totalUnit} unit</div>
              <div className="mono text-xl font-black text-[#E11414]" data-testid="loading-total">{fmtRp(grandTotal)}</div>
            </div>
            <button
              data-testid="btn-loading-clear"
              onClick={clearCart}
              className="border-2 border-zinc-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300"
            >
              <Trash size={14} weight="bold" />
            </button>
            <button
              data-testid="btn-review-loading"
              onClick={() => setReviewOpen(true)}
              className="flex items-center gap-2 border-2 border-white bg-[#E11414] px-4 py-3 text-sm font-black uppercase tracking-widest active:translate-y-[2px]"
            >
              <FloppyDisk size={16} weight="bold" /> Review & Simpan
            </button>
          </div>
        </div>
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Review Loading"
        items={items}
        total={grandTotal}
        totalUnit={totalUnit}
        onConfirm={submit}
        saving={saving}
      />

      {confirmed && (
        <div className="mt-6" data-testid="loading-receipt-container">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight">Bukti Loading</h2>
            <button
              data-testid="btn-loading-new"
              onClick={() => setConfirmed(null)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-900"
            >
              Loading Baru
            </button>
          </div>
          <ReceiptResult
            title="Bukti Loading"
            filename={`Loading-${sales.kode_sales}-${Date.now()}.png`}
            sales={sales}
            items={confirmed.items}
            total={confirmed.total}
            note={confirmed.note}
            dateStr={confirmed.dateStr}
            downloadTestId="btn-loading-download-png"
            shareTestId="btn-loading-share-png"
          />
        </div>
      )}
    </div>
  );
}
