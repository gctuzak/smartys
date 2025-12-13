ALTER TABLE "proposals" ADD COLUMN "vat_rate" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "vat_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "grand_total" numeric(10, 2);