export interface Company {
  id?: string;
  name: string;
  taxNo?: string;
  taxOffice?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  contactInfo?: Record<string, unknown>;
  createdAt?: Date;
}

export interface Person {
  id?: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  createdAt?: Date;
}

export interface ProposalItem {
  id?: string;
  proposalId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  attributes?: Record<string, unknown>;
}

export interface Proposal {
  id?: string;
  companyId?: string;
  status: string;
  totalAmount?: number;
  currency?: string;
  aiConfidence?: number;
  createdAt?: Date;
  items?: ProposalItem[];
  company?: Company;
}

export interface ParsedData {
  company: {
    name: string | null;
    contactInfo: {
      email?: string;
      phone?: string;
      address?: string;
      [key: string]: unknown;
    };
  };
  person?: {
    name: string | null;
    email?: string;
    phone?: string;
    title?: string;
  };
  proposal: {
    currency: string;
    totalAmount: number;
    vatRate?: number;
    vatAmount?: number;
    grandTotal?: number;
    items: {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalPrice: number;
      attributes?: Record<string, unknown>;
    }[];
  };
}
