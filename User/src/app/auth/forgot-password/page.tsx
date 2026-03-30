"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Users, Mail, Lock, CheckCircle2, ArrowLeft, Eye, EyeOff, ShieldCheck, KeyRound,
} from "lucide-react"
import { api } from "@/lib/api"

type Step = "email" | "otp" | "reset" | "success"

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  const steps = ["Email", "Verify OTP", "New Password"]
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : active
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : idx}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 rounded-full mb-4 transition-all ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Password strength ─────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Uppercase letter",       ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter",       ok: /[a-z]/.test(password) },
    { label: "Number",                 ok: /\d/.test(password) },
  ]
  const passed = checks.filter(c => c.ok).length
  const strength = passed <= 1 ? "Weak" : passed <= 2 ? "Fair" : passed <= 3 ? "Good" : "Strong"
  const color = passed <= 1 ? "bg-destructive" : passed <= 2 ? "bg-yellow-500" : passed <= 3 ? "bg-blue-500" : "bg-green-500"

  if (!password) return null

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={`font-semibold ${passed === 4 ? "text-green-600" : passed >= 3 ? "text-blue-600" : passed >= 2 ? "text-yellow-600" : "text-destructive"}`}>
          {strength}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= passed ? color : "bg-muted"}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1 text-[11px] ${c.ok ? "text-green-600" : "text-muted-foreground"}`}>
            <CheckCircle2 className={`h-3 w-3 ${c.ok ? "text-green-500" : "text-muted-foreground/40"}`} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep]                     = useState<Step>("email")
  const [email, setEmail]                   = useState("")
  const [otpValue, setOtpValue]             = useState("")
  const [resetToken, setResetToken]         = useState("")
  const [newPassword, setNewPassword]       = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew]               = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState("")
  const [resendTimer, setResendTimer]       = useState(0)

  const startTimer = () => {
    setResendTimer(30)
    const t = setInterval(() => {
      setResendTimer(prev => { if (prev <= 1) { clearInterval(t); return 0 } return prev - 1 })
    }, 1000)
  }

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email) { setError("Email is required"); return }
    setLoading(true); setError("")
    try {
      await api.post("/auth/send-otp", { contact: email, role: "user" })
      setStep("otp")
      startTimer()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return
    setLoading(true); setError("")
    try {
      const data = await api.post("/auth/verify-otp", { contact: email, otp: otpValue, role: "user" })
      setResetToken(data.resetToken)
      setStep("reset")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return }
    setLoading(true); setError("")
    try {
      await api.post("/auth/reset-password", { resetToken, newPassword })
      setStep("success")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const stepNumber = step === "email" ? 1 : step === "otp" ? 2 : step === "reset" ? 3 : 4

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-10">
      <div className="w-full max-w-md space-y-4">

        {/* Brand header */}
        <div className="text-center mb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg shadow-primary/20">
            <Users className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sangha Registration</h1>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="space-y-2 text-center pb-4">
            {/* Step title + icon */}
            <div className="flex items-center justify-center gap-2">
              {step === "email"   && <Mail      className="h-5 w-5 text-primary" />}
              {step === "otp"     && <ShieldCheck className="h-5 w-5 text-primary" />}
              {step === "reset"   && <KeyRound  className="h-5 w-5 text-primary" />}
              {step === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              <CardTitle className="text-xl">
                {step === "email"   && "Forgot Password"}
                {step === "otp"     && "Verify OTP"}
                {step === "reset"   && "Create New Password"}
                {step === "success" && "Password Reset!"}
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              {step === "email"   && "Enter your registered email to receive a 6-digit OTP"}
              {step === "otp"     && <>A 6-digit code was sent to <span className="font-medium text-foreground">{email}</span></>}
              {step === "reset"   && "Set a new password for your account"}
              {step === "success" && "Your password has been updated successfully"}
            </CardDescription>

            {/* Step dots (only for active steps) */}
            {step !== "success" && <StepDots current={stepNumber} />}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── Error banner ── */}
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">⚠</span>
                {error}
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 1: Email
            ══════════════════════════════════════ */}
            {step === "email" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email" type="email" placeholder="name@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError("") }}
                      className="pl-10 h-11"
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send OTP →"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════
                STEP 2: OTP
            ══════════════════════════════════════ */}
            {step === "otp" && (
              <div className="space-y-5">
                {/* Back to email */}
                <button
                  onClick={() => { setStep("email"); setOtpValue(""); setError("") }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Change email
                </button>

                {/* OTP input */}
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Enter the 6-digit code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6} value={otpValue}
                      onChange={v => { setOtpValue(v); setError("") }}
                    >
                      <InputOTPGroup className="gap-2">
                        {[0,1,2,3,4,5].map(i => (
                          <InputOTPSlot
                            key={i} index={i}
                            className="h-12 w-12 text-lg font-bold rounded-xl border-2 text-center"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {/* Resend */}
                <div className="text-center text-sm text-muted-foreground">
                  {resendTimer > 0 ? (
                    <span>Resend OTP in <span className="font-semibold text-foreground">{resendTimer}s</span></span>
                  ) : (
                    <button
                      onClick={() => handleSendOtp()}
                      className="text-primary hover:underline font-medium"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpValue.length !== 6 || loading}
                  className="w-full h-11 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {loading ? "Verifying..." : "Verify & Continue →"}
                </Button>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 3: Create New Password
            ══════════════════════════════════════ */}
            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError("") }}
                      className="pl-10 pr-10 h-11"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  <PasswordStrength password={newPassword} />
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Re-enter New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError("") }}
                      className={`pl-10 pr-10 h-11 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? "border-destructive focus-visible:ring-destructive"
                          : confirmPassword && confirmPassword === newPassword
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Match indicator */}
                  {confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${confirmPassword === newPassword ? "text-green-600" : "text-destructive"}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      {confirmPassword === newPassword ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}

            {/* ══════════════════════════════════════
                STEP 4: Success
            ══════════════════════════════════════ */}
            {step === "success" && (
              <div className="space-y-5 text-center">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-9 w-9 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">All done!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your password has been reset successfully. You can now log in with your new password.
                    </p>
                  </div>
                </div>
                <Button onClick={() => router.push("/auth/login")} className="w-full h-11 font-semibold">
                  Go to Login →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="/contact" className="text-primary hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  )
}