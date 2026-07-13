
-- Wipe and rebuild categories (Wildberries-style, ~200 entries)
DELETE FROM public.categories;

CREATE OR REPLACE FUNCTION pg_temp.mk_slug(_name text) RETURNS text AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(translate(_name,
        'əƏıİöÖüÜçÇşŞğĞ',
        'eEiIoOuUcCsSgG')),
      '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g')
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.add_root(_name text, _icon text, _sort int)
RETURNS TABLE(id uuid, slug text) AS $$
DECLARE _id uuid; _slug text;
BEGIN
  _slug := pg_temp.mk_slug(_name);
  INSERT INTO public.categories(name, slug, icon, parent_id, sort_order)
  VALUES (_name, _slug, _icon, NULL, _sort) RETURNING categories.id INTO _id;
  RETURN QUERY SELECT _id, _slug;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.add_child(_parent_id uuid, _parent_slug text, _name text, _sort int)
RETURNS TABLE(id uuid, slug text) AS $$
DECLARE _id uuid; _slug text;
BEGIN
  _slug := _parent_slug || '-' || pg_temp.mk_slug(_name);
  INSERT INTO public.categories(name, slug, icon, parent_id, sort_order)
  VALUES (_name, _slug, NULL, _parent_id, _sort) RETURNING categories.id INTO _id;
  RETURN QUERY SELECT _id, _slug;
END $$ LANGUAGE plpgsql;

DO $$
DECLARE
  r record; c record;
