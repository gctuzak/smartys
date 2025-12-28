
import { getProposalsAction } from "../app/actions/fetch-data";

async function debugFetchAction() {
  try {
    console.log("getProposalsAction testi başlıyor...");
    const result = await getProposalsAction(1, 5, "");
    
    if (result.success) {
      console.log("İşlem Başarılı. İlk 3 kayıt inceleniyor:");
      result.data.slice(0, 3).forEach((p: any, index: number) => {
        console.log(`\n--- Kayıt ${index + 1} ---`);
        console.log("ID:", p.id);
        console.log("proposalNo:", p.proposalNo);
        console.log("totalAmount:", p.totalAmount, typeof p.totalAmount);
        console.log("grandTotal:", p.grandTotal, typeof p.grandTotal);
        console.log("currency:", p.currency);
        
        // Ham objeyi de görelim, belki snake_case alanlar vardır
        console.log("Ham Obje:", JSON.stringify(p));
      });
    } else {
      console.error("İşlem Başarısız:", result.error);
    }
  } catch (error) {
    console.error("Test Hatası:", error);
  } finally {
    process.exit();
  }
}

debugFetchAction();
