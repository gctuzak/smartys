"use server";

import { createClient } from '@supabase/supabase-js';
import { ParsedData } from "@/types";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveProposalAction(data: ParsedData) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    // Basic validation
    if (!data.company.name && !data.person?.name) {
       throw new Error("Şirket adı veya Kişi adı belirtilmelidir.");
    }

    let companyId: string | null = null;
    let personId: string | null = null;

    // 1. Process Company
    if (data.company.name) {
      const companyName = data.company.name.trim();
      const contactInfo = data.company.contactInfo || {};
      
      // Check if company exists
      const { data: existingCompanies, error: searchError } = await supabase
        .from('companies')
        .select('id, contact_info')
        .ilike('name', companyName)
        .limit(1);

      if (searchError) throw searchError;

      if (existingCompanies && existingCompanies.length > 0) {
        companyId = existingCompanies[0].id;
        
        // Update existing company with new contact info (merge)
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

    // 2. Process Person
    if (data.person?.name) {
      const fullName = data.person.name.trim();
      // Split name
      const parts = fullName.split(' ');
      let firstName = fullName;
      let lastName = '-';
      
      if (parts.length > 1) {
        lastName = parts.pop() || '';
        firstName = parts.join(' ');
      }

      // Check if person exists (by email if available, or name + companyId)
      let query = supabase.from('persons').select('id');
      
      if (data.person.email) {
        query = query.eq('email', data.person.email);
      } else if (companyId) {
        // If no email, try to find by name within the company
        query = query
          .eq('company_id', companyId)
          .ilike('first_name', firstName)
          .ilike('last_name', lastName);
      } else {
        // Just name match (might be risky for common names, but best effort)
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
        // Update person info if needed
        const updateData: any = {};
        if (data.person.email) updateData.email = data.person.email;
        if (data.person.phone) updateData.phone = data.person.phone;
        if (data.person.title) updateData.title = data.person.title;
        // Link to company if not already linked and we have a companyId
        if (companyId) updateData.company_id = companyId;

        if (Object.keys(updateData).length > 0) {
           await supabase.from('persons').update(updateData).eq('id', personId);
        }

      } else {
        // Create new person
        const { data: newPerson, error: createPersonError } = await supabase
          .from('persons')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: data.person.email,
            phone: data.person.phone,
            title: data.person.title,
            company_id: companyId || null, // Can be null now
          })
          .select('id')
          .single();

        if (createPersonError) {
          console.error("Create person error:", createPersonError);
          // Don't fail the whole process if person creation fails, just log it?
          // Or maybe throw? Let's throw for now to see issues.
          // throw createPersonError; 
          // Actually, if person creation fails (e.g. constraints), we might want to continue with just company
        } else {
          personId = newPerson.id;
        }
      }
    }

    // 3. Create Proposal
    // Check duplicate
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

    // Insert Proposal
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
        legacy_proposal_no: data.proposal.legacyProposalNo,
        notes: data.proposal.notes,
        payment_terms: data.proposal.paymentTerms,
        proposal_date: data.proposal.proposalDate,
        ai_confidence: 85, // Mock confidence
      })
      .select('id')
      .single();

    if (proposalError) throw proposalError;
    const proposalId = newProposal.id;

    // 4. Insert Items
    if (data.proposal.items && data.proposal.items.length > 0) {
      const itemsToInsert = data.proposal.items.map((item, index) => ({
        proposal_id: proposalId,
        description: item.description,
        quantity: item.quantity ?? null,
        unit: item.unit,
        unit_price: item.unitPrice ?? null,
        total_price: item.totalPrice ?? null,
        attributes: item.attributes,
        is_header: item.isHeader ?? false,
        order: index
      }));

      const { error: itemsError } = await supabase
        .from('proposal_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    await logActivity({
      action: 'Teklif Oluşturuldu',
      entityType: 'proposals',
      entityId: proposalId,
      entityName: data.proposal.legacyProposalNo || `Teklif`,
      userId: userId,
      companyId: companyId || undefined,
      details: data.proposal
    });

    return { success: true, proposalId, companyId, personId };

  } catch (error: any) {
    console.error("Save Proposal Error:", error);
    return { success: false, error: error.message };
  }
}
