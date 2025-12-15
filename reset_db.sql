-- WARNING: This script will delete all data in the tables and reset the schema.

-- Drop existing tables (order matters for foreign keys)
DROP TABLE IF EXISTS "proposal_items" CASCADE;
DROP TABLE IF EXISTS "documents" CASCADE;
DROP TABLE IF EXISTS "proposals" CASCADE;
DROP TABLE IF EXISTS "persons" CASCADE;
DROP TABLE IF EXISTS "companies" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS company_code_seq;
DROP SEQUENCE IF EXISTS person_code_seq;

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sequences for ID generation
CREATE SEQUENCE company_code_seq START 1;
CREATE SEQUENCE person_code_seq START 1;

-- Create users table
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "phone" text,
  "role" text DEFAULT 'representative',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create companies table
CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text UNIQUE DEFAULT ('O' || lpad(nextval('company_code_seq')::text, 5, '0')),
  "name" text NOT NULL,
  "type" text,
  "tax_no" text,
  "tax_office" text,
  "address" text,
  "city" text,
  "district" text,
  "country" text DEFAULT 'Türkiye',
  "post_code" text,
  "phone1" text,
  "phone1_type" text DEFAULT 'cep',
  "phone2" text,
  "phone2_type" text,
  "phone3" text,
  "phone3_type" text,
  "email1" text,
  "email2" text,
  "website" text,
  "notes" text,
  "authorized_person" text,
  "representative_id" uuid REFERENCES "users"("id"),
  "contact_info" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create persons table
CREATE TABLE "persons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text UNIQUE DEFAULT ('K' || lpad(nextval('person_code_seq')::text, 5, '0')),
  "company_id" uuid REFERENCES "companies"("id"),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "salutation" text,
  "tckn" text,
  "email1" text,
  "email2" text,
  "phone1" text,
  "phone1_type" text DEFAULT 'cep',
  "phone2" text,
  "phone2_type" text,
  "phone3" text,
  "phone3_type" text,
  "title" text,
  "address" text,
  "city" text,
  "district" text,
  "country" text DEFAULT 'Türkiye',
  "post_code" text,
  "notes" text,
  "representative_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create proposals table
CREATE TABLE "proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid REFERENCES "companies"("id"),
  "person_id" uuid REFERENCES "persons"("id"),
  "proposal_no" serial,
  "status" text NOT NULL,
  "total_amount" decimal(10, 2),
  "vat_rate" integer DEFAULT 20,
  "vat_amount" decimal(10, 2),
  "grand_total" decimal(10, 2),
  "currency" text,
  "ai_confidence" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create proposal_items table
CREATE TABLE "proposal_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "proposal_id" uuid NOT NULL REFERENCES "proposals"("id"),
  "description" text NOT NULL,
  "quantity" decimal(10, 2) NOT NULL,
  "unit" text,
  "unit_price" decimal(10, 2) NOT NULL,
  "total_price" decimal(10, 2) NOT NULL,
  "attributes" jsonb,
  "is_header" boolean DEFAULT false
);

-- Create documents table
CREATE TABLE "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "proposal_id" uuid REFERENCES "proposals"("id"),
  "company_id" uuid REFERENCES "companies"("id"),
  "person_id" uuid REFERENCES "persons"("id"),
  "owner_email" text,
  "type" text NOT NULL,
  "storage_path" text NOT NULL,
  "public_url" text NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create products table
CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "code" text,
  "description" text,
  "unit" text,
  "cost" decimal(10, 2),
  "default_price" decimal(10, 2),
  "currency" text DEFAULT 'EUR',
  "vat_rate" integer DEFAULT 20,
  "created_at" timestamp DEFAULT now() NOT NULL
);
