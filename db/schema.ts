import { pgTable, uuid, text, jsonb, timestamp, decimal, integer, serial, boolean, AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").default("123456"),
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
  currentBalance: decimal("guncel_bakiye", { precision: 10, scale: 2 }).default("0"), // New: Güncel Bakiye
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
  revision: integer("revision").default(0),
  rootProposalId: uuid("root_proposal_id").references((): AnyPgColumn => proposals.id),
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
  // New optional fields
  kelvin: integer("kelvin"),
  watt: decimal("watt", { precision: 10, scale: 2 }),
  lumen: integer("lumen"),
  width: decimal("width", { precision: 10, scale: 2 }), // En
  length: decimal("length", { precision: 10, scale: 2 }), // Boy
  pieceCount: integer("piece_count"), // Adet
  isHeader: boolean("is_header").default(false),
  order: integer("order").default(0),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  orderId: uuid("order_id").references(() => orders.id),
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

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  type: text("type").default("product"), // product | service
  description: text("description"),
  unit: text("unit"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("EUR"),
  vatRate: integer("vat_rate").default(20),
  stockQuantity: integer("stok_miktari").default(0), // New: Stok Miktarı
  criticalStockLevel: integer("kritik_stok_seviyesi").default(10), // New: Kritik Stok Seviyesi
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const faturalar = pgTable("faturalar", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  faturaNo: text("fatura_no").unique().notNull(),
  tarih: timestamp("tarih").defaultNow().notNull(),
  sonOdemeTarihi: timestamp("son_odeme_tarihi"),
  tip: text("tip").notNull(), // SATIS, ALIS, IADE
  durum: text("durum").default("TASLAK"), // TASLAK, ONAYLI, IPTAL
  araToplam: decimal("ara_toplam", { precision: 10, scale: 2 }).default("0"),
  kdvToplam: decimal("kdv_toplam", { precision: 10, scale: 2 }).default("0"),
  genelToplam: decimal("genel_toplam", { precision: 10, scale: 2 }).default("0"),
  kalanTutar: decimal("kalan_tutar", { precision: 10, scale: 2 }).default("0"), // New: Kalan Tutar
  paraBirimi: text("para_birimi").default("TRY"),
  dovizKuru: decimal("doviz_kuru", { precision: 10, scale: 4 }).default("1"),
  notlar: text("notlar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const faturaKalemleri = pgTable("fatura_kalemleri", {
  id: uuid("id").defaultRandom().primaryKey(),
  faturaId: uuid("fatura_id").references(() => faturalar.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id),
  aciklama: text("aciklama").notNull(),
  miktar: integer("miktar").notNull(),
  birim: text("birim").default("Adet"),
  birimFiyat: decimal("birim_fiyat", { precision: 10, scale: 2 }).notNull(),
  kdvOrani: integer("kdv_orani").default(20),
  toplamTutar: decimal("toplam_tutar", { precision: 10, scale: 2 }).notNull(),
});

export const stokHareketleri = pgTable("stok_hareketleri", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  faturaId: uuid("fatura_id").references(() => faturalar.id), // Opsiyonel, manuel hareket olabilir
  islemTuru: text("islem_turu").notNull(), // GIRIS, CIKIS
  miktar: integer("miktar").notNull(),
  tarih: timestamp("tarih").defaultNow().notNull(),
  aciklama: text("aciklama"),
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

export const activityTypes = pgTable("activity_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // e.g. "TASK", "CALL" - used in code/logic
  label: text("label").notNull(), // e.g. "Görev", "Arama" - display name
  color: text("color").default("#3b82f6"), // Hex color code
  icon: text("icon"), // Icon name from lucide-react or similar
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(), // TASK, CALL, MEETING, EMAIL, NOTE
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").default("OPEN"), // OPEN, IN_PROGRESS, COMPLETED, CANCELED
  priority: text("priority").default("MEDIUM"), // LOW, MEDIUM, HIGH
  dueDate: timestamp("due_date"),
  assignedTo: uuid("assigned_to").references(() => users.id).notNull(),
  contactId: uuid("contact_id").references(() => persons.id),
  companyId: uuid("company_id").references(() => companies.id),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: jsonb("recurrence_rule"),
  reminders: jsonb("reminders"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  entityType: text("entity_type").notNull(), // companies, persons, proposals, etc.
  entityId: uuid("entity_id").notNull(),
  entityName: text("entity_name"), // Display name of the entity for quick access
  userId: uuid("user_id").references(() => users.id), // Who performed the action
  companyId: uuid("company_id").references(() => companies.id), // Link to company context
  details: jsonb("details"), // Changed fields, old/new values
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RELATIONS

export const usersRelations = relations(users, ({ many }) => ({
  companies: many(companies),
  persons: many(persons),
  orders: many(orders),
  activities: many(activities),
  auditLogs: many(auditLogs),
}));

export const companiesRelations = relations(companies, ({ many, one }) => ({
  proposals: many(proposals),
  persons: many(persons),
  documents: many(documents),
  orders: many(orders),
  activities: many(activities),
  auditLogs: many(auditLogs),
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
  activities: many(activities),
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
  activities: many(activities),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalItems.proposalId],
    references: [proposals.id],
  }),
}));

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

export const activitiesRelations = relations(activities, ({ one }) => ({
  assignedToUser: one(users, {
    fields: [activities.assignedTo],
    references: [users.id],
  }),
  contact: one(persons, {
    fields: [activities.contactId],
    references: [persons.id],
  }),
  company: one(companies, {
    fields: [activities.companyId],
    references: [companies.id],
  }),
  proposal: one(proposals, {
    fields: [activities.proposalId],
    references: [proposals.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [auditLogs.companyId],
    references: [companies.id],
  }),
}));

export const faturalarRelations = relations(faturalar, ({ one, many }) => ({
  company: one(companies, {
    fields: [faturalar.companyId],
    references: [companies.id],
  }),
  kalemler: many(faturaKalemleri),
  stokHareketleri: many(stokHareketleri),
}));

export const faturaKalemleriRelations = relations(faturaKalemleri, ({ one }) => ({
  fatura: one(faturalar, {
    fields: [faturaKalemleri.faturaId],
    references: [faturalar.id],
  }),
  product: one(products, {
    fields: [faturaKalemleri.productId],
    references: [products.id],
  }),
}));

export const stokHareketleriRelations = relations(stokHareketleri, ({ one }) => ({
  product: one(products, {
    fields: [stokHareketleri.productId],
    references: [products.id],
  }),
  fatura: one(faturalar, {
    fields: [stokHareketleri.faturaId],
    references: [faturalar.id],
  }),
}));

export const cariHareketler = pgTable("cari_hareketler", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  tarih: timestamp("tarih").defaultNow().notNull(),
  islemTuru: text("islem_turu").notNull(),
  belgeNo: text("belge_no"),
  aciklama: text("aciklama"),
  borc: decimal("borc", { precision: 10, scale: 2 }).default("0"),
  alacak: decimal("alacak", { precision: 10, scale: 2 }).default("0"),
  bakiye: decimal("bakiye", { precision: 10, scale: 2 }).default("0"),
  orderId: uuid("order_id").references(() => orders.id),
  faturaId: uuid("fatura_id").references(() => faturalar.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cariHareketlerRelations = relations(cariHareketler, ({ one }) => ({
  company: one(companies, {
    fields: [cariHareketler.companyId],
    references: [companies.id],
  }),
  order: one(orders, {
    fields: [cariHareketler.orderId],
    references: [orders.id],
  }),
  fatura: one(faturalar, {
    fields: [cariHareketler.faturaId],
    references: [faturalar.id],
  }),
}));
