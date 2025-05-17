"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStackApp } from "@stackframe/stack"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Use the exact error codes from the API
type ErrorType = "none" | "EMAIL_PASSWORD_MISMATCH" | "INVALID_TOTP_CODE" | "UNKNOWN_ERROR"

// Map error codes to their corresponding messages
const errorMessages: Record<ErrorType, string> = {
  none: "",
  EMAIL_PASSWORD_MISMATCH: "Invalid email or password",
  INVALID_TOTP_CODE: "Invalid two-factor authentication code",
  UNKNOWN_ERROR: "Failed to sign in. Please try again.",
}

// Define loading states
type LoadingState = null | "email" | "google" | "github"

// Helper function to extract error code from error name
function getErrorCodeFromName(name: string): string | null {
  const match = name.match(/KnownError<([A-Z_]+)>/)
  return match ? match[1] : null
}

export function LoginForm({
  className,
  onToggleForm,
  redirectUrl = "/",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  onToggleForm?: () => void
  redirectUrl?: string
}) {
  const app = useStackApp()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorType, setErrorType] = useState<ErrorType>("none")
  const [loadingState, setLoadingState] = useState<LoadingState>(null)

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingState("email")
    setErrorType("none")

    const result = await app.signInWithCredential({
      email,
      password,
    })

    console.log("Login result:", result)

    if (result.status === "error") {
      const error = result.error
      console.log("Login error details:", JSON.stringify(error, null, 2))

      // Extract error code from error name
      const errorCode = error.code || (error.name ? getErrorCodeFromName(error.name) : null)

      // Use the exact error code if it's one we know about
      if (errorCode === "EMAIL_PASSWORD_MISMATCH" || errorCode === "INVALID_TOTP_CODE") {
        setErrorType(errorCode as ErrorType)
      } else {
        setErrorType("UNKNOWN_ERROR")
      }

      setLoadingState(null)
    } else {
      router.push(redirectUrl)
    }
  }

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setLoadingState(provider)
    setErrorType("none")

    try {
      await app.signInWithOAuth(provider)
      // OAuth redirects automatically on success
    } catch (err: any) {
      console.error(`${provider} login error:`, err)
      setErrorType("UNKNOWN_ERROR")
      setLoadingState(null)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailPasswordLogin}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  disabled={loadingState !== null}
                  onClick={() => handleOAuthLogin("google")}
                >
                  {loadingState === "google" ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-current"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 mr-2">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      Login with Google
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  disabled={loadingState !== null}
                  onClick={() => handleOAuthLogin("github")}
                >
                  {loadingState === "github" ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-current"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 mr-2"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      Login with GitHub
                    </>
                  )}
                </Button>
              </div>
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>

              {errorType !== "none" && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessages[errorType]}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.preventDefault()
                        if (email) {
                          app.sendForgotPasswordEmail(email)
                          alert("Password reset email sent. Please check your inbox.")
                        } else {
                          alert("Please enter your email address first.")
                        }
                      }}
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loadingState !== null}>
                  {loadingState === "email" ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : (
                    "Login"
                  )}
                </Button>
              </div>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a
                  href="#"
                  className="underline underline-offset-4"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push("/sign-up")
                    if (onToggleForm) onToggleForm()
                  }}
                >
                  Sign up
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground">
        Built by{" "}
        <a
          href="https://x.com/jacobmparis"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          @jacobmparis
        </a>{" "}
        on v0
      </div>
    </div>
  )
}
