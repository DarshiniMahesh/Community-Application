import { API_BASE } from "./constants";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = {
  post: async (path: string, body: object): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
  get: async (path: string): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: getHeaders(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  },
};

export const saveAuth = (token: string, role: string) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

export const getToken = () => localStorage.getItem("token");