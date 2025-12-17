
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const activityTypes = [
  { name: "TASK", label: "Görev", icon: "check-circle-2", color: "#3b82f6" },
  { name: "CALL", label: "Arama", icon: "phone", color: "#f59e0b" },
  { name: "MEETING", label: "Toplantı", icon: "calendar", color: "#10b981" },
  { name: "EMAIL", label: "E-posta", icon: "mail", color: "#6366f1" },
  { name: "NOTE", label: "Not", icon: "file-text", color: "#8b5cf6" },
];

async function seed() {
  console.log("Seeding activity types...");

  for (const type of activityTypes) {
    const { data, error } = await supabase
      .from("activity_types")
      .upsert({ 
        name: type.name, 
        label: type.label, 
        icon: type.icon, 
        color: type.color,
        is_active: true 
      }, { onConflict: "name" })
      .select();

    if (error) {
      console.error(`Error upserting ${type.name}:`, error);
    } else {
      console.log(`Upserted ${type.name}`);
    }
  }

  console.log("Done.");
}

seed();
