import { pgTable, uuid, text, jsonb, timestamp, decimal, integer, serial, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").default("representative"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").unique(), // O ile başlayan ID
  name: text("name").notNull(),
  type: text("type"), // New: Kişi/Kurum Türü
  taxNo: text("tax_no"),
  taxOffice: text("tax_office"),
  address: text("address"),
  city: text("city"), // New: İl
  district: text("district"), // New: İlçe/Bölge
  country: text("country").default("Türkiye"), // New: Ülke
  postCode: text("post_code"), // New: Posta Kodu
  phone1: text("phone1"),
  phone1Type: text("phone1_type").default("cep"),
  phone2: text("phone2"),
  phone2Type: text("phone2_type"),
  phone3: text("phone3"),
  phone3Type: text("phone3_type"),
  email1: text("email1"),
  email2: text("email2"),
  website: text("website"),
  notes: text("notes"), // New: Notlar
  authorizedPerson: text("authorized_person"), // New: Yetkili
  representativeId: uuid("representative_id").references(() => users.id),
  contactInfo: jsonb("contact_info"), // Keeping for legacy/extra data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const persons = pgTable("persons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").unique(), // K ile başlayan ID
  companyId: uuid("company_id").references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  salutation: text("salutation"), // New: Hitap
  tckn: text("tckn"), // New: TC Kimlik No
  email1: text("email1"),
  email2: text("email2"),
  phone1: text("phone1"),
  phone1Type: text("phone1_type").default("cep"),
  phone2: text("phone2"),
  phone2Type: text("phone2_type"),
  phone3: text("phone3"),
  phone3Type: text("phone3_type"),
  title: text("title"),
  address: text("address"), // New: Adres (if different from company)
  city: text("city"), // New
  district: text("district"), // New
  country: text("country").default("Türkiye"), // New
  postCode: text("post_code"), // New
  notes: text("notes"), // New: Notlar
  representativeId: uuid("representative_id").references(() => users.id),
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
  legacyProposalNo: text("legacy_proposal_no"), // For "Ad/Teklif Ref No"
  notes: text("notes"), // For "Teklif Notları"
  paymentTerms: text("payment_terms"), // For "Ödeme"
  proposalDate: timestamp("proposal_date"), // For "Gönderim Tarihi"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const proposalItems = pgTable("proposal_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unit: text("unit"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  attributes: jsonb("attributes"),
  isHeader: boolean("is_header").default(false),
  order: integer("order").default(0),
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

export const usersRelations = relations(users, ({ many }) => ({
  companies: many(companies),
  persons: many(persons),
  orders: many(orders),
}));

export const companiesRelations = relations(companies, ({ many, one }) => ({
  proposals: many(proposals),
  persons: many(persons),
  documents: many(documents),
  orders: many(orders),
  representative: one(users, {
    fields: [companies.representativeId],
    references: [users.id],
  }),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  company: one(companies, {
    fields: [persons.companyId],
    references: [companies.id],
  }),
  representative: one(users, {
    fields: [persons.representativeId],
    references: [users.id],
  }),
  proposals: many(proposals),
  documents: many(documents),
  orders: many(orders),
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
  order: one(orders, {
    fields: [proposals.id],
    references: [orders.proposalId],
  }),
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

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNo: text("order_no").unique().notNull(),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  companyId: uuid("company_id").references(() => companies.id),
  personId: uuid("person_id").references(() => persons.id),
  representativeId: uuid("representative_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: text("currency"),
  notes: text("notes"),
  projectName: text("project_name"),
  status: text("status").default("pending"),
  orderDate: timestamp("order_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one }) => ({
  proposal: one(proposals, {
    fields: [orders.proposalId],
    references: [proposals.id],
  }),
  company: one(companies, {
    fields: [orders.companyId],
    references: [companies.id],
  }),
  person: one(persons, {
    fields: [orders.personId],
    references: [persons.id],
  }),
  representative: one(users, {
    fields: [orders.representativeId],
    references: [users.id],
  }),
}));
