
-- Wipe old category tree (products.category_id becomes NULL via ON DELETE SET NULL)
DELETE FROM public.categories;

DO $$
DECLARE
  v_root uuid;
BEGIN
  -- 1) Elektronika
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Elektronika', 'elektronika', '📱', 1) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Smartfonlar', 'el-smartfon', '📱', 1, v_root),
    ('Telefon aksesuarları', 'el-tel-aks', '🔌', 2, v_root),
    ('Noutbuklar', 'el-noutbuk', '💻', 3, v_root),
    ('Kompüterlər', 'el-kompyuter', '🖥️', 4, v_root),
    ('Monitorlar', 'el-monitor', '🖥️', 5, v_root),
    ('Printerlər', 'el-printer', '🖨️', 6, v_root),
    ('Smart saatlar', 'el-smart-saat', '⌚', 7, v_root),
    ('Planşetlər', 'el-planset', '📲', 8, v_root),
    ('Oyun konsolları', 'el-konsol', '🎮', 9, v_root),
    ('Televizorlar', 'el-tv', '📺', 10, v_root),
    ('Audio sistemlər', 'el-audio', '🔊', 11, v_root),
    ('Kamera və fotoaparatlar', 'el-kamera', '📷', 12, v_root);

  -- 2) Geyim
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Geyim', 'geyim', '👗', 2) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Qadın geyimləri', 'gey-qadin', '👚', 1, v_root),
    ('Kişi geyimləri', 'gey-kisi', '👔', 2, v_root),
    ('Uşaq geyimləri', 'gey-usaq', '🧒', 3, v_root),
    ('İdman geyimləri', 'gey-idman', '🏃', 4, v_root),
    ('Alt paltarları', 'gey-alt', '🩲', 5, v_root),
    ('Çimərlik geyimləri', 'gey-cimerlik', '🩱', 6, v_root),
    ('İş geyimləri', 'gey-is', '🦺', 7, v_root);

  -- 3) Ayaqqabı
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Ayaqqabı', 'ayaqqabi', '👟', 3) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Qadın ayaqqabıları', 'ay-qadin', '👠', 1, v_root),
    ('Kişi ayaqqabıları', 'ay-kisi', '👞', 2, v_root),
    ('Uşaq ayaqqabıları', 'ay-usaq', '👟', 3, v_root),
    ('İdman ayaqqabıları', 'ay-idman', '👟', 4, v_root),
    ('Çəkmələr', 'ay-cekme', '🥾', 5, v_root),
    ('Sandallar', 'ay-sandal', '🩴', 6, v_root);

  -- 4) Aksesuarlar
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Aksesuarlar', 'aksesuarlar', '👜', 4) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Çantalar', 'aks-canta', '👜', 1, v_root),
    ('Pulqabılar', 'aks-pulqabi', '👛', 2, v_root),
    ('Kəmərlər', 'aks-kemer', '🪢', 3, v_root),
    ('Saatlar', 'aks-saat', '⌚', 4, v_root),
    ('Eynəklər', 'aks-eynek', '👓', 5, v_root),
    ('Zərgərlik məmulatları', 'aks-zerger', '💍', 6, v_root);

  -- 5) Gözəllik və Baxım
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Gözəllik və Baxım', 'gozellik-baxim', '💄', 5) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Kosmetika', 'gz-kosmetika', '💄', 1, v_root),
    ('Ətirlər', 'gz-etir', '🌸', 2, v_root),
    ('Saç baxımı', 'gz-sac', '💇', 3, v_root),
    ('Dəri baxımı', 'gz-deri', '🧴', 4, v_root),
    ('Makiyaj məhsulları', 'gz-makiyaj', '💋', 5, v_root),
    ('Manikür məhsulları', 'gz-manikur', '💅', 6, v_root);

  -- 6) Ev və Mətbəx
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Ev və Mətbəx', 'ev-metbex', '🏠', 6) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Mebel', 'em-mebel', '🛋️', 1, v_root),
    ('Mətbəx əşyaları', 'em-metbex', '🍽️', 2, v_root),
    ('Qab-qacaq', 'em-qab', '🍳', 3, v_root),
    ('Tekstil', 'em-tekstil', '🧵', 4, v_root),
    ('Pərdələr', 'em-perde', '🪟', 5, v_root),
    ('İşıqlandırma', 'em-isiq', '💡', 6, v_root),
    ('Dekor məhsulları', 'em-dekor', '🖼️', 7, v_root);

  -- 7) Ev Tekstili
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Ev Tekstili', 'ev-tekstili', '🛏️', 7) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Yataq dəstləri', 'et-yataq', '🛏️', 1, v_root),
    ('Yastıqlar', 'et-yastiq', '🛌', 2, v_root),
    ('Döşəklər', 'et-dosek', '🛏️', 3, v_root),
    ('Ədyallar', 'et-edyal', '🧶', 4, v_root),
    ('Dəsmallar', 'et-desmal', '🧺', 5, v_root);

  -- 8) Uşaq və Körpə
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Uşaq və Körpə', 'usaq-korpe', '👶', 8) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Oyuncaqlar', 'uk-oyuncaq', '🧸', 1, v_root),
    ('Uşaq arabaları', 'uk-araba', '🚼', 2, v_root),
    ('Körpə qidalanması', 'uk-qida', '🍼', 3, v_root),
    ('Uşaq mebeli', 'uk-mebel', '🛏️', 4, v_root),
    ('Məktəb ləvazimatları', 'uk-mekteb', '🎒', 5, v_root);

  -- 9) Avtomobil
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Avtomobil', 'avtomobil', '🚗', 9) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Avto ehtiyat hissələri', 'av-ehtiyat', '⚙️', 1, v_root),
    ('Yağlar', 'av-yag', '🛢️', 2, v_root),
    ('Təkərlər', 'av-teker', '🛞', 3, v_root),
    ('Avto aksesuarları', 'av-aks', '🚘', 4, v_root),
    ('Alətlər', 'av-alet', '🧰', 5, v_root);

  -- 10) İdman və İstirahət
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('İdman və İstirahət', 'idman-istirahet', '🏃', 10) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Fitness avadanlıqları', 'id-fitness', '🏋️', 1, v_root),
    ('Velosipedlər', 'id-velosiped', '🚴', 2, v_root),
    ('Turizm məhsulları', 'id-turizm', '🎒', 3, v_root),
    ('Balıqçılıq', 'id-baliq', '🎣', 4, v_root),
    ('Ovçuluq aksesuarları', 'id-ov', '🏹', 5, v_root),
    ('İdman geyimləri', 'id-geyim', '👕', 6, v_root);

  -- 11) Heyvan Məhsulları
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Heyvan Məhsulları', 'heyvan-mehsullari', '🐶', 11) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Yemlər', 'hv-yem', '🦴', 1, v_root),
    ('Oyuncaqlar', 'hv-oyuncaq', '🧸', 2, v_root),
    ('Qəfəslər', 'hv-qefes', '🏠', 3, v_root),
    ('Gigiyena məhsulları', 'hv-gigiyena', '🧼', 4, v_root);

  -- 12) Kitablar və Dəftərxana
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Kitablar və Dəftərxana', 'kitablar-defterxana', '📚', 12) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Kitablar', 'kd-kitab', '📖', 1, v_root),
    ('Dərsliklər', 'kd-derslik', '📚', 2, v_root),
    ('Ofis ləvazimatları', 'kd-ofis', '📎', 3, v_root),
    ('Dəftərlər', 'kd-defter', '📓', 4, v_root),
    ('Qələmlər', 'kd-qelem', '🖊️', 5, v_root);

  -- 13) Ərzaq Məhsulları
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Ərzaq Məhsulları', 'erzaq-mehsullari', '🍴', 13) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Qəhvə', 'er-qehve', '☕', 1, v_root),
    ('Çay', 'er-cay', '🍵', 2, v_root),
    ('Şirniyyat', 'er-sirni', '🍬', 3, v_root),
    ('Konservlər', 'er-konserv', '🥫', 4, v_root),
    ('Quru ərzaqlar', 'er-quru', '🌾', 5, v_root),
    ('İçkilər', 'er-icki', '🥤', 6, v_root);

  -- 14) Tikinti və Təmir
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Tikinti və Təmir', 'tikinti-temir', '🛠️', 14) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Elektrik materialları', 'tt-elektrik', '⚡', 1, v_root),
    ('Santexnika', 'tt-santex', '🚿', 2, v_root),
    ('Boya və laklar', 'tt-boya', '🎨', 3, v_root),
    ('Tikinti alətləri', 'tt-alet', '🔨', 4, v_root),
    ('Qapılar', 'tt-qapi', '🚪', 5, v_root),
    ('Döşəmə materialları', 'tt-doseme', '🪵', 6, v_root);

  -- 15) Bağ və Həyət
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Bağ və Həyət', 'bag-heyat', '🌳', 15) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Bağ alətləri', 'bh-alet', '🪴', 1, v_root),
    ('Toxumlar', 'bh-toxum', '🌱', 2, v_root),
    ('Bitkilər', 'bh-bitki', '🌿', 3, v_root),
    ('Suvarma sistemləri', 'bh-suvarma', '💧', 4, v_root);

  -- 16) Aptek və Sağlamlıq
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Aptek və Sağlamlıq', 'aptek-saglamliq', '💊', 16) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Vitaminlər', 'ap-vitamin', '💊', 1, v_root),
    ('Tibbi cihazlar', 'ap-cihaz', '🩺', 2, v_root),
    ('Gigiyena məhsulları', 'ap-gigiyena', '🧼', 3, v_root),
    ('Bandajlar', 'ap-bandaj', '🩹', 4, v_root);

  -- 17) Hədiyyələr və Suvenirlər
  INSERT INTO public.categories (name, slug, icon, sort_order) VALUES ('Hədiyyələr və Suvenirlər', 'hediyyeler-suvenirler', '🎁', 17) RETURNING id INTO v_root;
  INSERT INTO public.categories (name, slug, icon, sort_order, parent_id) VALUES
    ('Hədiyyə dəstləri', 'hd-deste', '🎁', 1, v_root),
    ('Dekorativ məhsullar', 'hd-dekor', '🎀', 2, v_root),
    ('Bayram məhsulları', 'hd-bayram', '🎉', 3, v_root);
END $$;
