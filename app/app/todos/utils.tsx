import type { Todo } from "@/lib/schema"
import {
	isToday,
	isTomorrow,
	isYesterday,
	format,
	compareAsc,
	isPast,
	isSameDay,
	startOfDay,
} from "date-fns"

// Helper function to format date for display
export function formatDateForDisplay(date: Date | null): string {
	if (!date) return "No Due Date"

	if (isToday(date)) return "Today"
	if (isTomorrow(date)) return "Tomorrow"
	if (isYesterday(date)) return "Yesterday"

	return format(date, "EEEE, MMMM d, yyyy")
} // Group todos by due date
export function groupTodosByDueDate(
	todos: Todo[],
): { date: Date | null; label: string; todos: Todo[]; isPast: boolean }[] {
	// Sort todos by due date (null dates at the end)
	const sortedTodos = [...todos].sort((a, b) => {
		if (!a.dueDate && !b.dueDate) return 0
		if (!a.dueDate) return 1
		if (!b.dueDate) return -1
		return compareAsc(new Date(a.dueDate), new Date(b.dueDate))
	})

	const groups: {
		date: Date | null
		label: string
		todos: Todo[]
		isPast: boolean
	}[] = []

	// Create a map to track which dates we have groups for
	const dateMap = new Map<string, boolean>()

	// Process todos with due dates
	const withDueDate = sortedTodos.filter((todo) => todo.dueDate)

	// Group by date
	withDueDate.forEach((todo) => {
		const todoDate = todo.dueDate ? new Date(todo.dueDate) : null

		if (!todoDate) return

		// Format date as string for map key
		const dateKey = todoDate.toDateString()
		dateMap.set(dateKey, true)

		// Find existing group or create new one
		const existingGroup = groups.find(
			(group) => group.date && todoDate && isSameDay(group.date, todoDate),
		)

		const isPastDue = isPast(todoDate) && !isToday(todoDate)

		if (existingGroup) {
			existingGroup.todos.push(todo)
		} else {
			groups.push({
				date: todoDate,
				label: formatDateForDisplay(todoDate),
				todos: [todo],
				isPast: isPastDue,
			})
		}
	})

	// Add todos with no due date to the Today group
	const withoutDueDate = sortedTodos.filter((todo) => !todo.dueDate)

	// Always ensure we have a "Today" group
	const today = startOfDay(new Date())
	const todayKey = today.toDateString()

	// Find or create the Today group
	let todayGroup = groups.find((group) => group.date && isSameDay(group.date, today))
	if (!todayGroup) {
		todayGroup = {
			date: today,
			label: "Today",
			todos: [],
			isPast: false,
		}
		// Find the right position to insert the Today group
		const todayIndex = groups.findIndex((group) => group.date && compareAsc(group.date, today) > 0)
		if (todayIndex === -1) {
			groups.push(todayGroup)
		} else {
			groups.splice(todayIndex, 0, todayGroup)
		}
	}

	// Add todos without due date to the Today group
	todayGroup.todos.push(...withoutDueDate)

	return groups
}
