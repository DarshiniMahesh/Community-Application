import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("jm_token");
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/set-password")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
