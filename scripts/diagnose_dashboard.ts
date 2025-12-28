import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDashboardData() {
  console.log("--- Dashboard Data Diagnosis ---");

  // 1. Check Users
  console.log("\n1. Users in Database:");
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email");
  
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  
  console.table(users);
  const userIds = users?.map(u => u.id) || [];

  // 2. Check Orders Representative Distribution
  console.log("\n2. Orders Representative Distribution:");
  const { data: orders } = await supabase
    .from("orders")
    .select("id, representative_id, order_no");

  const orderStats: Record<string, number> = { "NULL": 0, "UNKNOWN": 0 };
  userIds.forEach(id => orderStats[id] = 0);

  orders?.forEach(o => {
    if (!o.representative_id) {
      orderStats["NULL"]++;
    } else if (userIds.includes(o.representative_id)) {
      orderStats[o.representative_id]++;
    } else {
      orderStats["UNKNOWN"]++;
      // console.log("Unknown Rep ID:", o.representative_id);
    }
  });

  console.table(orderStats);

  // 3. Check Proposals Company Representative Distribution
  // Dashboard logic: .eq('companies.representative_id', userId)
  console.log("\n3. Proposals (via Company Representative) Distribution:");
  
  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      id,
      companies (
        id,
        representative_id
      )
    `);

  const proposalStats: Record<string, number> = { "NULL": 0, "UNKNOWN": 0, "NO_COMPANY": 0 };
  userIds.forEach(id => proposalStats[id] = 0);

  proposals?.forEach((p: any) => {
    if (!p.companies) {
      proposalStats["NO_COMPANY"]++;
      return;
    }
    
    const repId = p.companies.representative_id;
    
    if (!repId) {
      proposalStats["NULL"]++;
    } else if (userIds.includes(repId)) {
      proposalStats[repId]++;
    } else {
      proposalStats["UNKNOWN"]++;
    }
  });

  console.table(proposalStats);

  // 4. Check Pending Tasks (Activities)
  console.log("\n4. Pending Tasks (Activities) Distribution:");
  const { data: activities } = await supabase
    .from("activities")
    .select("id, assigned_to, status")
    .neq("status", "COMPLETED")
    .neq("status", "CANCELED");

  const taskStats: Record<string, number> = { "NULL": 0, "UNKNOWN": 0 };
  userIds.forEach(id => taskStats[id] = 0);

  activities?.forEach(a => {
    if (!a.assigned_to) {
      taskStats["NULL"]++;
    } else if (userIds.includes(a.assigned_to)) {
      taskStats[a.assigned_to]++;
    } else {
      taskStats["UNKNOWN"]++;
    }
  });

  console.table(taskStats);
}

diagnoseDashboardData();
