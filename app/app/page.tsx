import { redirect } from "next/navigation"

export default async function AppPage() {
	redirect("/app/todos")
}
