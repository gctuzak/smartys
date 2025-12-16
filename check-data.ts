
import { db } from "./db";
import { users, companies, persons, proposals } from "./db/schema";
import { sql } from "drizzle-orm";

async function checkData() {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const companyCount = await db.select({ count: sql`count(*)` }).from(companies);
    const personCount = await db.select({ count: sql`count(*)` }).from(persons);
    const proposalCount = await db.select({ count: sql`count(*)` }).from(proposals);

    console.log("Users:", userCount[0].count);
    console.log("Companies:", companyCount[0].count);
    console.log("Persons:", personCount[0].count);
    console.log("Proposals:", proposalCount[0].count);
    
    // Also fetch one of each to see the structure if count > 0
    if (Number(userCount[0].count) > 0) {
        const u = await db.query.users.findFirst();
        console.log("Sample User:", u);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking data:", error);
    process.exit(1);
  }
}

checkData();
