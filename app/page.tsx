import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Check if dev checklist is completed
  if (!process.env.SKIP_DEV_CHECKLIST) {
    redirect('/dev-checklist')
  } else {
    redirect('/app')
  }
}
