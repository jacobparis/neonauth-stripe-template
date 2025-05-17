"use server"

import { stackServerApp } from "@/stack"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(formData: FormData) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return { success: false, message: "Not authenticated" }
    }

    const displayName = formData.get("displayName") as string

    // Update the user profile
    await user.update({
      displayName,
    })

    revalidatePath("/settings/profile")
    return { success: true, message: "Profile updated successfully" }
  } catch (error) {
    console.error("Error updating profile:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update profile",
    }
  }
}
