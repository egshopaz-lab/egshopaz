-- Ensure unique constraint on slug for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key') THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
  END IF;
END $$;

-- =========================================================================
-- ANA KATEQORİYALAR (parent_id = NULL)
-- =========================================================================
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order) VALUES
('Geyim və Moda',          'Одежда и мода',         'Clothing & Fashion',    'geyim',         '👗', NULL, 1),
('Ayaqqabı',               'Обувь',                 'Shoes',                 'ayaqqabi',      '👟', NULL, 2),
('Çanta və Aksesuar',      'Сумки и аксессуары',    'Bags & Accessories',    'canta-aksesuar','👜', NULL, 3),
('Elektronika',            'Электроника',           'Electronics',           'elektronika',   '📱', NULL, 4),
('Ev və Dekorasiya',       'Дом и декор',           'Home & Decor',          'ev-dekor',      '🏠', NULL, 5),
('Ev Alətləri',            'Бытовая техника',       'Home Appliances',       'ev-aletleri',   '🍳', NULL, 6),
('Gözəllik və Şəxsi Baxım','Красота и уход',        'Beauty & Personal Care','gozellik',      '💄', NULL, 7),
('İdman və Hobi',          'Спорт и хобби',         'Sports & Hobby',        'idman-hobi',    '🏋️', NULL, 8),
('Uşaq və Körpə',          'Детские товары',        'Kids & Baby',           'usaq-korpe',    '👶', NULL, 9),
('Pet Shop',               'Зоотовары',             'Pet Shop',              'pet-shop',      '🐾', NULL, 10),
('Supermarket',            'Супермаркет',           'Supermarket',           'supermarket',   '🛒', NULL, 11),
('Sağlamlıq və Tibb',      'Здоровье и медицина',   'Health & Medical',      'saglamliq',     '🏥', NULL, 12),
('Kitab və Ofis',          'Книги и офис',          'Books & Office',        'kitab-ofis',    '📚', NULL, 13),
('Avtomobil və Moto',      'Авто и мото',           'Auto & Moto',           'avto-moto',     '🚗', NULL, 14),
('Bağçılıq',               'Сад и огород',          'Garden',                'bagcilik',      '🌱', NULL, 15)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_ru = EXCLUDED.name_ru,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order;

-- =========================================================================
-- ALT KATEQORİYALAR (Level 2)
-- =========================================================================

