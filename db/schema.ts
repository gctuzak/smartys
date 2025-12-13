import { pgTable, uuid, text, jsonb, timestamp, decimal, integer, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  taxNo: text("tax_no"),
  taxOffice: text("tax_office"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  contactInfo: jsonb("contact_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const persons = pgTable("persons", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const proposals = pgTable("proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  personId: uuid("person_id").references(() => persons.id),
  proposalNo: serial("proposal_no"),
  status: text("status").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  vatRate: integer("vat_rate").default(20),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }),
  currency: text("currency"),
  aiConfidence: integer("ai_confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const proposalItems = pgTable("proposal_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  attributes: jsonb("attributes"),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  companyId: uuid("company_id").references(() => companies.id),
  personId: uuid("person_id").references(() => persons.id),
  ownerEmail: text("owner_email"),
  type: text("type").notNull(),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  proposals: many(proposals),
  persons: many(persons),
  documents: many(documents),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  company: one(companies, {
    fields: [persons.companyId],
    references: [companies.id],
  }),
  proposals: many(proposals),
  documents: many(documents),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  company: one(companies, {
    fields: [proposals.companyId],
    references: [companies.id],
  }),
  person: one(persons, {
    fields: [proposals.personId],
    references: [persons.id],
  }),
  items: many(proposalItems),
  documents: many(documents),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalItems.proposalId],
    references: [proposals.id],
  }),
}));

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  unit: text("unit"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("EUR"),
  vatRate: integer("vat_rate").default(20),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
