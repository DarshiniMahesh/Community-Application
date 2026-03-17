"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Lock, Mail, Phone, Eye, EyeOff, AlertCircle } from "lucide-react"
import { api, saveAuth } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loginType, setLoginType] = useState<"email" | "phone">("email")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ identifier: "", password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!formData.identifier) {
      newErrors.identifier = loginType === "email" ? "Email is required" : "Phone number is required"
    } else if (loginType === "email" && !formData.identifier.includes("@")) {
      newErrors.identifier = "Please enter a valid email address"
    } else if (loginType === "phone" && formData.identifier.length !== 10) {
      newErrors.identifier = "Please enter a valid 10-digit phone number"
    }
    if (!formData.password) newErrors.password = "Password is required"
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const data = await api.post("/auth/user/login", {
        contact: formData.identifier,
        password: formData.password,
      })
      saveAuth(data.token, data.role)
      router.push("/dashboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed"
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  const isRejected = errors.general?.toLowerCase().includes("rejected")

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Community Portal account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {errors.general && (
              <div className={`p-3 text-sm rounded-md flex items-start gap-2 ${
                isRejected
                  ? "text-red-800 bg-red-50 border border-red-200"
                  : "text-destructive bg-destructive/10"
              }`}>
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  {isRejected ? (
                    <>
                      <p className="font-medium">Application Rejected</p>
                      <p className="mt-0.5 text-red-700">
                        Your application has been rejected. You cannot access this portal. Please contact support.
                      </p>
                    </>
                  ) : (
                    <p>{errors.general}</p>
                  )}
                </div>
              </div>
            )}

            {/* Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button type="button" onClick={() => setLoginType("email")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${loginType === "email" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Mail className="h-4 w-4" /> Email
              </button>
              <button type="button" onClick={() => setLoginType("phone")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${loginType === "phone" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Phone className="h-4 w-4" /> Phone
              </button>
            </div>

            {/* Identifier */}
            <div className="space-y-2">
              <Label htmlFor="identifier">{loginType === "email" ? "Email Address" : "Phone Number"}</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {loginType === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </div>
                <Input id="identifier"
                  type={loginType === "email" ? "email" : "tel"}
                  placeholder={loginType === "email" ? "name@example.com" : "1234567890"}
                  value={formData.identifier}
                  onChange={(e) => { setFormData({ ...formData, identifier: e.target.value }); setErrors({ ...errors, identifier: "" }) }}
                  className={`pl-10 ${errors.identifier ? "border-destructive" : ""}`}
                />
              </div>
              {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: "" }) }}
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading || isRejected}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-primary hover:underline font-medium">Register here</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}