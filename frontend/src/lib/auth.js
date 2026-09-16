import { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [sales, setSales] = useState(() => {
    try {
      const s = localStorage.getItem("sales");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem("admin_token"));

  const loginSales = (token, salesInfo) => {
    localStorage.setItem("token", token);
    localStorage.setItem("sales", JSON.stringify(salesInfo));
    setSales(salesInfo);
  };
  const loginAdmin = (token) => {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("token", token);
    setIsAdmin(true);
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("sales");
    setSales(null);
    setIsAdmin(false);
  };

  useEffect(() => {
    // sync token for admin vs sales when route changes
  }, []);

  return (
    <AuthCtx.Provider value={{ sales, isAdmin, loginSales, loginAdmin, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
