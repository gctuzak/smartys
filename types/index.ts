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
  code?: string | null;
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
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  attributes?: Record<string, unknown>;
  kelvin?: string;
  watt?: string;
  lumen?: string;
  width?: number;
  length?: number;
  pieceCount?: number;
  isHeader?: boolean;
  order?: number;
}

export interface Proposal {
  id?: string;
  companyId?: string;
  status: string;
  totalAmount?: number;
  currency?: string;
  aiConfidence?: number;
  createdAt?: Date;
  legacyProposalNo?: string;
  notes?: string;
  paymentTerms?: string;
  proposalDate?: Date;
  items?: ProposalItem[];
  company?: Company;
  personId?: string;
  person?: Person;
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
    legacyProposalNo?: string;
    notes?: string;
    paymentTerms?: string;
    proposalDate?: Date;
    items: {
      id?: string;
      description: string;
      quantity?: number;
      unit: string;
      unitPrice?: number;
      totalPrice?: number;
      attributes?: Record<string, unknown>;
      kelvin?: string;
      watt?: string;
      lumen?: string;
      width?: number;
      length?: number;
      pieceCount?: number;
      isHeader?: boolean;
      order?: number;
    }[];
  };
}
