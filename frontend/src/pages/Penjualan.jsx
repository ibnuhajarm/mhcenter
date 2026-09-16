import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, MagnifyingGlass, FloppyDisk, Trash, Gift, Tag } from "@phosphor-icons/react";
import { api, fmtRp } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ReceiptResult from "@/components/ReceiptResult";
import ReviewDialog from "@/components/ReviewDialog";

export default function Penjualan() {
  const { sales } = useAuth();
  const [stock, setStock] = useState([]);
  const [cart, setCart] = useState({}); // { kode_produk: qty }
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(null); // saved txn snapshot

  const load = async () => {
    try {
      const { data } = await api.get("/stock/sales");
      setStock(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal memuat stok");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return stock.filter(
      (p) =>
        !q ||
        p.nama_produk.toLowerCase().includes(q) ||
        p.kode_produk.toLowerCase().includes(q)
    );
  }, [stock, query]);

  const calcLine = (p, qty) => {
    const beli = p.program?.beli || 0;
    const gratis = p.program?.gratis || 0;
    const potongan = p.program?.potongan_harga || 0;
    let bonus_qty = 0;
    if (beli > 0 && gratis > 0) bonus_qty = Math.floor(qty / beli) * gratis;
    const subtotalBefore = qty * p.harga_jual;
    const diskon = potongan * qty;
    const subtotal = Math.max(0, subtotalBefore - diskon);
    return { bonus_qty, diskon, subtotal };
  };

  const items = useMemo(() => {
    return stock
      .filter((p) => cart[p.kode_produk] > 0)
      .map((p) => {
        const qty = cart[p.kode_produk];
        const { bonus_qty, diskon, subtotal } = calcLine(p, qty);
        return {
          kode_produk: p.kode_produk,
          nama_produk: p.nama_produk,
          qty,
          bonus_qty,
          diskon,
          harga_jual: p.harga_jual,
          subtotal,
          _stockAvail: p.qty,
        };
      });
  }, [cart, stock]);

  const grandTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalUnit = items.reduce((s, i) => s + i.qty + i.bonus_qty, 0);

  const change = (p, delta) => {
    setCart((c) => {
      const cur = c[p.kode_produk] || 0;
      let next = cur + delta;
      if (next < 0) next = 0;
      // Max: total sale+bonus must not exceed stock
      const beli = p.program?.beli || 0;
      const gratis = p.program?.gratis || 0;
      let maxSale = p.qty;
      if (beli > 0 && gratis > 0) {
        // find max sale such that qty + floor(qty/beli)*gratis <= stock
        let bestQty = 0;
        for (let q = 0; q <= p.qty; q++) {
          const b = Math.floor(q / beli) * gratis;
          if (q + b <= p.qty) bestQty = q; else break;
        }
        maxSale = bestQty;
      }
      if (next > maxSale) {
        toast.error(`Stok tersedia hanya cukup untuk ${maxSale} unit`);
        return { ...c, [p.kode_produk]: maxSale };
      }
      return { ...c, [p.kode_produk]: next };
    });
  };

  const clearCart = () => setCart({});

  const submit = async () => {
    if (items.length === 0) return toast.error("Belum ada produk di keranjang");
    setSaving(true);
    try {
      const payload = {
        items: items.map((i) => ({
          kode_produk: i.kode_produk,
          nama_produk: i.nama_produk,
          qty: i.qty,
          bonus_qty: i.bonus_qty,
          diskon: i.diskon,
          harga_jual: i.harga_jual,
          subtotal: i.subtotal,
        })),
        total: grandTotal,
        note: "",
      };
      const { data } = await api.post("/transaction/sales", payload);
      toast.success("Penjualan tersimpan");
      setConfirmed({ ...payload, dateStr: new Date().toLocaleString("id-ID") });
      setCart({});
      setReviewOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4">
        <div className="label-caps">Panel</div>
        <h1 className="text-3xl font-black tracking-tight">INPUT PENJUALAN</h1>
        <p className="text-sm text-zinc-600">Pilih produk & qty, lalu review sebelum menyimpan. Stok mengikuti Google Sheet (read-only).</p>
      </div>

      <div className="mb-3 flex items-center gap-2 border-2 border-zinc-900 bg-white px-3">
        <MagnifyingGlass size={18} weight="bold" />
        <input
          data-testid="search-produk"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari kode / nama produk..."
          className="w-full bg-transparent py-3 text-sm outline-none"
        />
      </div>

      <div className="border-2 border-zinc-900 bg-white" data-testid="produk-list">
        {loading ? (
          <div className="p-6 text-center text-sm text-zinc-500">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">Tidak ada produk</div>
        ) : (
          <ul className="divide-y-2 divide-zinc-100">
            {filtered.map((p) => {
              const qty = cart[p.kode_produk] || 0;
              const line = qty > 0 ? calcLine(p, qty) : null;
              const remaining = p.qty - qty - (line?.bonus_qty || 0);
              return (
                <li key={p.kode_produk} className="p-3" data-testid={`row-${p.kode_produk}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="mono text-[10px] font-bold text-zinc-500">{p.kode_produk}</div>
                      <div className="text-sm font-bold leading-tight">{p.nama_produk}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="mono font-bold">{fmtRp(p.harga_jual)}</span>
                        <span className="mono border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[10px]">
                          Stok: {remaining}/{p.qty}
                        </span>
                        {p.program?.beli ? (
                          <span className="inline-flex items-center gap-1 border border-[#E11414] bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#E11414]">
                            <Gift size={10} weight="fill" /> Beli {p.program.beli} Gratis {p.program.gratis}
                          </span>
                        ) : null}
                        {p.program?.potongan_harga ? (
                          <span className="inline-flex items-center gap-1 border border-green-600 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                            <Tag size={10} weight="fill" /> -{fmtRp(p.program.potongan_harga)}/pcs
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        data-testid={`btn-minus-${p.kode_produk}`}
                        onClick={() => change(p, -1)}
                        className="h-9 w-9 border-2 border-zinc-900 bg-white active:translate-y-[1px]"
                      >
                        <Minus size={14} weight="bold" className="mx-auto" />
                      </button>
                      <input
                        data-testid={`input-qty-${p.kode_produk}`}
                        type="number"
                        value={qty}
                        onChange={(e) => {
                          const n = parseInt(e.target.value || "0", 10);
                          setCart((c) => ({ ...c, [p.kode_produk]: 0 }));
                          setTimeout(() => change(p, n), 0);
                        }}
                        className="mono h-9 w-12 border-y-2 border-zinc-900 bg-zinc-50 text-center font-bold outline-none"
                      />
                      <button
                        data-testid={`btn-plus-${p.kode_produk}`}
                        onClick={() => change(p, 1)}
                        className="h-9 w-9 border-2 border-zinc-900 bg-[#E11414] text-white active:translate-y-[1px]"
                      >
                        <Plus size={14} weight="bold" className="mx-auto" />
                      </button>
                    </div>
                  </div>
                  {qty > 0 && line ? (
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-zinc-300 pt-2 text-xs">
                      <span className="mono text-zinc-500">
                        {qty} × {fmtRp(p.harga_jual)}
                        {line.bonus_qty ? ` + ${line.bonus_qty} bonus` : ""}
                        {line.diskon ? ` − ${fmtRp(line.diskon)}` : ""}
                      </span>
                      <span className="mono font-black">{fmtRp(line.subtotal)}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sticky Summary bar */}
      {items.length > 0 && !confirmed && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t-2 border-zinc-900 bg-[#142043] text-white">
          <div className="mx-auto flex max-w-2xl items-center gap-3 p-3">
            <div className="flex-1">
              <div className="label-caps !text-zinc-400">{items.length} item · {totalUnit} unit</div>
              <div className="mono text-xl font-black text-[#E11414]" data-testid="cart-total">{fmtRp(grandTotal)}</div>
            </div>
            <button
              data-testid="btn-clear-cart"
              onClick={clearCart}
              className="border-2 border-zinc-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300"
            >
              <Trash size={14} weight="bold" />
            </button>
            <button
              data-testid="btn-review-penjualan"
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
        title="Review Penjualan"
        items={items}
        total={grandTotal}
        totalUnit={totalUnit}
        onConfirm={submit}
        saving={saving}
      />

      {/* Post-save receipt view */}
      {confirmed && (
        <div className="mt-6" data-testid="receipt-container">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight">Bukti Transaksi</h2>
            <button
              data-testid="btn-new-txn"
              onClick={() => setConfirmed(null)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-900"
            >
              Transaksi Baru
            </button>
          </div>
          <ReceiptResult
            title="Bukti Penjualan"
            filename={`Penjualan-${sales.kode_sales}-${Date.now()}.png`}
            sales={sales}
            items={confirmed.items}
            total={confirmed.total}
            note={confirmed.note}
            dateStr={confirmed.dateStr}
            downloadTestId="btn-download-png"
          />
        </div>
      )}
    </div>
  );
}
