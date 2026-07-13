
-- Add parent_id for hierarchical categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

-- Update existing parents (icons + names)
UPDATE public.categories SET name='Qadınlar üçün', icon='👗', sort_order=1 WHERE slug='qadin';
UPDATE public.categories SET name='Kişilər üçün', icon='👔', sort_order=2 WHERE slug='kisi';
UPDATE public.categories SET name='Uşaqlar üçün', icon='🧸', sort_order=3 WHERE slug='usaq';
UPDATE public.categories SET name='Gözəllik və sağlamlıq', icon='💄', sort_order=4 WHERE slug='gozellik';
UPDATE public.categories SET name='Ev və bağ', icon='🏡', sort_order=5 WHERE slug='ev';
UPDATE public.categories SET name='Elektronika', icon='📱', sort_order=6 WHERE slug='texnika';
UPDATE public.categories SET name='İdman və turizm', icon='⚽', sort_order=7 WHERE slug='idman';
UPDATE public.categories SET name='Avtomobil', icon='🚗', sort_order=8 WHERE slug='avto';
UPDATE public.categories SET name='Ərzaq', icon='🛒', sort_order=9 WHERE slug='erzaq';
UPDATE public.categories SET name='Kitab və hobbi', icon='📚', sort_order=11 WHERE slug='kitab';

-- Add new top-level categories
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
('Məişət texnikası', 'meiset', '🔌', 10),
('Heyvanlar üçün', 'heyvan', '🐾', 12),
('Tikinti və təmir', 'tikinti', '🔨', 13),
('Ofis', 'ofis', '📎', 14)
ON CONFLICT (slug) DO NOTHING;

-- Subcategories
DO $$
DECLARE
  qadin_id uuid; kisi_id uuid; usaq_id uuid; gozellik_id uuid; ev_id uuid;
  texnika_id uuid; meiset_id uuid; idman_id uuid; avto_id uuid; erzaq_id uuid;
  heyvan_id uuid; kitab_id uuid; tikinti_id uuid; ofis_id uuid;
