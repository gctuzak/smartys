
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProposal() {
    console.log("Searching for Proposal 5418...");

    // 1. proposal_no (integer) olarak ara
    const { data: p1, error: e1 } = await supabase
        .from('proposals')
        .select('*')
        .eq('proposal_no', 5418);

    if (e1 && e1.code !== '22P02') console.error("Error searching proposal_no:", e1); // 22P02 invalid input syntax (e.g. searching string in int)
    
    if (p1 && p1.length > 0) {
        console.log("Found by proposal_no:", p1);
        await checkRelations(p1[0]);
        return;
    }

    // 2. legacy_proposal_no (text) olarak ara
    const { data: p2, error: e2 } = await supabase
        .from('proposals')
        .select('*')
        .eq('legacy_proposal_no', '5418');

    if (e2) console.error("Error searching legacy_proposal_no:", e2);

    if (p2 && p2.length > 0) {
        console.log("Found by legacy_proposal_no:", p2);
        await checkRelations(p2[0]);
        return;
    }

    console.log("Proposal 5418 not found in database.");
}

async function checkRelations(proposal: any) {
    console.log("\nChecking relations for proposal:", proposal.id);

    if (proposal.company_id) {
        const { data: c } = await supabase.from('companies').select('*').eq('id', proposal.company_id).single();
        console.log("Company:", c ? `${c.name} (ID: ${c.id})` : "Not found");
    } else {
        console.log("No company_id linked.");
    }

    if (proposal.person_id) {
        const { data: p } = await supabase.from('persons').select('*').eq('id', proposal.person_id).single();
        console.log("Person:", p ? `${p.first_name} ${p.last_name} (ID: ${p.id})` : "Not found");
    } else {
        console.log("No person_id linked.");
    }
}

checkProposal();
