ALTER TABLE "proposals" ADD COLUMN "revision" integer DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN "root_proposal_id" uuid REFERENCES "proposals"("id");
