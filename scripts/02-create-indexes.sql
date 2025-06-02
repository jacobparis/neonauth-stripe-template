-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_comments_todo_id ON comments(todo_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
