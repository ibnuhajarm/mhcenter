import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowsClockwise,
  FloppyDisk,
  SignOut,
  Database,
  Link as LinkIcon,
  Key,
  CheckCircle,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.webp";

const FIELDS = [
  { key: "master_sales", label: "Master ID Sales", desc: "area_sales, kode_sales, nama_sales, password" },
  { key: "master_produk", label: "Master Produk", desc: "kode_produk, nama_produk, harga_jual" },
  { key: "program_berjalan", label: "Program Berjalan", desc: "kode_produk, beli, gratis, potongan_harga" },
  { key: "stok_sales", label: "Stok Actual Sales", desc: "kode_sales, kode_produk, qty_pembawaan" },
  { key: "stok_gudang", label: "Stok Gudang", desc: "kode_produk, qty_produk" },
];

/* eslint-disable react-hooks/exhaustive-deps */
export default function AdminPanel() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [cfg, setCfg] = useState({
    master_sales: "",
    master_produk: "",
    program_berjalan: "",
    stok_sales: "",
    stok_gudang: "",
  });
  const [counts, setCounts] = useState({});
  const [lastSync, setLastSync] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "" });

  const load = async () => {
    try {
      const { data } = await api.get("/admin/config");
      setCfg(data.config);
      setCounts(data.counts);
      setLastSync(data.last_sync);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
        nav("/admin/login");
      } else {
        toast.error("Gagal memuat konfigurasi");
      }
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      await api.post("/admin/config", cfg);
      toast.success("Konfigurasi tersimpan");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal simpan");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/admin/sync");
      toast.success("Sinkronisasi selesai");
      setCounts(data.counts);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sync gagal");
    } finally {
      setSyncing(false);
    }
  };

  const updatePassword = async () => {
    if (!passwords.current || !passwords.next) return toast.error("Isi kedua password");
    try {
      await api.post("/admin/password", {
        current_password: passwords.current,
        new_password: passwords.next,
      });
      toast.success("Password admin diubah");
      setPasswords({ current: "", next: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal ubah password");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b-2 border-zinc-900 bg-[#142043] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Mayora United Home"
              className="h-12 w-auto rounded-full bg-white p-0.5"
              data-testid="admin-logo"
            />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E11414]">Mayora United Home · Admin</div>
              <h1 className="text-2xl font-black tracking-tight">SYNC & KONFIGURASI</h1>
            </div>
          </div>
          <button
            data-testid="btn-admin-logout"
            onClick={() => {
              logout();
              nav("/admin/login");
            }}
            className="flex items-center gap-2 border-2 border-zinc-600 px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800"
          >
            <SignOut size={14} weight="bold" /> Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FIELDS.map((f) => (
            <div key={f.key} className="border-2 border-zinc-900 bg-white p-3" data-testid={`count-${f.key}`}>
              <div className="label-caps">{f.label}</div>
              <div className="mono text-2xl font-black">{counts[f.key] ?? 0}</div>
              <div className="text-[10px] text-zinc-500">baris</div>
            </div>
          ))}
        </div>

        <div className="border-2 border-zinc-900 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label-caps">Terakhir Sync</div>
              <div className="mono text-sm font-bold" data-testid="last-sync">
                {lastSync ? new Date(lastSync).toLocaleString("id-ID") : "Belum pernah"}
              </div>
            </div>
            <button
              data-testid="btn-sync-now"
              onClick={sync}
              disabled={syncing}
              className="flex items-center gap-2 border-2 border-zinc-900 bg-[#E11414] px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-brutal active:translate-y-[2px] disabled:opacity-50"
            >
              <ArrowsClockwise size={16} weight="bold" className={syncing ? "animate-spin" : ""} />
              {syncing ? "Menyinkronkan..." : "Sinkronisasi Sekarang"}
            </button>
          </div>
        </div>

        {/* URLs Form */}
        <div className="border-2 border-zinc-900 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database size={20} weight="bold" />
            <h2 className="text-lg font-black uppercase tracking-tight">URL Google Sheet (pubhtml)</h2>
          </div>
          <p className="mb-4 text-xs text-zinc-600">
            Publikasikan setiap sheet melalui <b>File → Share → Publish to web</b> lalu tempel URL <code className="mono">/pubhtml</code>-nya di bawah.
          </p>
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label-caps mb-1 flex items-center gap-2">
                  <span>{f.label}</span>
                  {cfg[f.key] ? (
                    <CheckCircle size={14} weight="fill" className="text-green-600" />
                  ) : null}
                </label>
                <div className="mb-1 text-[10px] text-zinc-500">Kolom: {f.desc}</div>
                <div className="flex items-center gap-2 border-2 border-zinc-900 bg-zinc-50 px-3">
                  <LinkIcon size={16} weight="bold" />
                  <input
                    data-testid={`input-${f.key}`}
                    value={cfg[f.key] || ""}
                    onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })}
                    placeholder="https://docs.google.com/.../pubhtml"
                    className="w-full bg-transparent py-2.5 text-xs outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            data-testid="btn-save-config"
            onClick={save}
            disabled={busy}
            className="mt-6 flex items-center gap-2 border-2 border-zinc-900 bg-zinc-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-brutal active:translate-y-[2px] disabled:opacity-50"
          >
            <FloppyDisk size={16} weight="bold" /> {busy ? "..." : "Simpan URL"}
          </button>
        </div>

        {/* Change password */}
        <div className="border-2 border-zinc-900 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Key size={20} weight="bold" />
            <h2 className="text-lg font-black uppercase tracking-tight">Ganti Password Admin</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              data-testid="input-current-password"
              type="password"
              placeholder="Password saat ini"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="border-2 border-zinc-900 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
            />
            <input
              data-testid="input-new-password"
              type="password"
              placeholder="Password baru"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              className="border-2 border-zinc-900 bg-zinc-50 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <button
            data-testid="btn-change-admin-password"
            onClick={updatePassword}
            className="mt-4 border-2 border-zinc-900 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest active:translate-y-[1px]"
          >
            Update Password
          </button>
        </div>
      </main>
    </div>
  );
}
