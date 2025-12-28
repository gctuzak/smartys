
import { db } from "../db";
import { users } from "../db/schema";
import { count } from "drizzle-orm";

async function main() {
  console.log("Testing DB Connection...");
  try {
    const [{ value }] = await db.select({ value: count() }).from(users);
    console.log("Users count:", value);
    
    const allUsers = await db.select().from(users);
    console.log("Users:", allUsers);

  } catch (error) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}

main();
