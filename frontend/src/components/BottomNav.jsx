import { NavLink, useNavigate } from "react-router-dom";
import { House, Receipt, Truck, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: House, testid: "nav-dashboard" },
  { to: "/penjualan", label: "Penjualan", icon: Receipt, testid: "nav-penjualan" },
  { to: "/loading", label: "Loading", icon: Truck, testid: "nav-loading" },
];

export default function BottomNav() {
  const nav = useNavigate();
  const { logout } = useAuth();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-zinc-900 bg-white"
      data-testid="bottom-nav"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ to, label, icon: Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={testid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                isActive ? "bg-[#E11414] text-white" : "text-zinc-900 hover:bg-zinc-100"
              }`
            }
          >
            <Icon size={22} weight="bold" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
          </NavLink>
        ))}
        <button
          data-testid="nav-logout"
          onClick={() => {
            logout();
            nav("/login");
          }}
          className="flex flex-col items-center justify-center gap-1 py-3 text-zinc-900 hover:bg-zinc-100 active:translate-y-[1px]"
        >
          <SignOut size={22} weight="bold" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Keluar</span>
        </button>
      </div>
    </nav>
  );
}
