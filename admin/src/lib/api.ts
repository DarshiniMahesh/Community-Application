const BASE_URL = 'http://localhost:8000';

const getHeaders = () => {
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_token')
    : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  },

  post: async (path: string, body: object) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  },

  put: async (path: string, body: object) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  },

  delete: async (path: string) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  },
};

export const clearAdminAuth = () => {
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_email');
};

export const getAdminToken = () =>
  typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;

export default BASE_URL;