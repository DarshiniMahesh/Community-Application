"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Shield } from "lucide-react";
import { toast } from "sonner";

function detectType(value: string): "email" | "phone" {
  if (/^\d+$/.test(value)) return "phone";
  return "email";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  const inputType = detectType(identifier);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your email or phone number");
      return;
    }

    if (inputType === "email" && !identifier.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (inputType === "phone" && identifier.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    sessionStorage.setItem("otp_contact", identifier);
    toast.success("OTP sent successfully");
    router.push("/signup/otp");
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "2.5rem 2rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={28} color="#ffffff" />
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#111111",
              letterSpacing: "-0.02em",
            }}
          >
            Admin Login
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280", textAlign: "center" }}>
            Secure access for authorised administrators only
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "0 2rem 2.5rem" }}>
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="identifier"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Email or Phone Number
              </label>

              <div style={{ position: "relative" }}>
                {/* Dynamic icon based on what user is typing */}
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: identifier ? "#f97316" : "#9ca3af",
                    display: "flex",
                    pointerEvents: "none",
                    transition: "color 0.15s",
                  }}
                >
                  {inputType === "phone" && identifier
                    ? <Phone size={15} />
                    : <Mail size={15} />}
                </span>

                <input
                  id="identifier"
                  type="text"
                  placeholder="name@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.65rem 0.75rem 0.65rem 2.25rem",
                    borderRadius: 8,
                    border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
                    fontSize: "0.9rem",
                    color: "#111111",
                    backgroundColor: "#f9fafb",
                    outline: "none",
                    transition: "border-color .15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = error ? "#ef4444" : "#e5e7eb")
                  }
                />

                {/* Auto-detected type pill — only shows when user has typed something */}
                {identifier.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "#fff7ed",
                      color: "#f97316",
                      border: "1px solid #fed7aa",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {inputType === "phone"
                      ? <><Phone size={10} /> Phone</>
                      : <><Mail size={10} /> Email</>}
                  </span>
                )}
              </div>

              {error && (
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#ef4444" }}>
                  {error}
                </p>
              )}

              {/* Helper hint */}
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                Enter your email address or 10-digit phone number
              </p>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#f97316",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color .15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ea6c0a")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f97316")
              }
            >
              Send OTP
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}