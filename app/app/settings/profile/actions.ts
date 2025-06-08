"use server"

import { stackServerApp } from "@/stack"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updatePassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string

  if (!newPassword?.trim()) {
    return { success: false as const, error: "New password is required" }
  }

  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return { success: false as const, error: "Not authenticated" }
    }

    // If the user has a password, require the current password
    if (user.hasPassword && !currentPassword?.trim()) {
      return { success: false as const, error: "Current password is required" }
    }

    // Use the Stack SDK to update the password
    if (user.hasPassword) {
      await user.updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      })
    } else {
      // For users without a password (e.g., OAuth users)
      await user.setPassword({
        password: newPassword,
      })
    }

    revalidatePath("/app/settings/profile")
    return { success: true as const, message: "Password updated successfully" }
  } catch (error) {
    console.error("Error updating password:", error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update password",
    }
  }
}

export async function deleteAccount() {
  const user = await stackServerApp.getUser()
  if (!user) {
    return { success: false as const, error: "Not authenticated" }
  }

  await user.delete()
  redirect("/handler/sign-out")
}

export async function addContactChannel(formData: FormData) {
  const email = formData.get("email") as string
  if (!email) return

  const user = await stackServerApp.getUser()
  if (!user) return

  await user.createContactChannel({ type: "email", value: email, usedForAuth: false })

  void revalidatePath("/app/settings/account")
}

export async function deleteContactChannel(formData: FormData) {
  const id = formData.get("id") as string
  if (!id) {
    throw new Error("No id found")
  }

  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("No user found")
  }

  // Use the Stack SDK to delete the contact channel
  const channels = await user.listContactChannels()
  const channel = channels.find((c) => c.id === id)

  if (channel) {
    await channel.delete()
  }

  void revalidatePath("/app/settings/account")
}

export async function makePrimaryContactChannel(formData: FormData) {
  const id = formData.get("id") as string
  if (!id) {
    throw new Error("No id found")
  }

  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("No user found")
  }

  // Use the Stack SDK to update the contact channel
  const channels = await user.listContactChannels()
  const channel = channels.find((c) => c.id === id)

  if (channel) {
    await channel.update({ isPrimary: true, usedForAuth: true })
  }

  void revalidatePath("/app/settings/account")
}

export async function sendVerificationEmail(formData: FormData) {
  const id = formData.get("id") as string
  if (!id) {
    throw new Error("No id found")
  }

  const user = await stackServerApp.getUser()
  if (!user) {
    throw new Error("No user found")
  }

  try {
    // Use the Stack SDK to send verification email
    const channels = await user.listContactChannels()
    const channel = channels.find((c) => c.id === id)

    if (channel) {
      const callbackUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"}/app/settings/account-verify`
      // @ts-expect-error - StackAuth types are not up to date, this supports a callbackUrl
      await channel.sendVerificationEmail({ callbackUrl })
    }

    void revalidatePath("/app/settings/account")
    return { success: true }
  } catch (error) {
    console.error("Error sending verification email:", error)
    throw error
  }
}

export async function verifyContactChannel({ code }: { code: string }) {
  try {
    // Use the Stack SDK to verify the contact channel
    await stackServerApp.verifyEmail(code)
  } catch (error) {
    // If the verification link has already been used, just continue
    if (error instanceof Error && error.message.includes("already been used")) {
      return
    }
    throw error
  }
}
