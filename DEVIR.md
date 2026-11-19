# Davet Sistemi: Devir Belgesi

Bu belge sistemi devralan kişi içindir. Teknik bilgi gerekmez, adımları sırayla izlemeniz yeterli.

> Bu depo herkese açıktır. Şifreleri, TC_SALT değerini ve yedek dosyalarını **asla buraya yazmayın**. Bunlar size ayrıca, özel olarak iletilir.

## 1. Sistem ne yapar?

Kalabalık bir davette (yaklaşık 1000 kişi) davetiye, giriş kontrolü ve hediye çekilişini yönetir.

| Ekran | Adres | Kim kullanır |
|---|---|---|
| Davetiye alma | `/` | Personel. TC kimlik no yazar, QR'lı davetiyesini resim olarak kaydeder |
| Kapı | `/kapi` | Kapı görevlisi. Telefonla QR okutur; davetiyesi olmayanı isimle veya TC ile bulur |
| Yönetim | `/yonetim` | Organizatör. Liste yükleme, canlı durum, raporlar, hediyeler, ayarlar, logolar, yedekleme |
| Çekiliş | `/cekilis` | Projeksiyon ekranı. Sadece girişte okutulanlar arasından çekilir |
| Basılı kartlar | `/yonetim/davetiyeler` | Telefonu olmayanlar için A4'e 8 davetiye basılır |
| Pano afişi | `/yonetim/afis` | QR'lı "Davetiyeni al" afişi |

Kullanılan teknik altyapı: Next.js (Vercel'de çalışır) ve Upstash Redis (ücretsiz veritabanı).

## 2. Devir seçenekleri

### Seçenek A: Kendi hesabınıza kurulum (önerilen)

Sistem tamamen sizin hesabınızda olur, her şeyi siz yönetirsiniz.

1. **Kur:** Aşağıdaki düğmeye basın. GitHub hesabınızla Vercel'e girin. Proje adını bırakın.
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fakerfatih34%2Fgonenli-davet&env=ADMIN_PIN,KAPI_PIN,AUTH_SECRET,TC_SALT&envDescription=Y%C3%B6netim%20ve%20kap%C4%B1%20%C5%9Fifreleri%2C%20oturum%20anahtar%C4%B1%20ve%20TC%20%C3%B6zet%20anahtar%C4%B1&envLink=https%3A%2F%2Fgithub.com%2Fakerfatih34%2Fgonenli-davet%2Fblob%2Fmain%2FDEVIR.md&project-name=gonenli-davet&repository-name=gonenli-davet)
2. **Ayarlar:** Kurulum sizden 4 ayar ister:
   - `ADMIN_PIN`: yönetim ve çekiliş şifresi
   - `KAPI_PIN`: kapı görevlisi şifresi. Yönetim şifresinden farklı olması önerilir; aynı olursa kapı görevlileri de yönetime girebilir.
   - `AUTH_SECRET`: uzun, rastgele bir metin
   - `TC_SALT`: **Eski sistemden veri taşıyacaksanız size iletilen değerin aynısını girin.** Sıfırdan başlıyorsanız uzun, rastgele bir metin girin. Liste yüklendikten sonra bu değeri **değiştirmeyin**, yoksa TC ile davetiye bulma çalışmaz.
3. **Veritabanı:** Vercel'de projeyi açın. **Storage → Create Database → Upstash for Redis → Free** seçip projeye bağlayın. Ön ek (prefix) sorarsa `KV` yazın.
4. **Yeniden yayınla:** **Deployments → … → Redeploy**. Yönetim paneline girdiğinizde sarı uyarı görmüyorsanız kurulum tamamdır.
5. **Veriyi taşı (isteğe bağlı):** Eski sistemin Yönetim → Ayarlar → **Yedek al** dosyasını, yeni sistemde Yönetim → Ayarlar → **Yedekten yükle** ile yükleyin. Davetli listesi, logolar, ayarlar ve hediyeler taşınır. TC_SALT iki sistemde aynıysa TC ile davetiye bulma da çalışmaya devam eder.

> Dikkat: Yeni kurulumun adresi farklı olur. Eski adresle basılmış ya da dağıtılmış davetiyelerin QR kodları yine de yeni sistemde okunur, çünkü kapı ekranı koddaki davetiye numarasına bakar. Ama personele dağıtılan "davetiyeni al" linki ve pano afişi eski adresi gösterir. Afişi yeni sistemden yeniden basın ve yeni linki duyurun.

