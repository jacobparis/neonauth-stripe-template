import { TodosPageClient } from "./page-client"
import { db } from "@/lib/db"
import { todos } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { getStripePlan } from "@/app/api/stripe/plans"
import { stackServerApp } from "@/stack"

export default async function TodosPage() {
	const user = await stackServerApp.getUser({ or: "redirect" })
	const plan = await getStripePlan(user.id)

	const allTodos = await db.select().from(todos).orderBy(desc(todos.createdAt))

	return (
		<TodosPageClient
			todos={allTodos}
			todoLimit={plan.todoLimit}
			userId={user.id}
			email={user.primaryEmail || ""}
			name={user.displayName}
		/>
	)
}
