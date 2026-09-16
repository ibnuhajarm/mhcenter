import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/Login";
import AdminLoginPage from "@/pages/AdminLogin";
import Dashboard from "@/pages/Dashboard";
import Penjualan from "@/pages/Penjualan";
import Loading from "@/pages/Loading";
import AdminPanel from "@/pages/AdminPanel";
import BottomNav from "@/components/BottomNav";
import BrandHeader from "@/components/BrandHeader";

function SalesGate({ children }) {
  const { sales } = useAuth();
  if (!sales) return <Navigate to="/login" replace />;
  return (
    <>
      <BrandHeader />
      <div className="pb-24">{children}</div>
      <BottomNav />
    </>
  );
}

function AdminGate({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#09090B",
                color: "#FFFFFF",
                border: "1px solid #27272A",
                fontFamily: "Manrope, sans-serif",
                fontWeight: 600,
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminGate><AdminPanel /></AdminGate>} />
            <Route path="/dashboard" element={<SalesGate><Dashboard /></SalesGate>} />
            <Route path="/penjualan" element={<SalesGate><Penjualan /></SalesGate>} />
            <Route path="/loading" element={<SalesGate><Loading /></SalesGate>} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
