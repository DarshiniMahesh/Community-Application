import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import OtpVerify from "./pages/OtpVerify.jsx";
import SetPassword from "./pages/SetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-otp" element={<OtpVerify />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
