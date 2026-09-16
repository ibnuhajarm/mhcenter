import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fmtRp = (n) => {
  const v = Number(n || 0);
  return "Rp " + v.toLocaleString("id-ID", { maximumFractionDigits: 0 });
};
