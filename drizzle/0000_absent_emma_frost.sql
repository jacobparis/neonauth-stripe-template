CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" timestamp,
	"project_id" integer,
	"assigned_to_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"todos_created" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_metrics_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users_sync" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"image" varchar(1024),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE POLICY "view todos" ON "todos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.user_id() = assigned_to_id);--> statement-breakpoint
CREATE POLICY "update todos" ON "todos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.user_id() = assigned_to_id);--> statement-breakpoint
CREATE POLICY "delete todos" ON "todos" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.user_id() = assigned_to_id);