BEGIN
  -- 1. ELEKTRONIKA
  SELECT * INTO r FROM pg_temp.add_root('Elektronika','📱',1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Smartfonlar', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Telefon aksesuarları', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Noutbuklar', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Planşetlər', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Stolüstü kompüterlər', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Monitorlar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Klaviatura və mauslar', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yaddaş və disklər', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Printerlər və skanerlər', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şəbəkə avadanlığı', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Televizorlar', 11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Audio sistemlər', 12);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qulaqlıqlar', 13);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kamera və fotoaparatlar', 14);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Smart saatlar', 15);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Oyun konsolları', 16);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Powerbanklar', 17);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kabellər və adapterlər', 18);

  -- 2. QADIN GEYIMLƏRI
  SELECT * INTO r FROM pg_temp.add_root('Qadın geyimləri','👗',2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Donlar', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bluzlar və köynəklər', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yubkalar', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şalvarlar', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Cinslər', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pencəklər', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Paltolar və kürklər', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Trikotaj', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Alt paltarları', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pijamalar', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İdman geyimləri', 11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çimərlik geyimləri', 12);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Hicab geyimləri', 13);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Hamilə geyimləri', 14);

  -- 3. KIŞI GEYIMLƏRI
  SELECT * INTO r FROM pg_temp.add_root('Kişi geyimləri','👔',3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Köynəklər', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Futbolkalar', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şalvarlar', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Cinslər', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şortlar', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kostyumlar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pencəklər', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Paltolar və gödəkçələr', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Trikotaj', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Alt paltarları', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İdman geyimləri', 11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çimərlik geyimləri', 12);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İş geyimləri', 13);

  -- 4. UŞAQ VƏ KÖRPƏ
  SELECT * INTO r FROM pg_temp.add_root('Uşaq və körpə','👶',4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Körpə geyimləri', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq geyimləri', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq ayaqqabıları', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Oyuncaqlar', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Konstruktorlar', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Körpə arabaları', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Avtokresloları', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq qidaları', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pampers və gigiyena', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Məktəbli ləvazimatları', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq mebeli', 11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Velosiped və samokat', 12);

  -- 5. AYAQQABI
  SELECT * INTO r FROM pg_temp.add_root('Ayaqqabı','👟',5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qadın ayaqqabıları', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kişi ayaqqabıları', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq ayaqqabıları', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İdman ayaqqabıları', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Krossovkalar', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çəkmələr', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Sandallar', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Klassik ayaqqabılar', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ev ayaqqabıları', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Rezin çəkmələr', 10);

  -- 6. GÖZƏLLIK
  SELECT * INTO r FROM pg_temp.add_root('Gözəllik və baxım','💄',6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Dekorativ kosmetika', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Üz baxımı', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Saç baxımı', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bədən baxımı', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ətirlər', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Manikür və pedikür', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kişi baxımı', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Saç qurutma və düzəltmə', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Epilyasiya cihazları', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ağız gigiyenası', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Professional vasitələr', 11);

  -- 7. EV VƏ MƏTBƏX
  SELECT * INTO r FROM pg_temp.add_root('Ev və mətbəx','🏠',7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qab-qacaq', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çəngəl-bıçaq dəstləri', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Tavalar və qazanlar', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bıçaqlar', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kiçik məişət texnikası', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Böyük məişət texnikası', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Tozsoranlar', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ütülər', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Mətbəx aksesuarları', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Saxlama qabları', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Mebel', 11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İşıqlandırma', 12);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Dekor məhsulları', 13);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Təmizlik vasitələri', 14);

  -- 8. EV TEKSTILI
  SELECT * INTO r FROM pg_temp.add_root('Ev tekstili','🛏️',8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yataq dəstləri', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yorğan və yastıqlar', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Adyallar və pledlər', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Dəsmal və hamam dəstləri', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pərdələr', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Xalçalar və xalı', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Süfrələr', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Divan örtükləri', 8);

  -- 9. AVTOMOBIL
  SELECT * INTO r FROM pg_temp.add_root('Avtomobil','🚗',9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Avtomobil aksesuarları', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yağ və mayelər', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şinlər və disklər', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ehtiyat hissələri', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Avtomobil kimyası', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Salon aksesuarları', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Avtomobil alətləri', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Videoqeydiyyatçılar', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Avtomobil səs sistemləri', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Motosiklet aksesuarları', 10);

  -- 10. TIKINTI VƏ TƏMIR
  SELECT * INTO r FROM pg_temp.add_root('Tikinti və təmir','🔧',10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Əl alətləri', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Elektrik alətləri', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ölçü cihazları', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Santexnika', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Elektrik materialları', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Boya və laklar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Tikinti materialları', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qapı və qıfıllar', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Döşəmə materialları', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Divar kağızları', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İş geyimləri və qoruyucu', 11);

  -- 11. BAĞ VƏ HƏYƏT
  SELECT * INTO r FROM pg_temp.add_root('Bağ və həyət','🌳',11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bağ alətləri', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Toxumlar və soğanaqlar', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bitkilər və güllər', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Gübrələr', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Suvarma sistemləri', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bağ mebeli', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Mangal və barbekü', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Hovuzlar', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çəmən biçən', 9);

  -- 12. IDMAN
  SELECT * INTO r FROM pg_temp.add_root('İdman və istirahət','⚽',12);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Fitness ləvazimatları', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Trenajorlar', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Velosipedlər', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Samokatlar', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Komanda idmanı', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Üzgüçülük', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Turizm və kemping', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ovçuluq və balıqçılıq', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qış idmanı', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Döyüş idmanı', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yoga və pilates', 11);

  -- 13. HEYVAN MƏHSULLARI
  SELECT * INTO r FROM pg_temp.add_root('Heyvan məhsulları','🐕',13);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İt yemləri', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pişik yemləri', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Quş yemləri', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Akvarium ləvazimatları', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Heyvan aksesuarları', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qəfəs və daşıyıcılar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Gigiyena vasitələri', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Oyuncaqlar', 8);

  -- 14. KITAB VƏ OFIS
  SELECT * INTO r FROM pg_temp.add_root('Kitablar və ofis','📚',14);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bədii ədəbiyyat', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq kitabları', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Dərsliklər', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İş və biznes', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Dəftərxana ləvazimatları', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yazı vasitələri', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kağız məhsulları', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ofis mebeli', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Printer kağızları', 9);

  -- 15. ƏRZAQ
  SELECT * INTO r FROM pg_temp.add_root('Ərzaq məhsulları','🛒',15);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çay və qəhvə', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şirniyyat', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şokolad', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Peçenye və vafli', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Konservlər', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İçkilər', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq qidaları', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Quru meyvə və qoz', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Ədviyyatlar', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Sağlam qidalanma', 10);

  -- 16. SAĞLAMLIQ
  SELECT * INTO r FROM pg_temp.add_root('Sağlamlıq','💊',16);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Vitaminlər', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'BAƏ və bioloji aktiv', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Tibbi cihazlar', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Tonometrlər', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Termometrlər', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İnhalyatorlar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bandaj və ortez', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Gigiyena məhsulları', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'İlk yardım', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Optika və eynəklər', 10);

  -- 17. HƏDIYYƏ
  SELECT * INTO r FROM pg_temp.add_root('Hədiyyə və suvenir','🎁',17);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Hədiyyə dəstləri', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Hədiyyə qutuları', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Suvenirlər', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bayram məhsulları', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Yeni il məhsulları', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şarlar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Süni güllər', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Açarlıqlar', 8);

  -- 18. ZƏRGƏRLIK VƏ SAATLAR
  SELECT * INTO r FROM pg_temp.add_root('Zərgərlik və saatlar','💍',18);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Üzüklər', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Boyunbağılar', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Sırğalar', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qolbaqlar', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kişi saatları', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qadın saatları', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Uşaq saatları', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bijuteriya', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qızıl məmulatlar', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Gümüş məmulatlar', 10);

  -- 19. OYUN VƏ HOBBI
  SELECT * INTO r FROM pg_temp.add_root('Oyun və hobbi','🎮',19);
    PERFORM pg_temp.add_child(r.id, r.slug, 'PlayStation oyunları', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Xbox oyunları', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Nintendo oyunları', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'PC oyunları', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Stolüstü oyunlar', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pazllar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Radioidarəli modellər', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Musiqi alətləri', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Əl işi və yaradıcılıq', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kolleksiya', 10);

  -- 20. ÇANTALAR VƏ AKSESUAR
  SELECT * INTO r FROM pg_temp.add_root('Çantalar və aksesuarlar','🧳',20);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Qadın çantaları', 1);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kişi çantaları', 2);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Bel çantaları', 3);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çiyin çantaları', 4);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Səyahət çantaları', 5);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çamadanlar', 6);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Pulqabılar', 7);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Kəmərlər', 8);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Şərflər və şallar', 9);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Papaqlar', 10);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Eynəklər', 11);
    PERFORM pg_temp.add_child(r.id, r.slug, 'Çətirlər', 12);
END $$;
