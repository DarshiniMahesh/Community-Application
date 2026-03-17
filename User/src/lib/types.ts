export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  role: "user" | "sangha" | "admin";
}

export interface AuthResponse {
  token: string;
  role: string;
  user: User;
}

export interface ApiError {
  message: string;
}