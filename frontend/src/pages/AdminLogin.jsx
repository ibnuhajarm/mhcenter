import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ShieldStar, Lock, ArrowLeft } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.webp";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { loginAdmin } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin-login", { password });
      loginAdmin(data.token);
      toast.success("Admin login berhasil");
      nav("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#142043] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <Link
          to="/login"
          data-testid="link-back-login"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={16} weight="bold" /> Kembali ke Sales Login
        </Link>
        <img
          src={logo}
          alt="Mayora United Home"
          className="mb-5 h-16 w-auto rounded-full bg-white p-1"
          data-testid="admin-login-logo"
        />
        <div className="mb-6 inline-flex w-fit items-center gap-2 border-2 border-[#E11414] px-3 py-1">
          <ShieldStar size={14} weight="fill" className="text-[#E11414]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11414]">Panel Admin</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight">ADMIN ACCESS</h1>
        <p className="mt-2 text-sm text-zinc-400">Kelola sinkronisasi Google Sheet & konfigurasi sistem.</p>

        <form onSubmit={onSubmit} className="mt-8 border-2 border-zinc-700 bg-zinc-800 p-6" data-testid="admin-login-form">
          <label className="label-caps mb-2 block !text-zinc-400">Password Admin</label>
          <div className="mb-6 flex items-center gap-2 border-2 border-zinc-600 bg-zinc-900 px-3">
            <Lock size={20} weight="bold" className="text-zinc-400" />
            <input
              data-testid="input-admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full bg-transparent py-3 font-mono text-lg font-bold text-white outline-none"
              required
            />
          </div>
          <button
            data-testid="btn-admin-login"
            disabled={loading}
            className="w-full border-2 border-[#E11414] bg-[#E11414] py-4 text-sm font-black uppercase tracking-widest text-white transition-transform active:translate-y-[2px] disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk Panel Admin"}
          </button>
          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Default: admin123
          </p>
        </form>
      </div>
    </div>
  );
}
