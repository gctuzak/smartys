
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        const filePath = path.join(process.cwd(), 'excel_data', 'siparis.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error(`Excel file not found at ${filePath}`);
            process.exit(1);
        }

        console.log("Reading Excel file...");
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} rows.`);

        let processedCount = 0;
        let errorCount = 0;

        for (const row of data as any[]) {
            const orderNo = row['Sipariş Adı/No'] ? String(row['Sipariş Adı/No']).trim() : null;
            if (!orderNo) continue;

            const repName = row['Teklif Sorumlusu'] ? String(row['Teklif Sorumlusu']).trim() : null;
            const companyName = row['Müşteri Adı'] ? String(row['Müşteri Adı']).trim() : null;
            const personName = row['İlgili'] ? String(row['İlgili']).trim() : null;
            const proposalRef = row['Ad/Teklif Ref No'] ? String(row['Ad/Teklif Ref No']).trim() : null;
            const proposalIdRef = row[' Teklifi'] ? String(row[' Teklifi']).trim() : null;
            const amount = row['Tutar_1'] ? parseFloat(row['Tutar_1']) : null;
            const currency = row['Pr Br_1'] ? String(row['Pr Br_1']).trim() : null;
            const notes = row['Notlar'] ? String(row['Notlar']).trim() : null;
            const projectName = row['Proje Adı'] ? String(row['Proje Adı']).trim() : null;
            const excelDate = row['Son Düzenleme Tarihi'];
            
            let orderDate = new Date().toISOString();
            if (typeof excelDate === 'number') {
                // Excel date to JS date
                orderDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000)).toISOString();
            }

            try {
                // 1. Find/Create Representative
                let repId = null;
                if (repName) {
                    const parts = repName.split(' ');
                    let firstName = parts[0];
                    let lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Temsilci';
                    
                    const normalize = (s: string) => s.toLowerCase()
                        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                        .replace(/[^a-z0-9]/g, '');
                    const email = `${normalize(firstName)}.${normalize(lastName)}@smartys.com`;

                    const { data: users } = await supabase
                        .from('users')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (users) {
                        repId = users.id;
                    } else {
                        const { data: newUser, error: createError } = await supabase
                            .from('users')
                            .insert({
                                first_name: firstName,
                                last_name: lastName,
                                email: email,
                                role: 'representative'
                            })
                            .select('id')
                            .single();
                        
                        if (newUser) repId = newUser.id;
                    }
                }

                // 2. Find/Create Company
                let companyId = null;
                if (companyName) {
                    const { data: companies } = await supabase
                        .from('companies')
                        .select('id')
                        .ilike('name', companyName)
                        .limit(1)
                        .maybeSingle();

                    if (companies) {
                        companyId = companies.id;
                    } else {
                        const { data: newCompany } = await supabase
                            .from('companies')
                            .insert({ name: companyName })
                            .select('id')
                            .single();
                        if (newCompany) companyId = newCompany.id;
                    }
                }

                // 3. Find/Create Person
                let personId = null;
                if (personName && companyId) {
                    // Try to find person in that company
                    const parts = personName.split(' ');
                    const firstName = parts[0];
                    // Basic split for query
                    
                    const { data: persons } = await supabase
                        .from('persons')
                        .select('id')
                        .eq('company_id', companyId)
                        .ilike('first_name', firstName)
                        .limit(1)
                        .maybeSingle();

                    if (persons) {
                        personId = persons.id;
                    } else {
                        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
                        const { data: newPerson } = await supabase
                            .from('persons')
                            .insert({
                                company_id: companyId,
                                first_name: firstName,
                                last_name: lastName
                            })
                            .select('id')
                            .single();
                        if (newPerson) personId = newPerson.id;
                    }
                }

                // 4. Find Proposal
                let proposalId = null;
                if (proposalRef || proposalIdRef) {
                    const ref = proposalRef || proposalIdRef;
                    
                    // Supabase OR syntax: column.eq.value,column.eq.value
                    // But here we need OR between two different columns which is tricky with simple query builder
                    // We'll try legacy_proposal_no first, then proposal_no
                    
                    let { data: proposal } = await supabase
                        .from('proposals')
                        .select('id')
                        .eq('legacy_proposal_no', ref)
                        .limit(1)
                        .maybeSingle();

                    if (!proposal && !isNaN(Number(ref))) {
                        const { data: p2 } = await supabase
                            .from('proposals')
                            .select('id')
                            .eq('proposal_no', Number(ref))
                            .limit(1)
                            .maybeSingle();
                        proposal = p2;
                    }
                    
                    if (proposal) proposalId = proposal.id;
                }

                // 5. Upsert Order
                const { error: upsertError } = await supabase
                    .from('orders')
                    .upsert({
                        order_no: orderNo,
                        proposal_id: proposalId,
                        company_id: companyId,
                        person_id: personId,
                        representative_id: repId,
                        amount: amount,
                        currency: currency,
                        notes: notes,
                        project_name: projectName,
                        order_date: orderDate,
                        status: 'completed'
                    }, { onConflict: 'order_no' });

                if (upsertError) {
                    console.error(`Error upserting order ${orderNo}:`, upsertError.message);
                    errorCount++;
                } else {
                    processedCount++;
                    process.stdout.write('.');
                }

            } catch (err) {
                console.error(`Error processing row ${orderNo}:`, err);
                errorCount++;
            }
        }

        console.log(`\nImport completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    } catch (error) {
        console.error("Error importing orders:", error);
    }
}

main();
