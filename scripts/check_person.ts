
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPerson() {
    console.log("Searching for 'Ümit Karadeniz'...");

    const { data, error } = await supabase
        .from('persons')
        .select('*')
        .ilike('first_name', '%Ümit%')
        .ilike('last_name', '%Karadeniz%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Found person(s):");
        data.forEach(p => {
            console.log(`- ${p.first_name} ${p.last_name} (ID: ${p.id}, Code: ${p.code}, Company ID: ${p.company_id})`);
        });
    } else {
        console.log("Person not found.");
    }
}

checkPerson();