### Seçenek B: Mevcut kurulumu kullanmaya devam

En basit yol budur. Sistem mevcut hesapta çalışmaya devam eder. Size yalnızca site adresi ve yönetim şifresi verilir; her şeyi Yönetim panelinden yaparsınız. Kodda veya altyapıda değişiklik gerekirse mevcut sahibine başvurursunuz.

## 3. Etkinlik öncesi kontrol listesi

- [ ] Gönenli Süt'ten **TC kimlik numaralı** personel listesi alındı. Boş şablon: Yönetim → Davetliler → "Boş Excel şablonunu indir".
- [ ] Liste Yönetim → Davetliler'den yüklendi ("Mevcut listeyi bununla değiştir").
- [ ] Ayarlar'da tarih, saat ve yer girildi; logolar yerinde.
- [ ] Davetiye linki personelle paylaşıldı, pano afişi asıldı.
- [ ] Telefonu olmayanların davetiyeleri basıldı.
- [ ] Hediyeler girildi (Yönetim → Çekiliş Hediyeleri).
- [ ] **1-2 gün önce deneme yapıldı:** birkaç davetiye okutuldu ve deneme çekilişi yapıldı. Sonra Ayarlar → "Girişleri ve çekilişi sıfırla".
- [ ] Kapı telefonları şarjlı, yedek powerbank hazır. Her telefonda `/kapi` açık ve kapı adı verilmiş.
- [ ] **Telefon erişimi denendi:** Bazı mobil operatörler `vercel.app` adreslerini açmayabilir. Mobil veriyle açılmıyorsa siteyi kendi alan adınıza bağlayın (aşağıya bakın).

## 4. Kendi alan adını bağlama (önerilir)

Örnek: `davet.firmaniz.com`

1. Vercel'de proje → **Settings → Domains → Add** → `davet.firmaniz.com`.
2. Vercel'in gösterdiği DNS kaydını (genelde `CNAME` → `cname.vercel-dns.com`) alan adınızın DNS paneline ekleyin. Cloudflare kullanıyorsanız kayıt "DNS only" (gri bulut) olabilir. Mobil operatör Vercel'in IP adreslerini de engelliyorsa "Proxied" (turuncu bulut) seçin ve Cloudflare'de SSL/TLS ayarını **Full** yapın.
3. Birkaç dakika içinde yeni adres çalışır. Afişi yeniden basın.

## 5. Etkinlik günü

- **Kapı ekranında renkler:** Yeşil = giriş tamam, hediyesini verin. Turuncu = bu davetiye daha önce okutulmuş (saat ve kapı yazar). Kırmızı = geçersiz davetiye.
- **İnternet kesilirse:** Kapı telefonu girişleri kendi hafızasına yazar, bağlantı gelince gönderir.
- **Çekiliş:** `/cekilis` sayfasını projeksiyonda açın. Boşluk tuşu çekilişi başlatır. Kazanan salonda değilse "Salonda yok · Yeniden çek" düğmesine basın.

## 6. Etkinlik sonrası (KVKK)

1. Yönetim'den **Katılım raporu** ve **Çekiliş sonuçları** Excel dosyalarını indirin.
2. Gerekirse **Yedek al** ile yedeği güvenli bir yerde saklayın.
3. Ayarlar → **Her şeyi sil** ile kişisel verileri sistemden kaldırın.

TC kimlik numaraları sistemde açık halde saklanmaz, yalnızca geri çevrilemez özetleri tutulur.

## 7. Teknik notlar (geliştirici için)

- Kod yapısı: `app/` sayfalar ve API, `lib/store.ts` veri katmanı, `lib/import.ts` Excel okuma, `lib/tc.ts` TC doğrulama ve özetleme.
- Yerelde çalıştırma: `npm install && npm run dev`. Upstash ayarları yoksa veriler bellekte tutulur ve kalıcı olmaz.
- Ortam değişkenleri: `ADMIN_PIN`, `KAPI_PIN`, `AUTH_SECRET`, `TC_SALT`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Upstash bağlanınca otomatik eklenir).
