ALTER TABLE "todos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "view todos" ON "todos" CASCADE;--> statement-breakpoint
DROP POLICY "update todos" ON "todos" CASCADE;--> statement-breakpoint
DROP POLICY "delete todos" ON "todos" CASCADE;