BEGIN
  SELECT id INTO qadin_id FROM categories WHERE slug='qadin';
  SELECT id INTO kisi_id FROM categories WHERE slug='kisi';
  SELECT id INTO usaq_id FROM categories WHERE slug='usaq';
  SELECT id INTO gozellik_id FROM categories WHERE slug='gozellik';
  SELECT id INTO ev_id FROM categories WHERE slug='ev';
  SELECT id INTO texnika_id FROM categories WHERE slug='texnika';
  SELECT id INTO meiset_id FROM categories WHERE slug='meiset';
  SELECT id INTO idman_id FROM categories WHERE slug='idman';
  SELECT id INTO avto_id FROM categories WHERE slug='avto';
  SELECT id INTO erzaq_id FROM categories WHERE slug='erzaq';
  SELECT id INTO heyvan_id FROM categories WHERE slug='heyvan';
  SELECT id INTO kitab_id FROM categories WHERE slug='kitab';
  SELECT id INTO tikinti_id FROM categories WHERE slug='tikinti';
  SELECT id INTO ofis_id FROM categories WHERE slug='ofis';

  INSERT INTO public.categories (name, slug, icon, parent_id, sort_order) VALUES
  -- Qadın
  ('Paltar','qadin-paltar','👗',qadin_id,1),
  ('Ayaqqabı','qadin-ayaqqabi','👠',qadin_id,2),
  ('Çantalar','qadin-canta','👜',qadin_id,3),
  ('Aksessuarlar','qadin-aksesuar','💍',qadin_id,4),
  ('Üst geyim','qadin-ust','🧥',qadin_id,5),
  ('Alt paltarı','qadin-alt','👙',qadin_id,6),
  ('İdman geyimi','qadin-idman','🩱',qadin_id,7),
  ('Ev geyimi','qadin-ev','🥻',qadin_id,8),
  ('Hamilə geyimi','qadin-hamile','🤰',qadin_id,9),
  -- Kişi
  ('Paltar','kisi-paltar','👔',kisi_id,1),
  ('Ayaqqabı','kisi-ayaqqabi','👞',kisi_id,2),
  ('Çantalar','kisi-canta','💼',kisi_id,3),
  ('Aksessuarlar','kisi-aksesuar','⌚',kisi_id,4),
  ('Üst geyim','kisi-ust','🧥',kisi_id,5),
  ('Alt paltarı','kisi-alt','🩲',kisi_id,6),
  ('İdman geyimi','kisi-idman','🎽',kisi_id,7),
  ('Ev geyimi','kisi-ev','👕',kisi_id,8),
  -- Uşaq
  ('Qız geyimi','usaq-qiz','👧',usaq_id,1),
  ('Oğlan geyimi','usaq-oglan','👦',usaq_id,2),
  ('Ayaqqabı','usaq-ayaqqabi','👟',usaq_id,3),
  ('Oyuncaqlar','usaq-oyuncaq','🧸',usaq_id,4),
  ('Körpə məhsulları','usaq-korpe','🍼',usaq_id,5),
  ('Uşaq arabası','usaq-araba','🚼',usaq_id,6),
  ('Məktəb ləvazimatı','usaq-mekteb','🎒',usaq_id,7),
  ('Uşaq kitabları','usaq-kitab','📖',usaq_id,8),
  -- Gözəllik
  ('Üz baxımı','goz-uz','🧴',gozellik_id,1),
  ('Saç baxımı','goz-sac','💇',gozellik_id,2),
  ('Bədən baxımı','goz-beden','🧼',gozellik_id,3),
  ('Parfüm','goz-parfum','🌸',gozellik_id,4),
  ('Dekorativ kosmetika','goz-kosmetika','💄',gozellik_id,5),
  ('Dırnaq baxımı','goz-dirnaq','💅',gozellik_id,6),
  ('Kişi kosmetikası','goz-kisi','🧔',gozellik_id,7),
  ('Vitaminlər və BAD','goz-vitamin','💊',gozellik_id,8),
  ('Tibbi cihazlar','goz-tibb','🩺',gozellik_id,9),
  -- Ev və bağ
  ('Mebel','ev-mebel','🛋️',ev_id,1),
  ('Yataq dəsti','ev-yataq','🛏️',ev_id,2),
  ('Vanna otağı','ev-vanna','🛁',ev_id,3),
  ('Mətbəx əşyaları','ev-metbex','🍳',ev_id,4),
  ('Dekor','ev-dekor','🖼️',ev_id,5),
  ('İşıqlandırma','ev-isiq','💡',ev_id,6),
  ('Təmizlik məhsulları','ev-temizlik','🧹',ev_id,7),
  ('Bitkilər və bağ','ev-bag','🌱',ev_id,8),
  ('Ağıllı ev','ev-agilli','🏠',ev_id,9),
  -- Elektronika
  ('Smartfonlar','el-smartfon','📱',texnika_id,1),
  ('Noutbuklar','el-noutbuk','💻',texnika_id,2),
  ('Planşetlər','el-planset','📲',texnika_id,3),
  ('Televizorlar','el-tv','📺',texnika_id,4),
  ('Audio texnika','el-audio','🎧',texnika_id,5),
  ('Fotoqrafiya','el-foto','📷',texnika_id,6),
  ('Oyun konsolları','el-oyun','🎮',texnika_id,7),
  ('Kompüter aksessuarları','el-aksesuar','🖱️',texnika_id,8),
  ('Ağıllı saatlar','el-saat','⌚',texnika_id,9),
  -- Məişət
  ('Soyuducular','m-soyuducu','❄️',meiset_id,1),
  ('Paltaryuyan maşın','m-paltaryuyan','🧺',meiset_id,2),
  ('Sobalar','m-soba','🔥',meiset_id,3),
  ('Tozsoran','m-tozsoran','🌀',meiset_id,4),
  ('Kiçik texnika','m-kicik','☕',meiset_id,5),
  -- İdman
  ('İdman avadanlığı','id-avadanliq','🏋️',idman_id,1),
  ('Çadır və turizm','id-turizm','⛺',idman_id,2),
  ('Velosiped','id-velo','🚴',idman_id,3),
  ('Su idmanı','id-su','🏊',idman_id,4),
  ('Qış idmanı','id-qis','⛷️',idman_id,5),
  ('İdman qidası','id-qida','🥤',idman_id,6),
  -- Avto
  ('Ehtiyat hissələri','av-ehtiyat','⚙️',avto_id,1),
  ('Avtomobil aksessuarları','av-aksesuar','🚙',avto_id,2),
  ('Avtomobil kimyası','av-kimya','🧪',avto_id,3),
  ('Şin və disk','av-sin','🛞',avto_id,4),
  -- Ərzaq
  ('Quru ərzaq','er-quru','🌾',erzaq_id,1),
  ('İçkilər','er-icki','🥤',erzaq_id,2),
  ('Şirniyyat','er-sirniyyat','🍬',erzaq_id,3),
  ('Sağlam qida','er-saglam','🥗',erzaq_id,4),
  ('Uşaq qidası','er-usaq','🍼',erzaq_id,5),
  -- Heyvan
  ('İt məhsulları','h-it','🐕',heyvan_id,1),
  ('Pişik məhsulları','h-pisik','🐈',heyvan_id,2),
  ('Quş məhsulları','h-qus','🦜',heyvan_id,3),
  ('Balıq və akvarium','h-baliq','🐠',heyvan_id,4),
  -- Kitab/hobbi
  ('Kitablar','k-kitab','📚',kitab_id,1),
  ('Musiqi alətləri','k-musiqi','🎸',kitab_id,2),
  ('Rəssamlıq','k-ressam','🎨',kitab_id,3),
  ('Kolleksiya əşyaları','k-kolleksiya','🏆',kitab_id,4),
  -- Tikinti
  ('Alətlər','t-aletler','🔧',tikinti_id,1),
  ('Elektrik məhsulları','t-elektrik','🔌',tikinti_id,2),
  ('Boya və material','t-boya','🎨',tikinti_id,3),
  -- Ofis
  ('Dəftərxana','o-defterxana','📝',ofis_id,1),
  ('Çap texnikası','o-cap','🖨️',ofis_id,2)
  ON CONFLICT (slug) DO NOTHING;
END $$;
