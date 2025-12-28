'use server'

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function debugUserStatus() {
  const session = await getSession();
  if (!session) {
    return { 
      auth: null,
      message: "Oturum açılmamış."
    };
  }

  const authId = session.userId;
  
  // 1. Get Auth User Email (we might need to use admin client if session doesn't have email)
  // But usually session doesn't store email, only ID.
  // We can try to fetch from users table if it exists.
  
  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .eq('id', authId)
    .single();

  // 2. Find who owns the most companies
  // We can't use groupBy easily with supabase-js, so we'll fetch a sample
  const { data: companies } = await supabase
    .from('companies')
    .select('representative_id')
    .limit(500);

  let topOwnerId = null;
  let topOwnerCount = 0;

  if (companies) {
      const counts: Record<string, number> = {};
      companies.forEach(c => {
          if (c.representative_id) {
              counts[c.representative_id] = (counts[c.representative_id] || 0) + 1;
          }
      });
      
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
          topOwnerId = sorted[0][0];
          topOwnerCount = sorted[0][1];
      }
  }

  let topOwnerEmail = "Bilinmiyor";
  if (topOwnerId) {
      const { data: owner } = await supabase
          .from('users')
          .select('email')
          .eq('id', topOwnerId)
          .single();
      if (owner) {
          topOwnerEmail = owner.email;
      }
  }

  return {
      auth: {
          id: authId,
          email: userRecord?.email || "Email database'de yok",
          existsInDb: !!userRecord
      },
      dataOwner: {
          id: topOwnerId,
          email: topOwnerEmail,
          count: topOwnerCount
      },
      mismatch: authId !== topOwnerId
  };
}
