ALTER TABLE "companies" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "country" text DEFAULT 'Türkiye';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "post_code" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone1" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone1_type" text DEFAULT 'cep';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone2" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone2_type" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone3" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone3_type" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email1" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email2" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "authorized_person" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "salutation" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "tckn" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "email1" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "email2" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "phone1" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "phone1_type" text DEFAULT 'cep';--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "phone2" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "phone2_type" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "phone3" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "phone3_type" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "country" text DEFAULT 'Türkiye';--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "post_code" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "legacy_proposal_no" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "proposal_date" timestamp;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "persons" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "persons" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_code_unique" UNIQUE("code");