import { relations } from "drizzle-orm/relations";
import { users, companies, persons, documents, orders, proposals, auditLogs, faturalar, faturaKalemleri, products, stokHareketleri, proposalItems, cariHareketler, activities } from "./schema";

export const companiesRelations = relations(companies, ({one, many}) => ({
	user: one(users, {
		fields: [companies.representativeId],
		references: [users.id]
	}),
	persons: many(persons),
	documents: many(documents),
	auditLogs: many(auditLogs),
	proposals: many(proposals),
	orders: many(orders),
	faturalars: many(faturalar),
	cariHareketlers: many(cariHareketler),
	activities: many(activities),
}));

export const usersRelations = relations(users, ({many}) => ({
	companies: many(companies),
	persons: many(persons),
	auditLogs: many(auditLogs),
	orders: many(orders),
	activities: many(activities),
}));

export const personsRelations = relations(persons, ({one, many}) => ({
	company: one(companies, {
		fields: [persons.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [persons.representativeId],
		references: [users.id]
	}),
	documents: many(documents),
	proposals: many(proposals),
	orders: many(orders),
	activities: many(activities),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	company: one(companies, {
		fields: [documents.companyId],
		references: [companies.id]
	}),
	order: one(orders, {
		fields: [documents.orderId],
		references: [orders.id]
	}),
	person: one(persons, {
		fields: [documents.personId],
		references: [persons.id]
	}),
	proposal: one(proposals, {
		fields: [documents.proposalId],
		references: [proposals.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	documents: many(documents),
	company: one(companies, {
		fields: [orders.companyId],
		references: [companies.id]
	}),
	person: one(persons, {
		fields: [orders.personId],
		references: [persons.id]
	}),
	proposal: one(proposals, {
		fields: [orders.proposalId],
		references: [proposals.id]
	}),
	user: one(users, {
		fields: [orders.representativeId],
		references: [users.id]
	}),
	cariHareketlers: many(cariHareketler),
}));

export const proposalsRelations = relations(proposals, ({one, many}) => ({
	documents: many(documents),
	company: one(companies, {
		fields: [proposals.companyId],
		references: [companies.id]
	}),
	person: one(persons, {
		fields: [proposals.personId],
		references: [persons.id]
	}),
	proposal: one(proposals, {
		fields: [proposals.rootProposalId],
		references: [proposals.id],
		relationName: "proposals_rootProposalId_proposals_id"
	}),
	proposals: many(proposals, {
		relationName: "proposals_rootProposalId_proposals_id"
	}),
	orders: many(orders),
	proposalItems: many(proposalItems),
	activities: many(activities),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	company: one(companies, {
		fields: [auditLogs.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const faturalarRelations = relations(faturalar, ({one, many}) => ({
	company: one(companies, {
		fields: [faturalar.companyId],
		references: [companies.id]
	}),
	faturaKalemleris: many(faturaKalemleri),
	stokHareketleris: many(stokHareketleri),
	cariHareketlers: many(cariHareketler),
}));

export const faturaKalemleriRelations = relations(faturaKalemleri, ({one}) => ({
	faturalar: one(faturalar, {
		fields: [faturaKalemleri.faturaId],
		references: [faturalar.id]
	}),
	product: one(products, {
		fields: [faturaKalemleri.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	faturaKalemleris: many(faturaKalemleri),
	stokHareketleris: many(stokHareketleri),
}));

export const stokHareketleriRelations = relations(stokHareketleri, ({one}) => ({
	faturalar: one(faturalar, {
		fields: [stokHareketleri.faturaId],
		references: [faturalar.id]
	}),
	product: one(products, {
		fields: [stokHareketleri.productId],
		references: [products.id]
	}),
}));

export const proposalItemsRelations = relations(proposalItems, ({one}) => ({
	proposal: one(proposals, {
		fields: [proposalItems.proposalId],
		references: [proposals.id]
	}),
}));

export const cariHareketlerRelations = relations(cariHareketler, ({one}) => ({
	company: one(companies, {
		fields: [cariHareketler.companyId],
		references: [companies.id]
	}),
	faturalar: one(faturalar, {
		fields: [cariHareketler.faturaId],
		references: [faturalar.id]
	}),
	order: one(orders, {
		fields: [cariHareketler.orderId],
		references: [orders.id]
	}),
}));

export const activitiesRelations = relations(activities, ({one}) => ({
	user: one(users, {
		fields: [activities.assignedTo],
		references: [users.id]
	}),
	company: one(companies, {
		fields: [activities.companyId],
		references: [companies.id]
	}),
	person: one(persons, {
		fields: [activities.contactId],
		references: [persons.id]
	}),
	proposal: one(proposals, {
		fields: [activities.proposalId],
		references: [proposals.id]
	}),
}));