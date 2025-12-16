"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createCompanyWithPersonAction(data: {
    company: {
        name: string;
        tax_no?: string;
        tax_office?: string;
        email?: string;
        phone: string;
        address?: string;
        city?: string;
    },
    person?: {
        name: string;
        email?: string;
        phone: string;
        title?: string;
    }
}) {
    try {
        // Create Company
        const { data: newCompany, error: companyError } = await supabase.from('companies').insert({
            name: data.company.name,
            tax_no: data.company.tax_no,
            tax_office: data.company.tax_office,
            email1: data.company.email,
            phone1: data.company.phone,
            address: data.company.city ? `${data.company.address || ''} ${data.company.city}`.trim() : data.company.address,
        }).select().single();

        if (companyError) throw companyError;

        let newPerson = null;

        // Create Person if provided
        if (data.person && data.person.name) {
            const parts = data.person.name.trim().split(' ');
            const first_name = parts[0];
            const last_name = parts.slice(1).join(' ') || '';

            const { data: createdPerson, error: personError } = await supabase.from('persons').insert({
                first_name: first_name,
                last_name: last_name,
                email1: data.person.email,
                phone1: data.person.phone,
                title: data.person.title,
                company_id: newCompany.id
            }).select().single();

            if (personError) {
                 console.error("Error creating person:", personError);
                 // We don't throw here to at least return the company
            } else {
                newPerson = createdPerson;
            }
        }

        return { success: true, company: newCompany, person: newPerson };

    } catch (error: any) {
        console.error("Create Company Error:", error);
        return { success: false, error: error.message || "Şirket oluşturulamadı." };
    }
}

export async function createPersonForCompanyAction(companyId: string, person: {
    name: string;
    email?: string;
    phone: string;
    title?: string;
}) {
    try {
        const parts = person.name.trim().split(' ');
        const first_name = parts[0];
        const last_name = parts.slice(1).join(' ') || '';

        const { data: newPerson, error } = await supabase.from('persons').insert({
            first_name: first_name,
            last_name: last_name,
            email1: person.email,
            phone1: person.phone,
            title: person.title,
            company_id: companyId
        }).select().single();

        if (error) throw error;

        return { success: true, person: newPerson };

    } catch (error: any) {
        console.error("Create Person Error:", error);
        return { success: false, error: error.message || "Kişi oluşturulamadı." };
    }
}
