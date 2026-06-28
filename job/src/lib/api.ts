import { API_BASE } from "./constants";

const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("company_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = {
  get: async (path: string): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
  post: async (path: string, body: object): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST", headers: getHeaders(), body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
  put: async (path: string, body: object): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT", headers: getHeaders(), body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
  patch: async (path: string, body: object): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH", headers: getHeaders(), body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
  delete: async (path: string): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
};

export const saveCompanyAuth = (token: string) => {
  localStorage.setItem("company_token", token);
};

export const clearCompanyAuth = () => {
  localStorage.removeItem("company_token");
  localStorage.removeItem("company_profile_complete");
};

export const getCompanyToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("company_token") : null;

export const isCompanyLoggedIn = () => !!getCompanyToken();