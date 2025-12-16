"use server";

import { createClient } from "@supabase/supabase-js";
import { toTurkishLikePattern } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export type ProcessCustomerResult = 
  | { status: "FOUND"; company: any; person: any }
  | { status: "MULTIPLE_COMPANIES_FOUND"; companies: any[]; parsedData: any }
  | { status: "COMPANY_FOUND_PERSON_NOT_FOUND"; company: any; parsedData: any }
  | { status: "COMPANY_NOT_FOUND"; parsedData: any }
  | { status: "ERROR"; error: string };

export async function processCustomerAction(data: {
    company_name: string;
    person_name: string;
    project_name: string;
    city: string;
    phone: string;
}, forceCompanyId?: string): Promise<ProcessCustomerResult> {
    try {
        if (!data.company_name && !forceCompanyId) {
             // If no company name and no forced ID, treat as Company Not Found
             return { status: "COMPANY_NOT_FOUND", parsedData: data };
        }

        let company = null;

        if (forceCompanyId) {
             const { data: forcedCompany, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', forceCompanyId)
                .single();
            
            if (error || !forcedCompany) {
                return { status: "ERROR", error: "Seçilen şirket bulunamadı." };
            }
            company = forcedCompany;
        } else {
            // 1. Search Company (Waterfall Search)
            const cleanName = data.company_name.trim();
            const words = cleanName.split(/\s+/).filter(w => w.length > 0);
            
            let matches: any[] = [];

            // Tier 1: Full Name Match (All words in sequence with wildcards)
            // e.g. "Acıbadem Proje Yönetimi" -> "%Acıbadem%Proje%Yönetimi%"
            if (words.length > 0) {
                const term = words.map(w => toTurkishLikePattern(w)).join('%');
                const { data: companies } = await supabase
                    .from('companies')
                    .select('*')
                    .ilike('name', `%${term}%`)
                    .limit(20);
                
                if (companies && companies.length > 0) {
                    matches = companies;
                }
            }

            // Tier 2: Partial High-Quality Match (If Tier 1 failed and we have > 1 word)
            // Try matching subsets of words to handle typos or missing middle names
            // IMPORTANT: We focus on the FIRST word (prefix) to avoid generic suffix matches (e.g. "Proje Yönetimi")
            if (matches.length === 0 && words.length > 1) {
                const terms: string[] = [];
                
                // 1. First N-1 words (e.g. "Acıbadem Proje")
                terms.push(words.slice(0, -1).map(w => toTurkishLikePattern(w)).join('%'));
                
                // REMOVED: Last N-1 words (e.g. "Proje Yönetimi") - this causes flooding with generic companies
                // terms.push(words.slice(1).join('%'));

                // 2. First and Last word (e.g. "Acıbadem Yönetimi") - handles middle name omission
                if (words.length > 2) {
                    terms.push(`${toTurkishLikePattern(words[0])}%${toTurkishLikePattern(words[words.length - 1])}`);
                }

                for (const term of terms) {
                     const { data: companies } = await supabase
                        .from('companies')
                        .select('*')
                        .ilike('name', `%${term}%`)
                        .limit(10);
                    
                    if (companies) {
                        // Add unique companies
                        companies.forEach(c => {
                            if (!matches.some(m => m.id === c.id)) {
                                matches.push(c);
                            }
                        });
                    }
                }
            }

            // Tier 3: Single Word Match (Fallback - ONLY if previous tiers failed completely)
            // This prevents "Acıbadem Hastanesi" flooding when searching for "Acıbadem Proje"
            if (matches.length === 0 && words.length > 0 && words[0].length >= 3) {
                 const term = toTurkishLikePattern(words[0]);
                 const { data: companies } = await supabase
                    .from('companies')
                    .select('*')
                    .ilike('name', `%${term}%`)
                    .limit(20);
            
            if (companies) {
                matches = companies;
            }
        }
            
            if (matches.length > 1) {
                // Return top 20 matches
                return { 
                    status: "MULTIPLE_COMPANIES_FOUND", 
                    companies: matches.slice(0, 20), 
                    parsedData: data 
                };
            } else if (matches.length === 1) {
                company = matches[0];
            }
        }

        if (company) {
            // Company Found
            if (!data.person_name) {
                // No person name provided, just select company
                 return { status: "FOUND", company, person: null };
            }

            // 2. Search Person in Company
            // Split name to search loosely
            const parts = data.person_name.trim().split(' ');
            
            // Construct query: check if first name matches OR last name matches
            // We search for ANY person in this company matching parts
            let query = supabase
                .from('persons')
                .select('*')
                .eq('company_id', company.id);

            // Handle "Arif Üzgün" -> first_name ilike %Arif% OR last_name ilike %Üzgün%
            // Also handle "Arif" (single name)
            if (parts.length > 0) {
                 const firstPart = toTurkishLikePattern(parts[0]);
                 const lastPart = parts.length > 1 ? toTurkishLikePattern(parts[parts.length - 1]) : firstPart;
                 
                 query = query.or(`first_name.ilike.%${firstPart}%,last_name.ilike.%${lastPart}%`);
            }

            const { data: persons, error: personError } = await query.limit(1);

            if (personError) throw personError;

            const person = persons && persons.length > 0 ? persons[0] : null;

            if (person) {
                return { status: "FOUND", company, person };
            } else {
                return { status: "COMPANY_FOUND_PERSON_NOT_FOUND", company, parsedData: data };
            }

        } else {
            // Company Not Found
            return { status: "COMPANY_NOT_FOUND", parsedData: data };
        }

    } catch (error) {
        console.error("Process Customer Error:", error);
        return { status: "ERROR", error: "Müşteri sorgulanırken bir hata oluştu." };
    }
}
