# Gönenli Süt Davet Sistemi: Kurulum ve Kullanım

## Sistemdeki ekranlar

| Adres | Kim kullanır | Ne işe yarar |
|---|---|---|
| `/` (ana sayfa) | Personel | TC kimlik no yazar, davetiyesi resim olarak açılır ve telefona kaydeder |
| `/kapi` | Kapı görevlisi (KAPI_PIN) | Kamera ile QR okutur. Davetiyesi olmayanı isim veya TC ile bulur |
| `/yonetim` | Siz (ADMIN_PIN) | Liste yükleme, canlı durum, raporlar, hediyeler, ayarlar |
| `/yonetim/davetiyeler` | Siz | Basılı davetiye kartları (A4'e 8 kart) |
| `/yonetim/afis` | Siz | Fabrika panosuna asılacak QR'lı afiş |
| `/cekilis` | Siz (projeksiyon) | Hediye çekilişi |

## Vercel'e yükleme (yaklaşık 15 dakika)

1. **GitHub:** github.com'da yeni bir *private* depo açın (örn. `gonenli-davet`) ve bu klasörü oraya yükleyin.
2. **Vercel:** vercel.com'da **Add New → Project** deyip GitHub deposunu seçin ve **Deploy**'a basın.
3. **Veritabanı:** Projede **Storage → Create Database → Upstash (Redis)** seçin ve Free planı projeye bağlayın. Gerekli bağlantı bilgileri kendiliğinden eklenir.
4. **Şifreler:** **Settings → Environment Variables** bölümüne şunları ekleyin:
   - `ADMIN_PIN`: yönetim şifresi (örn. 6 haneli bir sayı)
   - `KAPI_PIN`: kapı görevlilerinin şifresi (farklı bir sayı)
   - `AUTH_SECRET`: uzun, rastgele bir metin
   - `TC_SALT`: uzun, rastgele bir metin. **Liste yüklendikten sonra değiştirmeyin**, yoksa TC ile arama çalışmaz.
5. **Deployments → Redeploy** ile yeniden yayınlayın. Yönetim panelindeki sarı uyarılar kaybolduysa kurulum tamamdır.

> Sistemi başka birine devretmek veya taşımak için: [DEVIR.md](DEVIR.md). Yönetim → Ayarlar → **Yedek al / Yedekten yükle** ile bütün veri taşınabilir.

## Etkinlik öncesi yapılacaklar

1. Gönenli Süt'ten **TC kimlik numaralı** personel listesini isteyin (Yönetim → Davetliler → "Boş Excel şablonunu indir"). Yönetim → Davetliler'den yükleyin.
2. Ayarlar'dan tarih, saat ve yer bilgisini girin.
3. Ana sayfa linkini personel WhatsApp gruplarına gönderin. Afişi fabrika panosuna asın.
4. Telefonu olmayan veya davetiyeyi kendisi almak istemeyenlerin kartlarını Davetiyeler sayfasından basın.
5. **Etkinlikten 1-2 gün önce deneme yapın:** birkaç davetiyeyi okutun ve bir deneme çekilişi yapın. Sonra Ayarlar → "Girişleri ve çekilişi sıfırla".
6. Hediyeleri Yönetim → Çekiliş Hediyeleri'ne girin.

## Etkinlik akşamı

- Her kapı telefonunda `/kapi` sayfasını açın, kapı adını verin (Kapı 1, Kapı 2…) ve "Kamerayı Başlat"a basın.
- Yeşil ekran: giriş tamam, hediyesini verin. Turuncu ekran: bu davetiye daha önce okutulmuş. Kırmızı ekran: geçersiz davetiye.
- İnternet kesilirse telefon girişleri kendi hafızasına yazar ve bağlantı gelince gönderir. Ekranın üstünde "🟠 Çevrimdışı · X bekliyor" yazar.
- Yönetim → Canlı Durum ekranında gelen sayısını anlık izleyin.
- Çekiliş için projeksiyona bağlı bilgisayarda `/cekilis` açın. Boşluk tuşu çekilişi başlatır.

## Etkinlik sonrası

- Yönetim'den **Katılım raporu** ve **Çekiliş sonuçları** Excel dosyalarını indirip Gönenli Süt'e gönderin.
- KVKK için Ayarlar → **Her şeyi sil** ile kişisel verileri silin.
