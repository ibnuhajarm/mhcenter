import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Barcode, Lock, ArrowRight, ShieldStar } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.webp";

export default function LoginPage() {
  const [kode, setKode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { loginSales } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { kode_sales: kode.trim(), password });
      loginSales(data.token, data.sales);
      toast.success(`Selamat datang, ${data.sales.nama_sales}`);
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-50">
      <div
        className="absolute inset-0 opacity-[0.06] bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1772305336606-989a457ffbae?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHx3YXJlaG91c2UlMjBpbnRlcmlvciUyMGFic3RyYWN0fGVufDB8fHx8MTc4Nzk3ODIwNXww&ixlib=rb-4.1.0&q=85)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <div className="mb-8">
          <img
            src={logo}
            alt="Mayora United Home"
            className="mb-4 h-24 w-auto"
            data-testid="login-logo"
          />
          <div className="mb-3 inline-flex items-center gap-2 border-2 border-zinc-900 bg-white px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[#E11414]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Field Sales App</span>
          </div>
          <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            MAYORA<br />
            <span className="text-[#E11414]">UNITED HOME.</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-zinc-600">
            Masuk dengan kode sales dan password untuk mengelola stok & input penjualan harian.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-2 border-zinc-900 bg-white p-6 shadow-brutal"
          data-testid="login-form"
        >
          <label className="label-caps mb-2 block">Kode Sales</label>
          <div className="mb-4 flex items-center gap-2 border-2 border-zinc-900 bg-zinc-50 px-3">
            <Barcode size={20} weight="bold" />
            <input
              data-testid="input-kode-sales"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="cth: 277"
              className="w-full bg-transparent py-3 font-mono text-lg font-bold outline-none placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400"
              required
            />
          </div>
          <label className="label-caps mb-2 block">Password</label>
          <div className="mb-6 flex items-center gap-2 border-2 border-zinc-900 bg-zinc-50 px-3">
            <Lock size={20} weight="bold" />
            <input
              data-testid="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full bg-transparent py-3 font-mono text-lg font-bold outline-none placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400"
              required
            />
          </div>
          <button
            data-testid="btn-login"
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-2 border-2 border-zinc-900 bg-[#E11414] py-4 text-sm font-black uppercase tracking-widest text-white transition-transform active:translate-y-[2px] disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
            <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <Link
          to="/admin/login"
          data-testid="link-admin-login"
          className="mt-6 inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-900"
        >
          <ShieldStar size={16} weight="bold" /> Panel Admin
        </Link>
      </div>
    </div>
  );
}
