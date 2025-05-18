"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, PaintbrushIcon as PaintBrush } from "lucide-react"
import { useState } from "react"
import { useUser } from "@stackframe/stack"
import Image from "next/image"
import { ImageInput } from "@/components/image-input"
import { ThemeSelect } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"

export function ProfilePageClient() {
  const user = useUser({ or: "redirect" })
  const [profileError, setProfileError] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(
    user.profileImageUrl,
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      {/* Profile Settings */}
      <section className="relative flex items-center gap-4">
        <div>
          <label className="cursor-pointer">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-muted flex items-center justify-center">
              {profileImage ? (
                <Image
                  src={profileImage || "/placeholder.svg"}
                  alt={user.displayName || "User avatar"}
                  className="object-cover"
                  fill
                />
              ) : (
                <Users className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <ImageInput
              className="hidden"
              maxBytes={100_000}
              onChange={(dataUrl) => {
                setProfileError("")
                setProfileImage(dataUrl) // Update local state immediately
                user.update({ profileImageUrl: dataUrl }) // Still update on the server
              }}
              onError={(error) => setProfileError(error)}
            />
          </label>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()

            const form = event.target as HTMLFormElement
            const displayName = form.displayName?.value
            if (!displayName) {
              // Backend supports users without display names, can choose to block them here
              setProfileError("Display name is required")
              return
            }

            user.update({ displayName })
          }}
        >
          <div className="flex gap-2 items-end">
            <div className="grow">
              <Label htmlFor="displayName" className="text-sm">
                Display Name
              </Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={user.displayName || ""}
                placeholder="Enter your name"
                className="mt-1"
                onBlur={() => setProfileError("")}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save</Button>
            </div>
          </div>
          <div className="mt-1">
            <p className="text-sm text-destructive min-h-[20px]">
              {profileError}
            </p>
          </div>
        </form>
      </section>

      <Separator className="my-8" />

      {/* Appearance Settings */}
      <div>
        <Label className="text-sm mb-3 block">Theme Preference</Label>
        <ThemeSelect />
      </div>
    </div>
  )
}
