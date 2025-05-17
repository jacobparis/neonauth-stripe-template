import { redirect } from "next/navigation"
import { stackServerApp } from "@/stack"

export default async function HomePage() {
  // Check if user is logged in
  const user = await stackServerApp.getUser()

  // If logged in, redirect to app, otherwise to sign-in
  if (user) {
    redirect("/app")
  } else {
    redirect("/sign-in")
  }
}
