CREATE TYPE "public"."audit_step" AS ENUM('classification', 'extraction', 'communication', 'escalation');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('PENDING', 'RECEIVED', 'PROCESSING', 'VALIDATED', 'FOLLOW_UP_REQUIRED', 'NEEDS_HUMAN_REVIEW', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('QUEUED', 'RUNNING', 'FAILED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrower_id" text NOT NULL,
	"legal_entity" text NOT NULL,
	"doc_type" text NOT NULL,
	"expected_period_end" date NOT NULL,
	"status" "requirement_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"source" text DEFAULT 'upload' NOT NULL,
	"attachment_name" text NOT NULL,
	"attachment_url" text,
	"extracted_text" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"reply_id" uuid NOT NULL,
	"status" "run_status" DEFAULT 'QUEUED' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step" "audit_step" NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"reasoning" text NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"latency_ms" numeric(12, 0),
	"artifact_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_reply_id_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "replies_requirement_idx" ON "replies" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "agent_runs_requirement_idx" ON "agent_runs" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "audit_logs_run_idx" ON "audit_logs" USING btree ("run_id");