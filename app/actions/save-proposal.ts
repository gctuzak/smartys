"use server";

import { createClient } from '@supabase/supabase-js';
import { ParsedData } from "@/types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveProposalAction(data: ParsedData) {
  try {
    if (!data.company.name && !data.person?.name) {
       throw new Error("Şirket adı veya Kişi adı belirtilmelidir.");
    }

    let companyId: string | null = null;
    let personId: string | null = null;

    if (data.company.name) {
      const companyName = data.company.name.trim();
      const contactInfo = data.company.contactInfo || {};
      const { data: existingCompanies, error: searchError } = await supabase
        .from('companies')
        .select('id, contact_info')
        .ilike('name', companyName)
        .limit(1);
      if (searchError) throw searchError;
      if (existingCompanies && existingCompanies.length > 0) {
        companyId = existingCompanies[0].id;
        const existingContact = existingCompanies[0].contact_info as Record<string, any> || {};
        const newContact = { ...existingContact, ...contactInfo };
        const updateData: any = { contact_info: newContact };
        const getString = (obj: any, key: string) => typeof obj[key] === 'string' ? obj[key] : undefined;
        if (getString(contactInfo, 'tax_no')) updateData.tax_no = getString(contactInfo, 'tax_no');
        if (getString(contactInfo, 'tax_office')) updateData.tax_office = getString(contactInfo, 'tax_office');
        if (contactInfo.address) updateData.address = contactInfo.address;
        if (contactInfo.phone) updateData.phone = contactInfo.phone;
        if (contactInfo.email) updateData.email = contactInfo.email;
        if (getString(contactInfo, 'website')) updateData.website = getString(contactInfo, 'website');
        await supabase.from('companies').update(updateData).eq('id', companyId);
      } else {
        const getString = (obj: any, key: string) => typeof obj[key] === 'string' ? obj[key] : undefined;
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            contact_info: contactInfo,
            tax_no: getString(contactInfo, 'tax_no'),
            tax_office: getString(contactInfo, 'tax_office'),
            address: contactInfo.address,
            phone: contactInfo.phone,
            email: contactInfo.email,
            website: getString(contactInfo, 'website'),
          })
          .select('id')
          .single();
        if (createError) throw createError;
        companyId = newCompany.id;
      }
    }

    if (data.person?.name) {
      const fullName = data.person.name.trim();
      const parts = fullName.split(' ');
      let firstName = fullName;
      let lastName = '-';
      if (parts.length > 1) {
        lastName = parts.pop() || '';
        firstName = parts.join(' ');
      }
      let query = supabase.from('persons').select('id');
      if (data.person.email) {
        query = query.eq('email', data.person.email);
      } else if (companyId) {
        query = query
          .eq('company_id', companyId)
          .ilike('first_name', firstName)
          .ilike('last_name', lastName);
      } else {
        query = query
          .ilike('first_name', firstName)
          .ilike('last_name', lastName)
          .is('company_id', null);
      }
      const { data: existingPersons, error: personSearchError } = await query.limit(1);
      if (personSearchError && personSearchError.code !== 'PGRST116') {
         console.warn("Person search error:", personSearchError);
      }
      if (existingPersons && existingPersons.length > 0) {
        personId = existingPersons[0].id;
        const updateData: any = {};
        if (data.person.email) updateData.email = data.person.email;
        if (data.person.phone) updateData.phone = data.person.phone;
        if (data.person.title) updateData.title = data.person.title;
        if (companyId) updateData.company_id = companyId;
        if (Object.keys(updateData).length > 0) {
           await supabase.from('persons').update(updateData).eq('id', personId);
        }
      } else {
        const { data: newPerson, error: createPersonError } = await supabase
          .from('persons')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: data.person.email,
            phone: data.person.phone,
            title: data.person.title,
            company_id: companyId || null,
          })
          .select('id')
          .single();
        if (createPersonError) {
          console.error("Create person error:", createPersonError);
        } else {
          personId = newPerson.id;
        }
      }
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    let dupQuery = supabase
      .from('proposals')
      .select('id')
      .eq('total_amount', Number(data.proposal.totalAmount || 0).toFixed(2))
      .gt('created_at', twoMinutesAgo);
    if (companyId) dupQuery = dupQuery.eq('company_id', companyId);
    if (personId) dupQuery = dupQuery.eq('person_id', personId);
    const { data: existingProposal } = await dupQuery.single();
    if (existingProposal) {
      return { success: true, proposalId: existingProposal.id };
    }

    const { data: newProposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        company_id: companyId,
        person_id: personId,
        status: 'draft',
        total_amount: data.proposal.totalAmount,
        vat_rate: data.proposal.vatRate ?? 20,
        vat_amount: data.proposal.vatAmount,
        grand_total: data.proposal.grandTotal,
        currency: data.proposal.currency,
        ai_confidence: 85,
      })
      .select('id')
      .single();
    if (proposalError) throw proposalError;
    const proposalId = newProposal.id;

    if (data.proposal.items && data.proposal.items.length > 0) {
      const itemsToInsert = data.proposal.items.map(item => ({
        proposal_id: proposalId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        attributes: item.attributes
      }));
      const { error: itemsError } = await supabase
        .from('proposal_items')
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    return { success: true, proposalId, companyId, personId };

  } catch (error: any) {
    console.error("Save Proposal Error:", error);
    return { success: false, error: error.message };
  }
}
