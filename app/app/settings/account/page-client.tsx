"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Mail, Shield, Eye, EyeOff, TrashIcon, Loader2 } from "lucide-react"
import { startTransition, useOptimistic, useRef, useState } from "react"
import { useUser } from "@stackframe/stack"
import {
  updatePassword,
  deleteAccount,
  addContactChannel,
  deleteContactChannel,
  makePrimaryContactChannel,
  sendVerificationEmail,
} from "../profile/actions"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { SubscriptionCard } from "@/app/components/subscription-card"

interface ContactChannel {
  id: string
  value: string
  type: string
  isPrimary: boolean
  isVerified: boolean
  usedForAuth: boolean
}

interface AccountPageClientProps {
  contactChannels: ContactChannel[]
  subscription?: {
    subscriptionId: string
    status: string
    priceId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    cancelAtPeriodEnd: boolean
    paymentMethod: {
      brand: string | null
      last4: string | null
    } | null
  } | null
  plan: {
    id: string
    todoLimit: number
    todoDaysBehind: number | typeof Number.POSITIVE_INFINITY
    todoDaysAhead: number | typeof Number.POSITIVE_INFINITY
  }
  userId: string
  email: string
  name?: string | null
}

export function AccountPageClient({
  contactChannels: serverContactChannels,
  subscription,
  plan,
  userId,
  email,
  name,
}: AccountPageClientProps) {
  const user = useUser({ or: "redirect" })
  const formRef = useRef<HTMLFormElement>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [pendingVerificationId, setPendingVerificationId] = useState<string | null>(null)
  const [verificationErrors, setVerificationErrors] = useState<Record<string, string>>({})

  const [contactChannels, sendChannelEvent] = useOptimistic(
    serverContactChannels,
    (
      current,
      event:
        | { type: "addEmail"; email: string }
        | { type: "removeEmail"; id: string }
        | { type: "makePrimary"; id: string },
    ) => {
      switch (event.type) {
        case "addEmail":
          return [
            ...current,
            {
              id: crypto.randomUUID(),
              value: event.email,
              type: "email",
              isPrimary: false,
              isVerified: false,
              usedForAuth: false,
            },
          ]
        case "removeEmail":
          return current.filter((channel) => channel.id !== event.id)
        case "makePrimary":
          return current.map((channel) => {
            return {
              ...channel,
              isPrimary: channel.id === event.id,
              usedForAuth: channel.id === event.id,
            }
          })
      }
    },
  )

  return (
    <div>
      {/* Subscription Card */}
      <div className="mb-8">
        <SubscriptionCard userId={userId} email={email} name={name} plan={plan} subscription={subscription} />
      </div>

      <Separator className="my-8 opacity-30" />

      {/* Email Settings */}
      <div>
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Addresses
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage the email addresses associated with your account.</p>

        <div className="mt-4 space-y-4 max-w-md">
          {contactChannels.map((channel) => (
            <div key={channel.id} className="p-3 rounded-md bg-secondary/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{channel.value}</span>
                  {channel.isPrimary && <Badge variant="secondary">Primary</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {channel.isVerified ? (
                    channel.isPrimary ? (
                      !channel.usedForAuth && user.hasPassword ? (
                        <form
                          action={async (formData) => {
                            sendChannelEvent({ type: "makePrimary", id: channel.id })
                            await makePrimaryContactChannel(formData)
                          }}
                        >
                          <input type="hidden" name="id" value={channel.id} />
                          <Button type="submit" variant="outline" size="sm" className="h-8 bg-secondary/80">
                            Use for Auth
                          </Button>
                        </form>
                      ) : (
                        <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800/30">
                          Verified
                        </Badge>
                      )
                    ) : (
                      <form
                        action={async (formData) => {
                          sendChannelEvent({ type: "makePrimary", id: channel.id })
                          await makePrimaryContactChannel(formData)
                        }}
                      >
                        <input type="hidden" name="id" value={channel.id} />
                        <Button type="submit" variant="outline" size="sm" className="h-8 bg-secondary/80">
                          Make Primary
                        </Button>
                      </form>
                    )
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        setPendingVerificationId(channel.id)
                        setVerificationErrors((prev) => ({ ...prev, [channel.id]: "" }))
                        startTransition(async () => {
                          try {
                            await sendVerificationEmail(formData)
                          } catch (error) {
                            setPendingVerificationId(null)
                            setVerificationErrors((prev) => ({
                              ...prev,
                              [channel.id]:
                                error instanceof Error ? error.message : "Failed to send verification email",
                            }))
                          }
                        })
                      }}
                    >
                      <input type="hidden" name="id" value={channel.id} />
                      {pendingVerificationId === channel.id ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-900/20 text-blue-400 border-blue-800/30 flex items-center gap-1"
                        >
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                          Check email
                        </Badge>
                      ) : verificationErrors[channel.id] ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs bg-red-900/20 text-red-400 border-red-800/30 hover:bg-red-900/30 hover:text-red-300"
                          >
                            Try again
                          </Button>
                          <p className="text-xs text-red-400">{verificationErrors[channel.id]}</p>
                        </div>
                      ) : (
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs bg-secondary/80 text-foreground border-border hover:bg-secondary hover:text-foreground flex items-center gap-1.5"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current"
                          >
                            <path
                              d="M22 8.62V16.5C22 17.33 21.33 18 20.5 18H3.5C2.67 18 2 17.33 2 16.5V8.62M22 8.62C21.94 8.3 21.81 8.01 21.62 7.77L13.28 2.35C12.54 1.8 11.46 1.8 10.72 2.35L2.38 7.77C2.19 8.01 2.06 8.3 2 8.62M22 8.62V8.63C22 8.63 22 8.62 22 8.62ZM12 11V15M16 11V15M8 11V15"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Verify
                        </Button>
                      )}
                    </form>
                  )}
                  {!channel.isPrimary && (
                    <form
                      action={async (formData) => {
                        sendChannelEvent({ type: "removeEmail", id: channel.id })
                        await deleteContactChannel(formData)
                      }}
                    >
                      <input type="hidden" name="id" value={channel.id} />
                      <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}

          <form
            ref={formRef}
            action={async (formData) => {
              sendChannelEvent({ type: "addEmail", email: formData.get("email") as string })
              formRef.current?.reset()
              await addContactChannel(formData)
            }}
            className="space-y-4"
          >
            <div className="flex gap-2">
              <Input
                name="email"
                type="email"
                placeholder="Add another email address"
                className="dark:bg-secondary/50 dark:border-border/50 focus:dark:bg-secondary/80"
              />
              <Button type="submit">Add</Button>
            </div>
          </form>
        </div>
      </div>

      <Separator className="my-8 opacity-30" />

      {/* Password Settings */}
      <div>
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Password
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Update your password to keep your account secure.</p>

        <div className="mt-6 space-y-4 max-w-md">
          <form
            action={async (formData) => {
              setIsUpdatingPassword(true)
              setPasswordError(null)
              setPasswordSuccess(null)

              try {
                const result = await updatePassword(formData)
                if (result.success) {
                  setPasswordSuccess("Password updated successfully")
                  // Reset form fields
                  const form = document.getElementById("password-form") as HTMLFormElement
                  if (form) form.reset()
                } else {
                  setPasswordError(result.error)
                }
              } catch (error) {
                setPasswordError(error instanceof Error ? error.message : "An unexpected error occurred")
              } finally {
                setIsUpdatingPassword(false)
              }
            }}
            className="p-4 rounded-md bg-secondary/50"
            id="password-form"
          >
            <div className="grid gap-4">
              {user.hasPassword ? (
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      onFocus={() => {
                        setPasswordError(null)
                        setPasswordSuccess(null)
                      }}
                      disabled={isUpdatingPassword}
                      className="dark:bg-background/70 dark:border-border/50 focus:dark:bg-background/90"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={isUpdatingPassword}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">{showCurrentPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    onFocus={() => {
                      setPasswordError(null)
                      setPasswordSuccess(null)
                    }}
                    disabled={isUpdatingPassword}
                    className="dark:bg-background/70 dark:border-border/50 focus:dark:bg-background/90"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isUpdatingPassword}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">{showNewPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3">
              {passwordError && (
                <div id="password-error" aria-live="polite" className="text-sm text-red-400 mb-3">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div id="password-success" aria-live="polite" className="text-sm text-green-400 mb-3">
                  {passwordSuccess}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : user.hasPassword ? (
                    "Update Password"
                  ) : (
                    "Set Password"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Separator className="my-8 opacity-30" />

      {/* Danger Zone - Simplified */}
      <div className="mt-8 max-w-md p-4 rounded-md border border-destructive/20 bg-destructive/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Delete Account
            </h3>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all data.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent"
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark:bg-card dark:border-border/50">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                {deleteError ? (
                  <AlertDialogDescription className="text-destructive">{deleteError}</AlertDialogDescription>
                ) : (
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data
                    from our servers.
                  </AlertDialogDescription>
                )}
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="dark:bg-secondary/80 dark:hover:bg-secondary">Cancel</AlertDialogCancel>
                <form
                  action={async () => {
                    const result = await deleteAccount()
                    if (!result.success) {
                      setDeleteError(result.error)
                    }
                  }}
                >
                  <Button type="submit" variant="destructive">
                    Delete
                  </Button>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
