import { TodosPageClient } from "./page-client"
import { db } from "@/lib/db"
import { todos } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { getStripePlan } from "@/app/api/stripe/plans"
import { stackServerApp } from "@/stack"
import { getTodos, getUserTodoMetrics } from "@/lib/actions"

export default async function TodosPage({ children }: { children: React.ReactNode }) {
	const user = await stackServerApp.getUser({ or: "redirect" })

	const [todos,  userMetrics] = await Promise.all([
		getTodos(),
		user ? getUserTodoMetrics(user.id) : Promise.resolve(null),
	])

	// Get the total created todos and todo limit from the user metrics
	const todoLimit = userMetrics && !("error" in userMetrics) ? userMetrics.todoLimit : 10

	return (
		<TodosPageClient
			todos={todos}
			todoLimit={todoLimit}
			userId={user.id}
			email={user.primaryEmail || ""}
			name={user.displayName}
		/>
	)
}
