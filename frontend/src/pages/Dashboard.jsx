import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, User, Barcode, Receipt, Truck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api, fmtRp } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { sales } = useAuth();
  const nav = useNavigate();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStock = async () => {
    try {
      const { data } = await api.get("/stock/sales");
      setStock(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal memuat stok");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const totalSku = stock.length;
  const totalUnit = stock.reduce((s, p) => s + (p.qty || 0), 0);
  const totalNilai = stock.reduce((s, p) => s + (p.qty || 0) * (p.harga_jual || 0), 0);

  const stockBadge = (q) => {
    if (q <= 0) return "bg-red-100 text-red-700 border-red-300";
    if (q <= 10) return "bg-amber-100 text-amber-700 border-amber-300";
    return "bg-green-100 text-green-700 border-green-300";
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      {/* Header card */}
      <div className="border-2 border-zinc-900 bg-white p-5 shadow-brutal">
        <div className="mb-3 flex items-center justify-between">
          <span className="label-caps">Sales Aktif</span>
          <span className="border border-zinc-900 bg-[#E11414] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
            Online
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-2">
            <div className="label-caps mb-1 flex items-center gap-1"><User size={12} weight="bold" /> Nama Sales</div>
            <div data-testid="sales-nama" className="text-lg font-black leading-tight sm:text-xl">
              {sales?.nama_sales}
            </div>
          </div>
          <div>
            <div className="label-caps mb-1 flex items-center gap-1"><Barcode size={12} weight="bold" /> Kode</div>
            <div data-testid="sales-kode" className="mono text-lg font-bold">{sales?.kode_sales}</div>
          </div>
          <div>
            <div className="label-caps mb-1 flex items-center gap-1"><MapPin size={12} weight="bold" /> Area</div>
            <div data-testid="sales-area" className="text-sm font-bold">{sales?.area_sales}</div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 space-y-3">
        <div className="border-2 border-zinc-900 bg-[#142043] p-4 text-white" data-testid="metric-nilai">
          <div className="label-caps !text-zinc-300">Nilai Stok</div>
          <div className="mono text-2xl font-black text-[#E11414]">{fmtRp(totalNilai)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-zinc-900 bg-white p-3" data-testid="metric-sku">
            <div className="label-caps">SKU</div>
            <div className="mono text-2xl font-black">{totalSku}</div>
          </div>
          <div className="border-2 border-zinc-900 bg-white p-3" data-testid="metric-unit">
            <div className="label-caps">Total Unit</div>
            <div className="mono text-2xl font-black">{totalUnit}</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => nav("/penjualan")}
          data-testid="btn-quick-penjualan"
          className="flex items-center justify-between border-2 border-zinc-900 bg-[#E11414] p-4 text-white shadow-brutal active:translate-y-[2px]"
        >
          <div className="text-left">
            <div className="label-caps !text-white/80">Input</div>
            <div className="text-lg font-black">PENJUALAN</div>
          </div>
          <Receipt size={32} weight="bold" />
        </button>
        <button
          onClick={() => nav("/loading")}
          data-testid="btn-quick-loading"
          className="flex items-center justify-between border-2 border-zinc-900 bg-white p-4 shadow-brutal active:translate-y-[2px]"
        >
          <div className="text-left">
            <div className="label-caps">Input</div>
            <div className="text-lg font-black">LOADING</div>
          </div>
          <Truck size={32} weight="bold" />
        </button>
      </div>

      {/* Stock list */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">Stok Bawaan Sales</h2>
        <button
          data-testid="btn-refresh-stock"
          onClick={loadStock}
          className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-900"
        >
          Refresh
        </button>
      </div>
      <div className="mt-3 border-2 border-zinc-900 bg-white" data-testid="stock-list">
        {loading ? (
          <div className="p-6 text-center text-sm text-zinc-500">Memuat stok...</div>
        ) : stock.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            <Package size={32} weight="light" className="mx-auto mb-2 opacity-50" />
            Belum ada stok. Admin perlu sinkronisasi data.
          </div>
        ) : (
          <ul className="divide-y-2 divide-zinc-100">
            {stock.map((p) => (
              <li key={p.kode_produk} className="flex items-center gap-3 p-3">
                <span
                  className={`mono w-16 shrink-0 border-2 px-2 py-2 text-center text-lg font-black ${stockBadge(p.qty)}`}
                  data-testid={`stock-qty-${p.kode_produk}`}
                >
                  {p.qty}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mono text-[10px] font-bold text-zinc-500">{p.kode_produk}</div>
                  <div className="truncate text-sm font-bold">{p.nama_produk}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