-- GEYİM
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='geyim'), v.so
FROM (VALUES
  ('Qadın geyimləri', 'Женская одежда', 'Women''s clothing', 'geyim-qadin', '👚', 1),
  ('Kişi geyimləri',  'Мужская одежда', 'Men''s clothing',   'geyim-kisi',  '👔', 2),
  ('Uşaq geyimləri',  'Детская одежда', 'Kids clothing',     'geyim-usaq',  '🧒', 3)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- AYAQQABI
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='ayaqqabi'), v.so
FROM (VALUES
  ('Qadın ayaqqabıları', 'Женская обувь', 'Women''s shoes', 'ayaqqabi-qadin', '👠', 1),
  ('Kişi ayaqqabıları',  'Мужская обувь', 'Men''s shoes',   'ayaqqabi-kisi',  '👞', 2),
  ('Uşaq ayaqqabıları',  'Детская обувь', 'Kids shoes',     'ayaqqabi-usaq',  '👟', 3)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- ÇANTA VƏ AKSESUAR
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='canta-aksesuar'), v.so
FROM (VALUES
  ('Çantalar',     'Сумки',         'Bags',          'aks-canta',   '👜', 1),
  ('Cüzdan və kəmər', 'Кошельки и ремни', 'Wallets & Belts', 'aks-cuzdan', '👛', 2),
  ('Saatlar',      'Часы',          'Watches',       'aks-saat',    '⌚', 3),
  ('Eynəklər',     'Очки',          'Glasses',       'aks-eynek',   '🕶️', 4),
  ('Zərgərlik',    'Украшения',     'Jewelry',       'aks-zergerlik','💍', 5),
  ('Papaq və şərf','Шапки и шарфы', 'Hats & Scarves','aks-papaq',   '🧢', 6)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- ELEKTRONİKA
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='elektronika'), v.so
FROM (VALUES
  ('Telefonlar',         'Телефоны',           'Phones',          'el-telefon',   '📱', 1),
  ('Noutbuk və Kompüter','Ноутбуки и ПК',      'Laptops & PCs',   'el-kompyuter', '💻', 2),
  ('Tablet',             'Планшеты',           'Tablets',         'el-tablet',    '📲', 3),
  ('Televizor',          'Телевизоры',         'TVs',             'el-tv',        '📺', 4),
  ('Qulaqlıq və Audio',  'Наушники и аудио',   'Headphones & Audio','el-audio',   '🎧', 5),
  ('Foto və Video',      'Фото и видео',       'Photo & Video',   'el-foto',      '📷', 6),
  ('Oyun (Gaming)',      'Игры',               'Gaming',          'el-gaming',    '🎮', 7),
  ('Smart saatlar',      'Умные часы',         'Smartwatches',    'el-smartwatch','⌚', 8),
  ('Aksesuarlar',        'Аксессуары',         'Accessories',     'el-aksesuar',  '🔌', 9)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- EV VƏ DEKORASIYA
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='ev-dekor'), v.so
FROM (VALUES
  ('Mebel',          'Мебель',          'Furniture',       'evd-mebel',   '🛋️', 1),
  ('Yataq dəsti',    'Постельное белье','Bedding',         'evd-yataq',   '🛏️', 2),
  ('Xalça',          'Ковры',           'Carpets',         'evd-xalca',   '🟫', 3),
  ('Pərdə',          'Шторы',           'Curtains',        'evd-perde',   '🪟', 4),
  ('İşıqlandırma',   'Освещение',       'Lighting',        'evd-isiq',    '💡', 5),
  ('Mətbəx əşyaları','Кухонные принадлежности','Kitchenware','evd-metbex','🍽️', 6),
  ('Dekor',          'Декор',           'Decor',           'evd-dekor',   '🖼️', 7),
  ('Saxlama',        'Хранение',        'Storage',         'evd-saxlama', '📦', 8)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- EV ALƏTLƏRİ
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='ev-aletleri'), v.so
FROM (VALUES
  ('Soyuducu',        'Холодильники',       'Refrigerators',  'mt-soyuducu',   '🧊', 1),
  ('Paltaryuyan',     'Стиральные машины',  'Washing machines','mt-paltaryuyan','🧺', 2),
  ('Qabyuyan',        'Посудомоечные',      'Dishwashers',    'mt-qabyuyan',   '🍽️', 3),
  ('Soba və Fırın',   'Плиты и духовки',    'Stoves & Ovens', 'mt-soba',       '🔥', 4),
  ('Kondisioner',     'Кондиционеры',       'Air conditioners','mt-kondisioner','❄️', 5),
  ('Kiçik məişət texnikası','Мелкая бытовая техника','Small appliances','mt-kicik','☕', 6),
  ('Tozsoran',        'Пылесосы',           'Vacuum cleaners','mt-tozsoran',   '🧹', 7)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- GÖZƏLLİK
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='gozellik'), v.so
FROM (VALUES
  ('Makiyaj',     'Макияж',         'Makeup',          'gz-makiyaj',  '💄', 1),
  ('Dəri baxımı', 'Уход за кожей',  'Skincare',        'gz-deri',     '🧴', 2),
  ('Saç baxımı',  'Уход за волосами','Haircare',       'gz-sac',      '💇', 3),
  ('Ətriyyat',    'Парфюмерия',     'Perfume',         'gz-etir',     '🌸', 4),
  ('Şəxsi baxım', 'Личная гигиена', 'Personal care',   'gz-sexsi',    '🪥', 5),
  ('Manikür və Pedikür','Маникюр и педикюр','Manicure & Pedicure','gz-manikur','💅', 6)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- İDMAN VƏ HOBİ
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='idman-hobi'), v.so
FROM (VALUES
  ('İdman avadanlığı', 'Спортинвентарь',   'Sports equipment','ih-avadanliq','🏋️', 1),
  ('İdman geyimləri',  'Спортивная одежда','Sportswear',     'ih-geyim',    '👕', 2),
  ('Açıq hava və kamp','Туризм и кемпинг', 'Outdoor & Camping','ih-kamp',   '🏕️', 3),
  ('Velosiped və Skuter','Велосипеды и самокаты','Bikes & Scooters','ih-velosiped','🚴', 4),
  ('Hobi və Kolleksiya','Хобби и коллекции','Hobby & Collections','ih-hobi','🎨', 5),
  ('Musiqi alətləri',  'Музыкальные инструменты','Musical instruments','ih-musiqi','🎸', 6),
  ('Balıqçılıq',       'Рыбалка',          'Fishing',        'ih-baliqciliq','🎣', 7)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- UŞAQ VƏ KÖRPƏ
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='usaq-korpe'), v.so
FROM (VALUES
  ('Körpə qidası',    'Детское питание',   'Baby food',       'uk-qida',     '🍼', 1),
  ('Bez və gigiyena', 'Подгузники и гигиена','Diapers & Hygiene','uk-bez',   '🧷', 2),
  ('Körpə arabası',   'Коляски',           'Strollers',       'uk-araba',    '🛒', 3),
  ('Avtomobil oturacağı','Автокресла',     'Car seats',       'uk-avto',     '💺', 4),
  ('Oyuncaqlar',      'Игрушки',           'Toys',            'uk-oyuncaq',  '🧸', 5),
  ('Uşaq otağı',      'Детская комната',   'Kids room',       'uk-otaq',     '🛏️', 6)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- PET SHOP
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='pet-shop'), v.so
FROM (VALUES
  ('İt məhsulları',    'Товары для собак', 'Dog products',    'pet-it',     '🐕', 1),
  ('Pişik məhsulları', 'Товары для кошек', 'Cat products',    'pet-pisik',  '🐈', 2),
  ('Quş məhsulları',   'Товары для птиц',  'Bird products',   'pet-qus',    '🦜', 3),
  ('Akvarium və balıq','Аквариумы и рыбы', 'Aquarium & fish', 'pet-balıq',  '🐠', 4),
  ('Kemiriciler',      'Грызуны',          'Rodents',         'pet-kemirici','🐹', 5)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- SUPERMARKET
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='supermarket'), v.so
FROM (VALUES
  ('Quru ərzaq',     'Бакалея',         'Pantry',          'sm-quru',    '🥫', 1),
  ('İçkilər',        'Напитки',         'Drinks',          'sm-icki',    '🧃', 2),
  ('Şirniyyat',      'Сладости',        'Sweets',          'sm-sirni',   '🍫', 3),
  ('Çay və qəhvə',   'Чай и кофе',      'Tea & Coffee',    'sm-cay',     '☕', 4),
  ('Süd məhsulları', 'Молочные',        'Dairy',           'sm-sud',     '🥛', 5),
  ('Təmizlik',       'Бытовая химия',   'Cleaning',        'sm-temizlik','🧼', 6)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- SAĞLAMLIQ
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='saglamliq'), v.so
FROM (VALUES
  ('Vitamin və əlavələr','Витамины и БАДы','Vitamins & supplements','sg-vitamin','💊', 1),
  ('Tibbi cihazlar',     'Медтехника',     'Medical devices',      'sg-cihaz',  '🩺', 2),
  ('Apteka məhsulları',  'Аптечные товары','Pharmacy',             'sg-apteka', '💉', 3),
  ('Optika',             'Оптика',         'Optics',               'sg-optika', '👓', 4)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- KİTAB VƏ OFİS
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='kitab-ofis'), v.so
FROM (VALUES
  ('Kitablar',       'Книги',          'Books',           'ko-kitab',  '📖', 1),
  ('Dəftərxana',     'Канцтовары',     'Stationery',      'ko-defter', '✏️', 2),
  ('Çap texnikası',  'Печатная техника','Printing equipment','ko-cap', '🖨️', 3),
  ('Ofis mebeli',    'Офисная мебель', 'Office furniture','ko-mebel',  '🪑', 4)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- AVTOMOBİL VƏ MOTO
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='avto-moto'), v.so
FROM (VALUES
  ('Aksessuarlar',    'Аксессуары',      'Accessories',     'am-aksesuar','🚗', 1),
  ('Yağ və kimya',    'Масла и химия',   'Oils & Chemicals','am-yag',     '🛢️', 2),
  ('Ehtiyat hissələri','Запчасти',       'Spare parts',     'am-ehtiyat', '⚙️', 3),
  ('Avtomobil elektronikası','Автоэлектроника','Auto electronics','am-elektronika','🔊', 4),
  ('Moto geyim',      'Мотоэкипировка',  'Moto gear',       'am-moto',    '🏍️', 5)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- BAĞÇILIQ
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='bagcilik'), v.so
FROM (VALUES
  ('Toxum və bitki', 'Семена и растения','Seeds & Plants', 'bg-toxum',   '🌱', 1),
  ('Bağ alətləri',   'Садовые инструменты','Garden tools', 'bg-aletler', '🪴', 2),
  ('Gübrə və torpaq','Удобрения и почва','Fertilizer & Soil','bg-gubre', '🌾', 3),
  ('Sulama',         'Полив',           'Watering',        'bg-sulama',  '💧', 4),
  ('Bağ mebeli',     'Садовая мебель',  'Garden furniture','bg-mebel',   '🪑', 5)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- =========================================================================
-- LEVEL 3 - GEYİM > Qadın geyimləri
-- =========================================================================
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='geyim-qadin'), v.so
FROM (VALUES
  ('Paltarlar',          'Платья',           'Dresses',         'gq-paltar',    '👗', 1),
  ('Bluzlar və köynəklər','Блузки и рубашки','Blouses & Shirts','gq-bluz',     '👚', 2),
  ('Tişört',             'Футболки',         'T-shirts',        'gq-tisort',   '👕', 3),
  ('Şalvar və cins',     'Брюки и джинсы',   'Pants & Jeans',   'gq-salvar',   '👖', 4),
  ('Yubka',              'Юбки',             'Skirts',          'gq-yubka',    '👗', 5),
  ('Sviter və xirqə',    'Свитера и кардиганы','Sweaters & Cardigans','gq-sviter','🧥', 6),
  ('Pencək və blazer',   'Пиджаки и блейзеры','Jackets & Blazers','gq-pencek','🧥', 7),
  ('Palto və gödəkçə',   'Пальто и куртки',  'Coats & Jackets', 'gq-palto',    '🧥', 8),
  ('Don və kombinezon',  'Платья и комбинезоны','Dresses & Jumpsuits','gq-don','👘', 9),
  ('İç paltar',          'Нижнее белье',     'Lingerie',        'gq-ic',       '👙', 10),
  ('Pijama və gecəlik',  'Пижамы и сорочки', 'Pajamas & Nightwear','gq-pijama','🩱', 11),
  ('Spor geyim',         'Спортивная одежда','Sportswear',      'gq-spor',     '🩳', 12),
  ('Üzgüçülük',          'Купальники',       'Swimwear',        'gq-uzgucu',   '👙', 13)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- LEVEL 3 - GEYİM > Kişi geyimləri
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='geyim-kisi'), v.so
FROM (VALUES
  ('Tişört',          'Футболки',          'T-shirts',       'gk-tisort',  '👕', 1),
  ('Köynək',          'Рубашки',           'Shirts',         'gk-koynek',  '👔', 2),
  ('Şalvar və cins',  'Брюки и джинсы',    'Pants & Jeans',  'gk-salvar',  '👖', 3),
  ('Sviter və xirqə', 'Свитера и кардиганы','Sweaters',      'gk-sviter',  '🧥', 4),
  ('Pencək və kostyum','Пиджаки и костюмы','Suits & Blazers','gk-kostyum', '🤵', 5),
  ('Palto və gödəkçə','Пальто и куртки',   'Coats & Jackets','gk-palto',   '🧥', 6),
  ('İç paltar',       'Нижнее белье',      'Underwear',      'gk-ic',      '🩲', 7),
  ('Pijama',          'Пижамы',            'Pajamas',        'gk-pijama',  '👘', 8),
  ('Spor geyim',      'Спортивная одежда', 'Sportswear',     'gk-spor',    '🩳', 9)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- LEVEL 3 - GEYİM > Uşaq
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='geyim-usaq'), v.so
FROM (VALUES
  ('Körpə (0-2 yaş)', 'Малыши (0-2)',     'Baby (0-2)',     'gu-korpe',   '👶', 1),
  ('Qız geyimi',      'Для девочек',      'Girls',          'gu-qiz',     '👧', 2),
  ('Oğlan geyimi',    'Для мальчиков',    'Boys',           'gu-oglan',   '👦', 3),
  ('Məktəb forması',  'Школьная форма',   'School uniform', 'gu-mekteb',  '🎒', 4),
  ('Pijama',          'Пижамы',           'Pajamas',        'gu-pijama',  '👘', 5),
  ('Spor geyim',      'Спортивная одежда','Sportswear',     'gu-spor',    '👕', 6)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- LEVEL 3 - ELEKTRONİKA > Telefonlar (markalar)
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='el-telefon'), v.so
FROM (VALUES
  ('Apple iPhone',    'Apple iPhone',  'Apple iPhone',  'tel-apple',     '🍎', 1),
  ('Samsung',         'Samsung',       'Samsung',       'tel-samsung',   '📱', 2),
  ('Xiaomi',          'Xiaomi',        'Xiaomi',        'tel-xiaomi',    '📱', 3),
  ('Huawei',          'Huawei',        'Huawei',        'tel-huawei',    '📱', 4),
  ('Oppo',            'Oppo',          'Oppo',          'tel-oppo',      '📱', 5),
  ('OnePlus',         'OnePlus',       'OnePlus',       'tel-oneplus',   '📱', 6),
  ('Vivo',            'Vivo',          'Vivo',          'tel-vivo',      '📱', 7),
  ('Realme',          'Realme',        'Realme',        'tel-realme',    '📱', 8),
  ('Honor',           'Honor',         'Honor',         'tel-honor',     '📱', 9),
  ('Motorola',        'Motorola',      'Motorola',      'tel-motorola',  '📱', 10),
  ('Nokia',           'Nokia',         'Nokia',         'tel-nokia',     '📱', 11),
  ('Sony',            'Sony',          'Sony',          'tel-sony',      '📱', 12),
  ('Tuşlu telefonlar','Кнопочные',     'Feature phones','tel-tuslu',     '☎️', 13),
  ('Qatlanan telefon','Складные',      'Foldable',      'tel-qatlanan',  '📱', 14),
  ('Yenilənmiş',      'Восстановленные','Refurbished',  'tel-refurb',    '♻️', 15)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- LEVEL 3 - AYAQQABI > Qadın
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='ayaqqabi-qadin'), v.so
FROM (VALUES
  ('Hündür daban',  'На каблуке',     'Heels',       'aq-daban',     '👠', 1),
  ('Düz dabanlı',   'Без каблука',    'Flats',       'aq-duz',       '👡', 2),
  ('Sneaker',       'Кроссовки',      'Sneakers',    'aq-sneaker',   '👟', 3),
  ('Çəkmə və sapoq','Ботинки и сапоги','Boots',      'aq-cekme',     '🥾', 4),
  ('Sandal',        'Сандалии',       'Sandals',     'aq-sandal',    '👡', 5),
  ('Terlik',        'Тапочки',        'Slippers',    'aq-terlik',    '🩴', 6),
  ('Balerin',       'Балетки',        'Ballerinas',  'aq-balerin',   '🥿', 7)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- LEVEL 3 - AYAQQABI > Kişi
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='ayaqqabi-kisi'), v.so
FROM (VALUES
  ('Klassik',       'Классические',  'Classic',      'ak-klassik', '👞', 1),
  ('Sneaker',       'Кроссовки',     'Sneakers',     'ak-sneaker', '👟', 2),
  ('Çəkmə və sapoq','Ботинки',       'Boots',        'ak-cekme',   '🥾', 3),
  ('Sandal',        'Сандалии',      'Sandals',      'ak-sandal',  '🩴', 4),
  ('Terlik',        'Тапочки',       'Slippers',     'ak-terlik',  '🩴', 5),
  ('İş ayaqqabıları','Рабочая обувь','Work shoes',   'ak-is',      '🥾', 6)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- LEVEL 3 - AYAQQABI > Uşaq
INSERT INTO public.categories (name, name_ru, name_en, slug, icon, parent_id, sort_order)
SELECT v.name, v.name_ru, v.name_en, v.slug, v.icon, (SELECT id FROM public.categories WHERE slug='ayaqqabi-usaq'), v.so
FROM (VALUES
  ('Körpə ayaqqabısı','Для малышей',  'Baby shoes',     'au-korpe',   '👶', 1),
  ('Sneaker',         'Кроссовки',    'Sneakers',       'au-sneaker', '👟', 2),
  ('Sandal',          'Сандалии',     'Sandals',        'au-sandal',  '🩴', 3),
  ('Çəkmə',           'Ботинки',      'Boots',          'au-cekme',   '🥾', 4),
  ('Məktəb ayaqqabıları','Школьная обувь','School shoes','au-mekteb', '🎒', 5)
) v(name, name_ru, name_en, slug, icon, so)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_ru=EXCLUDED.name_ru, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;