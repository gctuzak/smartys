
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseKey);

export async function generatePersonCode() {
  try {
    const { data, error } = await adminSupabase
      .from("persons")
      .select("code")
      .not("code", "is", null)
      .ilike("code", "K%");

    if (error) {
      console.error("Error fetching person codes:", error);
      const timestamp = Date.now();
      return { code: `K${timestamp}`, codeInt: timestamp };
    }

    let maxNum = 0;
    if (data && data.length > 0) {
      data.forEach((p: any) => {
        if (p.code) {
          const numStr = p.code.replace(/[^0-9]/g, '');
          const num = parseInt(numStr);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }
    
    const nextNum = maxNum + 1;
    return { code: `K${nextNum}` };
  } catch (error) {
    console.error("Generate Person Code Error:", error);
    const timestamp = Date.now();
    return { code: `K${timestamp}` };
  }
}

export async function generateCompanyCode() {
  try {
    const { data, error } = await adminSupabase
      .from("companies")
      .select("code")
      .not("code", "is", null)
      .ilike("code", "O%");

    if (error) {
      console.error("Error fetching company codes:", error);
      const timestamp = Date.now();
      return { code: `O${timestamp}` };
    }

    let maxNum = 0;
    if (data && data.length > 0) {
      data.forEach((c: any) => {
        if (c.code) {
          const numStr = c.code.replace(/[^0-9]/g, '');
          const num = parseInt(numStr);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }
    
    const nextNum = maxNum + 1;
    return { code: `O${nextNum}` };
  } catch (error) {
    console.error("Generate Company Code Error:", error);
    const timestamp = Date.now();
    return { code: `O${timestamp}` };
  }
}
