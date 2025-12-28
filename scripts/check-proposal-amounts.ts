
import { db } from "../db";
import { proposals, proposalItems } from "../db/schema";
import { eq, sql } from "drizzle-orm";

async function checkProposalAmounts() {
  try {
    console.log("Teklif tutarları kontrol ediliyor...");

    // 1. Örnek teklifleri getir (son 10)
    const recentProposals = await db.select({
      id: proposals.id,
      proposalNo: proposals.proposalNo,
      totalAmount: proposals.totalAmount,
      vatAmount: proposals.vatAmount,
      grandTotal: proposals.grandTotal,
      currency: proposals.currency,
      createdAt: proposals.createdAt
    })
    .from(proposals)
    .orderBy(sql`${proposals.createdAt} DESC`)
    .limit(10);

    console.log("\nSon 10 Teklif:");
    console.table(recentProposals);

    // 2. Birkaç teklif için kalemlerin toplamını hesapla ve karşılaştır
    console.log("\nDetaylı İnceleme (Kalem Toplamları):");
    
    for (const proposal of recentProposals) {
      const items = await db.select({
        totalPrice: proposalItems.totalPrice
      })
      .from(proposalItems)
      .where(eq(proposalItems.proposalId, proposal.id));

      const calculatedTotal = items.reduce((sum, item) => {
        return sum + (Number(item.totalPrice) || 0);
      }, 0);

      console.log(`\nTeklif No: ${proposal.proposalNo}`);
      console.log(`Kayıtlı Toplam: ${proposal.totalAmount} (Tip: ${typeof proposal.totalAmount})`);
      console.log(`Kayıtlı KDV: ${proposal.vatAmount}`);
      console.log(`Kayıtlı Genel Toplam: ${proposal.grandTotal}`);
      console.log(`Hesaplanan Kalem Toplamı: ${calculatedTotal.toFixed(2)}`);
      
      const diff = Math.abs((Number(proposal.totalAmount) || 0) - calculatedTotal);
      if (diff > 0.01) {
        console.log(`⚠️ FARK VAR: ${diff.toFixed(2)}`);
      } else {
        console.log("✅ Tutarlar Uyuşuyor");
      }
    }

  } catch (error) {
    console.error("Hata:", error);
  } finally {
    process.exit();
  }
}

checkProposalAmounts();
