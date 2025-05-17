import { redirect } from "next/navigation"
import { stackServerApp } from "@/stack"
import { AccountPageClient } from "./page-client"
import { verifyContactChannel } from "../profile/actions"
import { getStripeCustomerId, getStripeCustomer } from "@/lib/stripe"
import { getStripePlan } from "@/app/api/stripe/plans"

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const user = await stackServerApp.getUser({ or: "redirect" })

  if (searchParams.code && !Array.isArray(searchParams.code)) {
    // Handle contact channel verification
    await verifyContactChannel({ code: searchParams.code })
    redirect("/app/settings/account")
  }

  const contactChannels = await user?.listContactChannels()

  // Get subscription data
  const customerId = await getStripeCustomerId(user.id)
  const subscription = customerId ? await getStripeCustomer(customerId) : null
  const plan = await getStripePlan(user.id)

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      <AccountPageClient
        contactChannels={
          contactChannels?.map((channel) => ({
            id: channel.id,
            value: channel.value,
            type: channel.type,
            isPrimary: channel.isPrimary,
            isVerified: channel.isVerified,
            usedForAuth: channel.usedForAuth,
          })) ?? []
        }
        subscription={subscription}
        plan={plan}
        userId={user.id}
        email={user.primaryEmail || ""}
        name={user.displayName}
      />
    </div>
  )
}
