import { TodosPageClient } from "@/app/app/todos/page-client"
import { getTodos, getUserTodoMetrics } from "@/lib/actions"
import { stackServerApp } from "@/stack"

export default async function AppPage() {
	const user = await stackServerApp.getUser()

	const [todos,  userMetrics] = await Promise.all([
		getTodos(),
		user ? getUserTodoMetrics(user.id) : Promise.resolve(null),
	])

	// Get the total created todos and todo limit from the user metrics
	const todoLimit = userMetrics && !("error" in userMetrics) ? userMetrics.todoLimit : 10

	return <TodosPageClient todos={todos} todoLimit={todoLimit} />
}
