
-- Add "Digərləri" (Others) leaf under every existing root category
INSERT INTO public.categories (name, name_ru, name_en, slug, parent_id, sort_order, icon)
SELECT 'Digərləri', 'Другое', 'Other', c.slug || '-digerleri', c.id, 9999, '➕'
FROM public.categories c
WHERE c.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.categories x WHERE x.parent_id = c.id AND x.slug = c.slug || '-digerleri'
  );

-- Add extra subs to popular existing roots
WITH r AS (SELECT id, slug FROM public.categories WHERE parent_id IS NULL)
INSERT INTO public.categories (name, name_ru, name_en, slug, parent_id, sort_order, icon)
SELECT v.name, v.ru, v.en, (SELECT slug FROM r WHERE id = v.parent) || '-' || v.s, v.parent, v.ord, v.icon
FROM (VALUES
  -- Elektronika
  ('Qulaqlıqlar','Наушники','Headphones','qulaqliqlar','977de5a6-6177-439d-ab28-e027df93b66b'::uuid, 50,'🎧'),
  ('Səs sistemləri','Аудиосистемы','Audio systems','ses-sistemleri','977de5a6-6177-439d-ab28-e027df93b66b'::uuid, 51,'🔊'),
  ('Dronlar','Дроны','Drones','dronlar','977de5a6-6177-439d-ab28-e027df93b66b'::uuid, 52,'🛸'),
  ('Powerbank','Powerbank','Power banks','powerbank','977de5a6-6177-439d-ab28-e027df93b66b'::uuid, 53,'🔋'),
  ('Kabel və adapterlər','Кабели и адаптеры','Cables & adapters','kabel-adapter','977de5a6-6177-439d-ab28-e027df93b66b'::uuid, 54,'🔌'),
  ('Yaddaş kartları və USB','Карты памяти и USB','Memory & USB','yaddas','977de5a6-6177-439d-ab28-e027df93b66b'::uuid, 55,'💾'),
  -- Ev və mətbəx
  ('Ofis mebeli','Офисная мебель','Office furniture','ofis-mebel','9dd52614-8f09-425a-a710-5feb84f57639'::uuid, 50,'🪑'),
  ('İşıqlandırma','Освещение','Lighting','isiqlandirma','9dd52614-8f09-425a-a710-5feb84f57639'::uuid, 51,'💡'),
  ('Təmizlik vasitələri','Бытовая химия','Cleaning supplies','temizlik','9dd52614-8f09-425a-a710-5feb84f57639'::uuid, 52,'🧽'),
  ('Hamam aksesuarları','Аксессуары для ванной','Bath accessories','hamam','9dd52614-8f09-425a-a710-5feb84f57639'::uuid, 53,'🛁'),
  -- Qadın geyimləri
  ('Trikotaj','Трикотаж','Knitwear','trikotaj','d2f4590b-2be1-46eb-a1cd-c1beb7302497'::uuid, 50,'🧶'),
  ('İdman geyimləri','Спортивная одежда','Sportswear','idman-geyim','d2f4590b-2be1-46eb-a1cd-c1beb7302497'::uuid, 51,'🏃‍♀️'),
  ('Plyaj geyimləri','Пляжная одежда','Beachwear','plyaj','d2f4590b-2be1-46eb-a1cd-c1beb7302497'::uuid, 52,'👙'),
  -- Kişi geyimləri
  ('İdman geyimləri','Спортивная одежда','Sportswear','idman-geyim','91f31424-5a7d-4113-b8a0-22d4fcff6949'::uuid, 50,'🏋️'),
  ('Kostyumlar','Костюмы','Suits','kostyumlar','91f31424-5a7d-4113-b8a0-22d4fcff6949'::uuid, 51,'🤵'),
  ('Alt geyim','Нижнее бельё','Underwear','alt-geyim','91f31424-5a7d-4113-b8a0-22d4fcff6949'::uuid, 52,'🩲'),
  -- Avtomobil
  ('Avto kimya','Автохимия','Auto chemistry','avto-kimya','aa0d51cf-c879-4a91-964b-2d113fd0b95d'::uuid, 50,'🧴'),
  ('Şinlər və disklər','Шины и диски','Tires & wheels','sin-disk','aa0d51cf-c879-4a91-964b-2d113fd0b95d'::uuid, 51,'🛞'),
  ('Avto elektronika','Автоэлектроника','Car electronics','avto-elektronika','aa0d51cf-c879-4a91-964b-2d113fd0b95d'::uuid, 52,'📻')
) AS v(name, ru, en, s, parent, ord, icon)
ON CONFLICT DO NOTHING;

-- Add new root categories
INSERT INTO public.categories (id, name, name_ru, name_en, slug, parent_id, sort_order, icon) VALUES
  ('a1111111-0000-0000-0000-000000000001','Ofis və biznes','Офис и бизнес','Office & Business','ofis-ve-biznes',NULL,21,'💼'),
  ('a1111111-0000-0000-0000-000000000002','Musiqi alətləri','Музыкальные инструменты','Musical Instruments','musiqi-aletleri',NULL,22,'🎸'),
  ('a1111111-0000-0000-0000-000000000003','Səyahət','Путешествия','Travel','seyahet',NULL,23,'🧳'),
  ('a1111111-0000-0000-0000-000000000004','Smart ev','Умный дом','Smart Home','smart-ev',NULL,24,'🏡'),
  ('a1111111-0000-0000-0000-000000000005','Velosiped və skuter','Велосипеды и самокаты','Bikes & Scooters','velosiped-skuter',NULL,25,'🚲'),
  ('a1111111-0000-0000-0000-000000000099','Digərləri','Другое','Other','digerleri',NULL,9999,'➕')
