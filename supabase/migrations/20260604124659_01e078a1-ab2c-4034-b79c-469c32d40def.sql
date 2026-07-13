
-- Wipe existing categories (products.category_id ON DELETE SET NULL)
DELETE FROM public.categories;

-- Helper function: insert root and return id
CREATE OR REPLACE FUNCTION pg_temp.add_root(_name text, _slug text, _icon text, _sort int)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id)
  VALUES (_name, _slug, _icon, _sort, NULL) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.add_child(_parent uuid, _name text, _slug text, _sort int)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id)
  VALUES (_name, _slug, NULL, _sort, _parent) RETURNING id INTO _id;
  RETURN _id;
END $$;

DO $$
DECLARE
  r_elek uuid; r_qadin uuid; r_kisi uuid; r_usaq uuid; r_ayaq uuid;
  r_gozel uuid; r_ev uuid; r_metbex uuid; r_tekstil uuid; r_avto uuid;
  r_tikinti uuid; r_bag uuid; r_idman uuid; r_heyv uuid; r_kitab uuid;
  r_super uuid; r_saglam uuid; r_hediyye uuid; r_zerg uuid; r_oyun uuid;
  s_mobil uuid; s_aks uuid; s_komp uuid; s_tv uuid;
BEGIN
  -- 1. Elektronika
  r_elek := pg_temp.add_root('📱 Elektronika','elektronika','📱',1);
    s_mobil := pg_temp.add_child(r_elek,'Mobil telefonlar','mobil-telefonlar',1);
      PERFORM pg_temp.add_child(s_mobil,'Apple','apple',1);
      PERFORM pg_temp.add_child(s_mobil,'Samsung','samsung',2);
      PERFORM pg_temp.add_child(s_mobil,'Xiaomi','xiaomi',3);
      PERFORM pg_temp.add_child(s_mobil,'Huawei','huawei',4);
      PERFORM pg_temp.add_child(s_mobil,'Oppo','oppo',5);
      PERFORM pg_temp.add_child(s_mobil,'Vivo','vivo',6);
      PERFORM pg_temp.add_child(s_mobil,'Realme','realme',7);
    s_aks := pg_temp.add_child(r_elek,'Telefon aksesuarları','telefon-aksesuarlari',2);
      PERFORM pg_temp.add_child(s_aks,'Kabellər','kabeller',1);
      PERFORM pg_temp.add_child(s_aks,'Adapterlər','adapterler',2);
      PERFORM pg_temp.add_child(s_aks,'Powerbanklar','powerbanklar',3);
      PERFORM pg_temp.add_child(s_aks,'Qulaqlıqlar','qulaqliqlar',4);
      PERFORM pg_temp.add_child(s_aks,'Qoruyucu şüşələr','qoruyucu-suseler',5);
      PERFORM pg_temp.add_child(s_aks,'Telefon qabları','telefon-qablari',6);
    s_komp := pg_temp.add_child(r_elek,'Kompüterlər','komputerler',3);
      PERFORM pg_temp.add_child(s_komp,'Noutbuklar','noutbuklar',1);
      PERFORM pg_temp.add_child(s_komp,'Stolüstü kompüterlər','stolustu-komputerler',2);
      PERFORM pg_temp.add_child(s_komp,'Monitorlar','monitorlar',3);
      PERFORM pg_temp.add_child(s_komp,'Klaviaturalar','klaviaturalar',4);
      PERFORM pg_temp.add_child(s_komp,'Mauslar','mauslar',5);
      PERFORM pg_temp.add_child(s_komp,'SSD','ssd',6);
      PERFORM pg_temp.add_child(s_komp,'HDD','hdd',7);
      PERFORM pg_temp.add_child(s_komp,'RAM','ram',8);
    s_tv := pg_temp.add_child(r_elek,'TV və Audio','tv-ve-audio',4);
      PERFORM pg_temp.add_child(s_tv,'Smart TV','smart-tv',1);
      PERFORM pg_temp.add_child(s_tv,'Android TV Box','android-tv-box',2);
      PERFORM pg_temp.add_child(s_tv,'Səsgücləndiricilər','sesgucendiriciler',3);
      PERFORM pg_temp.add_child(s_tv,'Soundbar','soundbar',4);
      PERFORM pg_temp.add_child(s_tv,'Mikrofonlar','mikrofonlar',5);

  -- 2. Qadın Geyimləri
  r_qadin := pg_temp.add_root('👗 Qadın Geyimləri','qadin-geyimleri','👗',2);
    PERFORM pg_temp.add_child(r_qadin,'Donlar','qadin-donlar',1);
    PERFORM pg_temp.add_child(r_qadin,'Köynəklər','qadin-koynekler',2);
    PERFORM pg_temp.add_child(r_qadin,'Şalvarlar','qadin-salvarlar',3);
    PERFORM pg_temp.add_child(r_qadin,'Ətəklər','qadin-etekler',4);
    PERFORM pg_temp.add_child(r_qadin,'Gödəkçələr','qadin-godekceler',5);
    PERFORM pg_temp.add_child(r_qadin,'Paltolar','qadin-paltolar',6);
    PERFORM pg_temp.add_child(r_qadin,'İdman geyimləri','qadin-idman',7);
    PERFORM pg_temp.add_child(r_qadin,'Hicab geyimləri','qadin-hicab',8);
    PERFORM pg_temp.add_child(r_qadin,'Alt paltarları','qadin-alt-paltarlari',9);
    PERFORM pg_temp.add_child(r_qadin,'Corablar','qadin-corablar',10);

  -- 3. Kişi Geyimləri
  r_kisi := pg_temp.add_root('👔 Kişi Geyimləri','kisi-geyimleri','👔',3);
    PERFORM pg_temp.add_child(r_kisi,'Köynəklər','kisi-koynekler',1);
    PERFORM pg_temp.add_child(r_kisi,'T-shirtlər','kisi-tshirtler',2);
    PERFORM pg_temp.add_child(r_kisi,'Şalvarlar','kisi-salvarlar',3);
    PERFORM pg_temp.add_child(r_kisi,'Cinslər','kisi-cinsler',4);
    PERFORM pg_temp.add_child(r_kisi,'Kostyumlar','kisi-kostyumlar',5);
    PERFORM pg_temp.add_child(r_kisi,'Gödəkçələr','kisi-godekceler',6);
    PERFORM pg_temp.add_child(r_kisi,'Paltolar','kisi-paltolar',7);
    PERFORM pg_temp.add_child(r_kisi,'Alt paltarları','kisi-alt-paltarlari',8);

  -- 4. Uşaq Dünyası
  r_usaq := pg_temp.add_root('👶 Uşaq Dünyası','usaq-dunyasi','👶',4);
    PERFORM pg_temp.add_child(r_usaq,'Körpə geyimləri','korpe-geyimleri',1);
    PERFORM pg_temp.add_child(r_usaq,'Uşaq geyimləri','usaq-geyimleri',2);
    PERFORM pg_temp.add_child(r_usaq,'Oyuncaqlar','oyuncaqlar',3);
    PERFORM pg_temp.add_child(r_usaq,'Lego','lego',4);
    PERFORM pg_temp.add_child(r_usaq,'Məktəb çantaları','mekteb-cantalari',5);
    PERFORM pg_temp.add_child(r_usaq,'Uşaq arabaları','usaq-arabalari',6);
    PERFORM pg_temp.add_child(r_usaq,'Uşaq mebeli','usaq-mebeli',7);

  -- 5. Ayaqqabı
  r_ayaq := pg_temp.add_root('👟 Ayaqqabı','ayaqqabi','👟',5);
    PERFORM pg_temp.add_child(r_ayaq,'Qadın ayaqqabıları','qadin-ayaqqabilari',1);
    PERFORM pg_temp.add_child(r_ayaq,'Kişi ayaqqabıları','kisi-ayaqqabilari',2);
    PERFORM pg_temp.add_child(r_ayaq,'Uşaq ayaqqabıları','usaq-ayaqqabilari',3);
    PERFORM pg_temp.add_child(r_ayaq,'İdman ayaqqabıları','idman-ayaqqabilari',4);
    PERFORM pg_temp.add_child(r_ayaq,'Botlar','botlar',5);
    PERFORM pg_temp.add_child(r_ayaq,'Sandallar','sandallar',6);
    PERFORM pg_temp.add_child(r_ayaq,'Ev ayaqqabıları','ev-ayaqqabilari',7);

  -- 6. Gözəllik və Baxım
  r_gozel := pg_temp.add_root('💄 Gözəllik və Baxım','gozellik-ve-baxim','💄',6);
    PERFORM pg_temp.add_child(r_gozel,'Ətirlər','etirler',1);
    PERFORM pg_temp.add_child(r_gozel,'Makiyaj','makiyaj',2);
    PERFORM pg_temp.add_child(r_gozel,'Üz baxımı','uz-baximi',3);
    PERFORM pg_temp.add_child(r_gozel,'Bədən baxımı','beden-baximi',4);
    PERFORM pg_temp.add_child(r_gozel,'Saç baxımı','sac-baximi',5);
    PERFORM pg_temp.add_child(r_gozel,'Dırnaq məhsulları','dirnaq-mehsullari',6);
    PERFORM pg_temp.add_child(r_gozel,'Elektrikli baxım cihazları','elektrikli-baxim-cihazlari',7);

  -- 7. Ev və Yaşam
  r_ev := pg_temp.add_root('🏠 Ev və Yaşam','ev-ve-yasam','🏠',7);
    PERFORM pg_temp.add_child(r_ev,'Divanlar','divanlar',1);
    PERFORM pg_temp.add_child(r_ev,'Kreslolar','kreslolar',2);
    PERFORM pg_temp.add_child(r_ev,'Masalar','masalar',3);
    PERFORM pg_temp.add_child(r_ev,'Stullar','stullar',4);
    PERFORM pg_temp.add_child(r_ev,'Şkaflar','skaflar',5);
    PERFORM pg_temp.add_child(r_ev,'Yataqlar','yataqlar',6);
    PERFORM pg_temp.add_child(r_ev,'Mətbəx mebeli','metbex-mebeli',7);
    PERFORM pg_temp.add_child(r_ev,'Hamam məhsulları','hamam-mehsullari',8);
    PERFORM pg_temp.add_child(r_ev,'Dekor','dekor',9);

  -- 8. Mətbəx
  r_metbex := pg_temp.add_root('🍽️ Mətbəx','metbex','🍽️',8);
    PERFORM pg_temp.add_child(r_metbex,'Qazanlar','qazanlar',1);
    PERFORM pg_temp.add_child(r_metbex,'Tavalar','tavalar',2);
    PERFORM pg_temp.add_child(r_metbex,'Çayniklər','cayniker',3);
    PERFORM pg_temp.add_child(r_metbex,'Blenderlər','blenderler',4);
    PERFORM pg_temp.add_child(r_metbex,'Mikserlər','mikserler',5);
    PERFORM pg_temp.add_child(r_metbex,'Qəhvə aparatları','qehve-aparatlari',6);
    PERFORM pg_temp.add_child(r_metbex,'Hava fritözləri','hava-fritozleri',7);
    PERFORM pg_temp.add_child(r_metbex,'Mikrodalğalı sobalar','mikrodalgali-sobalar',8);

  -- 9. Ev Tekstili
  r_tekstil := pg_temp.add_root('🛏️ Ev Tekstili','ev-tekstili','🛏️',9);
    PERFORM pg_temp.add_child(r_tekstil,'Yataq dəstləri','yataq-destleri',1);
    PERFORM pg_temp.add_child(r_tekstil,'Ədyallar','edyallar',2);
    PERFORM pg_temp.add_child(r_tekstil,'Yastıqlar','yastiqlar',3);
    PERFORM pg_temp.add_child(r_tekstil,'Döşəklər','dosekler',4);
    PERFORM pg_temp.add_child(r_tekstil,'Dəsmallar','desmallar',5);
    PERFORM pg_temp.add_child(r_tekstil,'Pərdələr','perdeler',6);

  -- 10. Avtomobil
  r_avto := pg_temp.add_root('🚗 Avtomobil','avtomobil','🚗',10);
    PERFORM pg_temp.add_child(r_avto,'Mühərrik yağları','muherrik-yaglari',1);
    PERFORM pg_temp.add_child(r_avto,'Filtrlər','filtrler',2);
    PERFORM pg_temp.add_child(r_avto,'Şinlər','sinler',3);
    PERFORM pg_temp.add_child(r_avto,'Akkumulyatorlar','akkumulyatorlar',4);
    PERFORM pg_temp.add_child(r_avto,'Avtomobil aksesuarları','avto-aksesuarlari',5);
    PERFORM pg_temp.add_child(r_avto,'Multimedia sistemləri','multimedia-sistemleri',6);

  -- 11. Tikinti və Təmir
  r_tikinti := pg_temp.add_root('🛠️ Tikinti və Təmir','tikinti-ve-temir','🛠️',11);
    PERFORM pg_temp.add_child(r_tikinti,'Elektrik məhsulları','elektrik-mehsullari',1);
    PERFORM pg_temp.add_child(r_tikinti,'Santexnika','santexnika',2);
    PERFORM pg_temp.add_child(r_tikinti,'Boyalar','boyalar',3);
    PERFORM pg_temp.add_child(r_tikinti,'Alətlər','aletler',4);
    PERFORM pg_temp.add_child(r_tikinti,'Qapılar','qapilar',5);
    PERFORM pg_temp.add_child(r_tikinti,'Kilidlər','kilidler',6);
    PERFORM pg_temp.add_child(r_tikinti,'Kafel','kafel',7);
    PERFORM pg_temp.add_child(r_tikinti,'Laminat','laminat',8);

  -- 12. Bağ və Həyət
  r_bag := pg_temp.add_root('🌳 Bağ və Həyət','bag-ve-heyet','🌳',12);
    PERFORM pg_temp.add_child(r_bag,'Çəmən məhsulları','cemen-mehsullari',1);
    PERFORM pg_temp.add_child(r_bag,'Toxumlar','toxumlar',2);
    PERFORM pg_temp.add_child(r_bag,'Gübrələr','gubreler',3);
    PERFORM pg_temp.add_child(r_bag,'Bağ mebeli','bag-mebeli',4);
    PERFORM pg_temp.add_child(r_bag,'Manqallar','manqallar',5);

  -- 13. İdman
  r_idman := pg_temp.add_root('🏃 İdman','idman','🏃',13);
    PERFORM pg_temp.add_child(r_idman,'Qaçış avadanlıqları','qacis-avadanliqlari',1);
    PERFORM pg_temp.add_child(r_idman,'Fitness məhsulları','fitness-mehsullari',2);
    PERFORM pg_temp.add_child(r_idman,'Velosipedlər','velosipedler',3);
    PERFORM pg_temp.add_child(r_idman,'Futbol','futbol',4);
    PERFORM pg_temp.add_child(r_idman,'Basketbol','basketbol',5);
    PERFORM pg_temp.add_child(r_idman,'Üzgüçülük','uzguculuk',6);
    PERFORM pg_temp.add_child(r_idman,'Kampinq','kampinq',7);

  -- 14. Heyvanlar
  r_heyv := pg_temp.add_root('🐶 Heyvanlar','heyvanlar','🐶',14);
    PERFORM pg_temp.add_child(r_heyv,'İt yemləri','it-yemleri',1);
    PERFORM pg_temp.add_child(r_heyv,'Pişik yemləri','pisik-yemleri',2);
    PERFORM pg_temp.add_child(r_heyv,'Akvariumlar','akvariumlar',3);
    PERFORM pg_temp.add_child(r_heyv,'Heyvan oyuncaqları','heyvan-oyuncaqlari',4);
    PERFORM pg_temp.add_child(r_heyv,'Qəfəslər','qefesler',5);

  -- 15. Kitablar və Ofis
  r_kitab := pg_temp.add_root('📚 Kitablar və Ofis','kitablar-ve-ofis','📚',15);
    PERFORM pg_temp.add_child(r_kitab,'Bədii kitablar','bedii-kitablar',1);
    PERFORM pg_temp.add_child(r_kitab,'Dərsliklər','dersikler',2);
    PERFORM pg_temp.add_child(r_kitab,'Dəftərlər','defterler',3);
    PERFORM pg_temp.add_child(r_kitab,'Qələmlər','qelemler',4);
    PERFORM pg_temp.add_child(r_kitab,'Printer kağızları','printer-kagizlari',5);

  -- 16. Supermarket
  r_super := pg_temp.add_root('🍫 Supermarket','supermarket','🍫',16);
    PERFORM pg_temp.add_child(r_super,'Çay','cay',1);
    PERFORM pg_temp.add_child(r_super,'Qəhvə','qehve',2);
    PERFORM pg_temp.add_child(r_super,'Şokolad','sokolad',3);
    PERFORM pg_temp.add_child(r_super,'Peçenye','pecenye',4);
    PERFORM pg_temp.add_child(r_super,'Uşaq qidaları','usaq-qidalari',5);
    PERFORM pg_temp.add_child(r_super,'Konservlər','konservler',6);
    PERFORM pg_temp.add_child(r_super,'İçkilər','ickiler',7);

  -- 17. Sağlamlıq
  r_saglam := pg_temp.add_root('💊 Sağlamlıq','saglamliq','💊',17);
    PERFORM pg_temp.add_child(r_saglam,'Vitaminlər','vitaminler',1);
    PERFORM pg_temp.add_child(r_saglam,'Tibbi cihazlar','tibbi-cihazlar',2);
    PERFORM pg_temp.add_child(r_saglam,'Termometrlər','termometrler',3);
    PERFORM pg_temp.add_child(r_saglam,'Tonometrlər','tonometrler',4);
    PERFORM pg_temp.add_child(r_saglam,'Gigiyena məhsulları','gigiyena-mehsullari',5);

  -- 18. Hədiyyələr
  r_hediyye := pg_temp.add_root('🎁 Hədiyyələr','hediyyeler','🎁',18);
    PERFORM pg_temp.add_child(r_hediyye,'Suvenirlər','suvenirler',1);
    PERFORM pg_temp.add_child(r_hediyye,'Bayram məhsulları','bayram-mehsullari',2);
    PERFORM pg_temp.add_child(r_hediyye,'Hədiyyə qutuları','hediyye-qutulari',3);
    PERFORM pg_temp.add_child(r_hediyye,'Güllər','guller',4);

  -- 19. Zərgərlik
  r_zerg := pg_temp.add_root('💍 Zərgərlik','zergerlik','💍',19);
    PERFORM pg_temp.add_child(r_zerg,'Üzüklər','uzukler',1);
    PERFORM pg_temp.add_child(r_zerg,'Boyunbağılar','boyunbagilar',2);
    PERFORM pg_temp.add_child(r_zerg,'Qolbaqlar','qolbaqlar',3);
    PERFORM pg_temp.add_child(r_zerg,'Sırğalar','sirgalar',4);
    PERFORM pg_temp.add_child(r_zerg,'Saatlar','saatlar',5);

  -- 20. Oyun və Hobi
  r_oyun := pg_temp.add_root('🎮 Oyun və Hobi','oyun-ve-hobi','🎮',20);
    PERFORM pg_temp.add_child(r_oyun,'PlayStation oyunları','playstation-oyunlari',1);
    PERFORM pg_temp.add_child(r_oyun,'Xbox oyunları','xbox-oyunlari',2);
    PERFORM pg_temp.add_child(r_oyun,'Stolüstü oyunlar','stolustu-oyunlar',3);
    PERFORM pg_temp.add_child(r_oyun,'Radio idarəli modellər','radio-idareli-modeller',4);
    PERFORM pg_temp.add_child(r_oyun,'Musiqi alətləri','musiqi-aletleri',5);
END $$;
