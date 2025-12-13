CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"unit" text,
	"cost" numeric(10, 2),
	"default_price" numeric(10, 2),
	"currency" text DEFAULT 'EUR',
	"vat_rate" integer DEFAULT 20,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" RENAME TO "companies";--> statement-breakpoint
ALTER TABLE "proposals" RENAME COLUMN "customer_id" TO "company_id";--> statement-breakpoint
ALTER TABLE "proposals" DROP CONSTRAINT "proposals_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_no" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_office" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "proposal_no" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;