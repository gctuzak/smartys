# Smartys Projesi Kurulum ve Dağıtım Rehberi

Bu belge, Smartys uygulamasını bir sunucu ortamına (örneğin ofis sunucusu) Docker kullanarak kurmak için gerekli adımları içerir.

## 1. Ön Gereksinimler

Sunucuda aşağıdaki yazılımların kurulu olması gerekmektedir:
*   **Docker** ve **Docker Compose** (veya sadece Docker Desktop/Engine)
*   **Git** (Projeyi sunucuya çekmek için)

## 2. Hazırlık Aşaması

Kuruluma başlamadan önce sunucuda proje için bir klasör oluşturun ve gerekli dosyaları hazırlayın.

### Environment (.env) Dosyası
Sunucuda, proje kök dizininde `.env` adında bir dosya oluşturun. Bu dosya gizli anahtarları içereceği için Git'e gönderilmemiştir. Aşağıdaki şablonu kullanabilirsiniz:

```ini
# Supabase Bağlantı Bilgileri
NEXT_PUBLIC_SUPABASE_URL="https://sizin-proje-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sizin-anon-key"
SUPABASE_URL="https://sizin-proje-id.supabase.co"
SUPABASE_ANON_KEY="sizin-anon-key"

# Veritabanı URL (Migration işlemleri için gerekebilir, Transaction Pooler kullanın)
DATABASE_URL="postgresql://postgres.xxx:sifre@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# AI Servisleri (Eğer kullanılıyorsa)
OPENAI_API_KEY="sk-..."

# Güvenlik Ayarları
# Eğer sunucunuzda SSL (HTTPS) yoksa (sadece IP ile bağlanıyorsanız) bu ayarı "true" yapın:
DISABLE_SECURE_COOKIE="true"
```

## 3. Kurulum Adımları

### Adım 1: Projeyi Sunucuya Çekin
Projeyi Git üzerinden veya manuel olarak sunucuya kopyalayın.

```bash
git clone <repo-adresi> smartys
cd smartys
```

### Adım 2: Docker İmajını Oluşturun (Build)
Uygulamayı derleyin ve Docker imajını oluşturun. Bu işlem sunucu hızına göre birkaç dakika sürebilir.

```bash
docker build -t smartys-app .
```

### Adım 3: Dosya Kayıt Klasörünü Hazırlayın
Uygulamaya yüklenen dosyaların (PDF, Excel vb.) sunucu yeniden başlatıldığında silinmemesi için sunucuda kalıcı bir klasör oluşturun.

```bash
mkdir -p uploads/documents
# İzinleri ayarlayın (Docker içindeki kullanıcı yazabilsin diye)
chmod -R 777 uploads
```

### Adım 4: Uygulamayı Başlatın
Aşağıdaki komut ile uygulamayı başlatın.
*   `-d`: Arka planda çalıştırır.
*   `-p 3000:3000`: 3000 portunu dışarı açar.
*   `-v`: Dosya yükleme klasörünü bağlar.
*   `--env-file .env`: Environment dosyasını okur.

```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/uploads/documents:/app/public/documents \
  --restart unless-stopped \
  --name smartys-container \
  smartys-app
```

## 4. Veritabanı Yönetimi

Proje Supabase kullandığı için veritabanı bulutta (Supabase sunucularında) barınmaktadır. Bu nedenle sunucuya ayrıca bir PostgreSQL kurmanıza gerek **yoktur**.

Ancak, veritabanı şemasında değişiklik yaptıysanız (yeni tablolar vb.), bu değişiklikleri uygulamanız gerekir. Bunu en güvenli şekilde **kendi bilgisayarınızdan** (Local) yapmanız önerilir:

1.  Kendi bilgisayarınızda `.env` dosyanızdaki `DATABASE_URL`'in doğru olduğundan emin olun.
2.  Terminalden migration komutunu çalıştırın:
    ```bash
    npm run drizzle:push
    # veya eğer migration dosyaları varsa
    npm run drizzle:migrate
    ```

## 5. Sık Karşılaşılan Sorunlar ve Çözümleri

### Sorun: Giriş Yapamıyorum / Sayfa Yenileniyor
**Sebep:** Sunucunuzda SSL sertifikası (HTTPS) yoksa ve sadece IP adresi (örn: `http://192.168.1.50:3000`) ile bağlanıyorsanız, tarayıcılar "Secure" işaretli çerezleri kaydetmez.
**Çözüm:** `.env` dosyanıza `DISABLE_SECURE_COOKIE="true"` satırını ekleyin ve konteyneri yeniden başlatın.

### Sorun: Dosya Yüklerken Hata Alıyorum
**Sebep:** `uploads` klasörünün izinleri yetersiz olabilir.
**Çözüm:** `chmod -R 777 uploads` komutunu tekrar çalıştırın.

### Sorun: Veritabanı Bağlantı Hatası (IPv6)
**Sebep:** Bazı sunucularda Supabase'e IPv6 üzerinden bağlanmaya çalışırken sorun yaşanabilir.
**Çözüm:** Projenizdeki `Dockerfile` ve `package.json` dosyalarına gerekli `ipv4first` ayarları eklenmiştir. Ekstra bir işlem yapmanıza gerek yoktur.

## 6. Güncelleme (Yeni Versiyon Yükleme)

Uygulamada değişiklik yaptığınızda sunucuyu güncellemek için:

1.  Yeni kodları çekin: `git pull`
2.  İmajı tekrar oluşturun: `docker build -t smartys-app .`
3.  Eski konteyneri durdurun ve silin:
    ```bash
    docker stop smartys-container
    docker rm smartys-container
    ```
4.  Yeni konteyneri başlatın (Adım 4'teki komut ile).