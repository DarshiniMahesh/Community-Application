"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Lock, Mail, Phone, Eye, EyeOff } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { api, saveAuth } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loginType, setLoginType] = useState<"email" | "phone">("email")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ identifier: "", password: "", confirmPassword: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const passwordStrength = (() => {
    let s = 0
    const p = formData.password
    if (p.length >= 8) s += 25
    if (p.match(/[a-z]/) && p.match(/[A-Z]/)) s += 25
    if (p.match(/[0-9]/)) s += 25
    if (p.match(/[^a-zA-Z0-9]/)) s += 25
    return s
  })()

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
    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password"
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const body = loginType === "email"
        ? { email: formData.identifier, password: formData.password }
        : { phone: formData.identifier, password: formData.password }

      const data = await api.post("/auth/user/register", body)
      saveAuth(data.token, data.role)
      router.push("/dashboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed"
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Register for Community Portal access</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {errors.general}
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
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: "" }) }}
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1">
                  <Progress value={passwordStrength} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Password strength: {passwordStrength < 50 ? "Weak" : passwordStrength < 75 ? "Medium" : "Strong"}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: "" }) }}
                  className={`pl-10 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">Sign in here</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}