ON CONFLICT (id) DO NOTHING;

-- Subs for new roots
INSERT INTO public.categories (name, name_ru, name_en, slug, parent_id, sort_order, icon) VALUES
  -- Ofis və biznes
  ('Ofis ləvazimatları','Канцтовары','Office supplies','ofis-levazimatlari','a1111111-0000-0000-0000-000000000001',1,'✏️'),
  ('Çap və skan','Печать и сканирование','Print & Scan','cap-skan','a1111111-0000-0000-0000-000000000001',2,'🖨️'),
  ('Ofis kreslosu','Офисные кресла','Office chairs','ofis-kreslosu','a1111111-0000-0000-0000-000000000001',3,'🪑'),
  ('Kasa aparatları','Кассовые аппараты','POS terminals','kasa','a1111111-0000-0000-0000-000000000001',4,'🧾'),
  ('Digərləri','Другое','Other','ofis-biznes-digerleri','a1111111-0000-0000-0000-000000000001',9999,'➕'),
  -- Musiqi
  ('Gitaralar','Гитары','Guitars','gitaralar','a1111111-0000-0000-0000-000000000002',1,'🎸'),
  ('Pianoler və klavishlər','Пианино и клавишные','Piano & Keys','piano','a1111111-0000-0000-0000-000000000002',2,'🎹'),
  ('Nəfəsli alətlər','Духовые','Wind instruments','nefesli','a1111111-0000-0000-0000-000000000002',3,'🎷'),
  ('Zərb alətləri','Ударные','Drums','zerb','a1111111-0000-0000-0000-000000000002',4,'🥁'),
  ('Studio avadanlığı','Студийное оборудование','Studio gear','studio','a1111111-0000-0000-0000-000000000002',5,'🎚️'),
  ('Digərləri','Другое','Other','musiqi-digerleri','a1111111-0000-0000-0000-000000000002',9999,'➕'),
  -- Səyahət
  ('Çamadanlar','Чемоданы','Suitcases','camadanlar','a1111111-0000-0000-0000-000000000003',1,'🧳'),
  ('Çantalar və bel çantaları','Сумки и рюкзаки','Bags & backpacks','seyahet-canta','a1111111-0000-0000-0000-000000000003',2,'🎒'),
  ('Kempinq','Кемпинг','Camping','kempinq','a1111111-0000-0000-0000-000000000003',3,'⛺'),
  ('Səyahət aksesuarları','Аксессуары для путешествий','Travel accessories','seyahet-aks','a1111111-0000-0000-0000-000000000003',4,'🧴'),
  ('Digərləri','Другое','Other','seyahet-digerleri','a1111111-0000-0000-0000-000000000003',9999,'➕'),
  -- Smart ev
  ('Ağıllı işıqlandırma','Умное освещение','Smart lighting','smart-isiq','a1111111-0000-0000-0000-000000000004',1,'💡'),
  ('Təhlükəsizlik kameraları','Камеры безопасности','Security cameras','smart-kamera','a1111111-0000-0000-0000-000000000004',2,'📷'),
  ('Ağıllı kilidlər','Умные замки','Smart locks','smart-kilid','a1111111-0000-0000-0000-000000000004',3,'🔐'),
  ('Səsli köməkçilər','Голосовые помощники','Voice assistants','smart-asistent','a1111111-0000-0000-0000-000000000004',4,'🗣️'),
  ('Termostat və sensorlar','Термостаты и датчики','Thermostats & sensors','smart-sensor','a1111111-0000-0000-0000-000000000004',5,'🌡️'),
  ('Digərləri','Другое','Other','smart-ev-digerleri','a1111111-0000-0000-0000-000000000004',9999,'➕'),
  -- Velosiped
  ('Velosipedlər','Велосипеды','Bicycles','velosipedler','a1111111-0000-0000-0000-000000000005',1,'🚴'),
  ('Elektrik skuterlər','Электросамокаты','E-scooters','e-skuter','a1111111-0000-0000-0000-000000000005',2,'🛴'),
  ('Hissələr','Запчасти','Parts','velo-hisseler','a1111111-0000-0000-0000-000000000005',3,'⚙️'),
  ('Aksesuarlar','Аксессуары','Accessories','velo-aks','a1111111-0000-0000-0000-000000000005',4,'🧢'),
  ('Digərləri','Другое','Other','velo-digerleri','a1111111-0000-0000-0000-000000000005',9999,'➕'),
  -- Digərləri root
  ('Digərləri','Другое','Other','digerleri-digerleri','a1111111-0000-0000-0000-000000000099',1,'➕')
ON CONFLICT DO NOTHING;
