# SmartProposal (Next.js + Supabase)

AI destekli teklif oluşturma uygulaması.

## Özellikler
- Excel yükleme ve AI ile teklif kalemlerinin çıkarılması
- Supabase ile şirket/kişi/teklif veri yönetimi
- Doküman (Excel/PDF) yükleme ve ilişkilendirme
- Tailwind ve modern UI bileşenleri

## Kurulum
1. Depoyu klonlayın
2. `.env.local` içine ortam değişkenlerini ekleyin:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `OPENAI_API_KEY` (opsiyonel, AI parse için)
3. Gerekli paketleri kurun: `npm install`
4. Geliştirme sunucusunu başlatın: `npm run dev`

## Migrasyonlar
Supabase SQL Editor ile `db/migrations` klasöründeki dosyaları sırayla uygulayın:
- `001_create_products.sql`
- `002_update_products.sql`
- `003_update_currency_default.sql`
- `004_add_proposal_no.sql`
- `005_create_documents.sql`

## Notlar
- `public/documents/` klasörü repoya dahil değildir (dosya yüklemeleri için yerel depolama). Production için Supabase Storage önerilir.
- `.env*` dosyaları repoda yoktur, gizli anahtarlar commit edilmez.
