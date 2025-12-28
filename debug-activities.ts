
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

import { getActivities } from "./app/actions/activities";
import { db } from "./db";
import { activities } from "./db/schema";

async function runDebug() {
  console.log("Starting debug...");

  try {
    // 1. Fetch all activities (limit 1 to check connection)
    console.log("\n--- Test 1: Fetch all (no filters) ---");
    const result1 = await getActivities();
    if (result1.success) {
      console.log(`Success! Found ${result1.data?.length} activities.`);
      if (result1.data && result1.data.length > 0) {
        console.log("First activity sample:", JSON.stringify(result1.data[0], null, 2));
      }
    } else {
      console.error("Test 1 Failed:", result1.error);
    }

    // 2. Fetch with random UUID proposalId
    console.log("\n--- Test 2: Fetch with random proposalId ---");
    const randomId = "00000000-0000-0000-0000-000000000000"; // Valid UUID format
    const result2 = await getActivities({ proposalId: randomId });
    if (result2.success) {
      console.log(`Success! Found ${result2.data?.length} activities (should be 0).`);
    } else {
      console.error("Test 2 Failed:", result2.error);
    }

    // 3. Fetch with invalid UUID proposalId
    console.log("\n--- Test 3: Fetch with INVALID proposalId ---");
    const invalidId = "invalid-uuid-string"; 
    // Note: getActivities checks for empty string, but let's see what happens if we pass this
    // The type definition says string, so it's allowed in TS, but runtime might fail
    try {
        const result3 = await getActivities({ proposalId: invalidId });
        if (result3.success) {
            console.log(`Success (unexpected)? Found ${result3.data?.length} activities.`);
        } else {
            console.error("Test 3 Failed (expected):", result3.error);
        }
    } catch (e) {
        console.error("Test 3 Exception (expected):", e);
    }
    
    // 4. Check if we can select from users (assignedTo relation check)
    console.log("\n--- Test 4: Check Relations ---");
    // We suspect relations might be causing issues if data is missing or schema is wrong
    // Let's try to query directly with drizzle to see if 'with' clause fails
    try {
        const data = await db.query.activities.findFirst({
            with: {
                assignedToUser: true,
            }
        });
        console.log("Relation assignedToUser check:", data ? "OK" : "No activities found to check");
    } catch (e) {
        console.error("Relation assignedToUser Failed:", e);
    }

  } catch (err) {
    console.error("Global Debug Error:", err);
  }

  process.exit(0);
}

runDebug();
