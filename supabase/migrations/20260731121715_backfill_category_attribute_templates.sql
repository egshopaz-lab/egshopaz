-- Complete the catalogue templates for the real category tree. Child
-- categories inherit the closest parent template through
-- catalog_schema_for_category().

insert into public.catalog_attribute_definitions
  (code, name_az, name_ru, name_en, data_type, unit, placeholder)
values
  ('shoe_size', 'Ayaqqabı ölçüsü', 'Размер обуви', 'Shoe size', 'select', null, 'Ölçünü seçin')
on conflict (code) do update
set name_az = excluded.name_az,
    name_ru = excluded.name_ru,
    name_en = excluded.name_en,
    data_type = excluded.data_type,
    unit = excluded.unit,
    placeholder = excluded.placeholder,
    is_active = true;

with option_seed(code, value, label_az, label_ru, label_en, sort_order) as (values
  ('shoe_size','35','35','35','35',1),
  ('shoe_size','36','36','36','36',2),
  ('shoe_size','37','37','37','37',3),
  ('shoe_size','38','38','38','38',4),
  ('shoe_size','39','39','39','39',5),
  ('shoe_size','40','40','40','40',6),
  ('shoe_size','41','41','41','41',7),
  ('shoe_size','42','42','42','42',8),
  ('shoe_size','43','43','43','43',9),
  ('shoe_size','44','44','44','44',10),
  ('shoe_size','45','45','45','45',11),
  ('shoe_size','46','46','46','46',12),
  ('age_group','newborn','Yenidoğulmuş','Новорожденный','Newborn',1),
  ('age_group','0_2','0–2 yaş','0–2 года','0–2 years',2),
  ('age_group','3_5','3–5 yaş','3–5 лет','3–5 years',3),
  ('age_group','6_9','6–9 yaş','6–9 лет','6–9 years',4),
  ('age_group','10_13','10–13 yaş','10–13 лет','10–13 years',5),
  ('age_group','adult','Böyüklər','Взрослые','Adults',6),
  ('fit','slim','Dar kəsim','Приталенный','Slim',1),
  ('fit','regular','Normal kəsim','Обычный','Regular',2),
  ('fit','oversize','Oversayz','Оверсайз','Oversize',3),
  ('skin_type','normal','Normal','Нормальная','Normal',1),
  ('skin_type','dry','Quru','Сухая','Dry',2),
  ('skin_type','oily','Yağlı','Жирная','Oily',3),
  ('skin_type','combination','Qarışıq','Комбинированная','Combination',4),
  ('skin_type','sensitive','Həssas','Чувствительная','Sensitive',5),
  ('volume','30','30 ml','30 мл','30 ml',1),
  ('volume','50','50 ml','50 мл','50 ml',2),
  ('volume','100','100 ml','100 мл','100 ml',3),
  ('volume','250','250 ml','250 мл','250 ml',4),
  ('volume','500','500 ml','500 мл','500 ml',5),
  ('volume','1000','1 l','1 л','1 l',6)
)
insert into public.catalog_attribute_options
  (attribute_id, value, label_az, label_ru, label_en, sort_order, is_active)
select d.id, s.value, s.label_az, s.label_ru, s.label_en, s.sort_order, true
from option_seed s
join public.catalog_attribute_definitions d on d.code = s.code
on conflict (attribute_id, value) do update
set label_az = excluded.label_az,
    label_ru = excluded.label_ru,
    label_en = excluded.label_en,
    sort_order = excluded.sort_order,
    is_active = true;

-- The former generic clothing-size axis was unsuitable for footwear.
delete from public.category_attributes ca
using public.categories c, public.catalog_attribute_definitions d
where ca.category_id = c.id
  and ca.attribute_id = d.id
  and c.slug = 'ayaqqabi'
  and d.code = 'size';

with root_templates(slug, code, required, filterable, variant_axis, sort_order) as (values
  ('qadin-geyimleri','gender',true,true,false,10), ('qadin-geyimleri','material',true,true,false,20), ('qadin-geyimleri','season',false,true,false,30), ('qadin-geyimleri','style',false,true,false,40), ('qadin-geyimleri','fit',false,true,false,50), ('qadin-geyimleri','color',true,true,true,60), ('qadin-geyimleri','size',true,true,true,70),
  ('kisi-geyimleri','gender',true,true,false,10), ('kisi-geyimleri','material',true,true,false,20), ('kisi-geyimleri','season',false,true,false,30), ('kisi-geyimleri','style',false,true,false,40), ('kisi-geyimleri','fit',false,true,false,50), ('kisi-geyimleri','color',true,true,true,60), ('kisi-geyimleri','size',true,true,true,70),
  ('usaq-ve-korpe','age_group',true,true,false,10), ('usaq-ve-korpe','gender',false,true,false,20), ('usaq-ve-korpe','material',false,true,false,30), ('usaq-ve-korpe','color',false,true,true,40), ('usaq-ve-korpe','size',false,true,true,50),
  ('ayaqqabi','gender',true,true,false,10), ('ayaqqabi','material',false,true,false,20), ('ayaqqabi','season',false,true,false,30), ('ayaqqabi','heel_height',false,true,false,40), ('ayaqqabi','color',true,true,true,50), ('ayaqqabi','shoe_size',true,true,true,60),
  ('cantalar-ve-aksesuarlar','material',false,true,false,10), ('cantalar-ve-aksesuarlar','color',false,true,true,20), ('cantalar-ve-aksesuarlar','dimensions',false,true,false,30), ('cantalar-ve-aksesuarlar','style',false,true,false,40),
  ('tikis-el-isi','material',false,true,false,10), ('tikis-el-isi','color',false,true,true,20), ('tikis-el-isi','dimensions',false,true,false,30),
  ('toy-aksesuar','material',false,true,false,10), ('toy-aksesuar','color',false,true,true,20), ('toy-aksesuar','dimensions',false,true,false,30),

  ('gozellik-ve-baxim','skin_type',false,true,false,10), ('gozellik-ve-baxim','volume',false,true,true,20), ('gozellik-ve-baxim','spf',false,true,false,30), ('gozellik-ve-baxim','ingredients',false,false,false,40), ('gozellik-ve-baxim','expiry_date',false,false,false,50),
  ('etriyyat','volume',true,true,true,10), ('etriyyat','gender',false,true,false,20), ('etriyyat','manufacturer',false,true,false,30),
  ('sac-baximi','skin_type',false,true,false,10), ('sac-baximi','volume',false,true,true,20), ('sac-baximi','ingredients',false,false,false,30),
  ('kisi-qullugu','skin_type',false,true,false,10), ('kisi-qullugu','volume',false,true,true,20), ('kisi-qullugu','ingredients',false,false,false,30),
  ('sexsi-gigiyena','volume',false,true,true,10), ('sexsi-gigiyena','ingredients',false,false,false,20), ('sexsi-gigiyena','expiry_date',false,false,false,30),
  ('saglamliq','manufacturer',false,true,false,10), ('saglamliq','ingredients',false,false,false,20), ('saglamliq','expiry_date',false,false,false,30), ('saglamliq','weight_value',false,true,true,40),
  ('tibb-avadanligi','manufacturer',true,true,false,10), ('tibb-avadanligi','brand_model',false,true,false,20), ('tibb-avadanligi','warranty',false,true,false,30), ('tibb-avadanligi','dimensions',false,true,false,40),

  ('erzaq-mehsullari','ingredients',false,false,false,10), ('erzaq-mehsullari','weight_value',true,true,true,20), ('erzaq-mehsullari','calories',false,true,false,30), ('erzaq-mehsullari','expiry_date',true,false,false,40), ('erzaq-mehsullari','flavor',false,true,true,50), ('erzaq-mehsullari','origin',false,true,false,60),
  ('heyvan-mehsullari','manufacturer',false,true,false,10), ('heyvan-mehsullari','weight_value',false,true,true,20), ('heyvan-mehsullari','ingredients',false,false,false,30), ('heyvan-mehsullari','expiry_date',false,false,false,40),
  ('temizlik','volume',false,true,true,10), ('temizlik','weight_value',false,true,true,20), ('temizlik','ingredients',false,false,false,30),

  ('ev-ve-metbex','material',false,true,false,10), ('ev-ve-metbex','dimensions',false,true,false,20), ('ev-ve-metbex','room_type',false,true,false,30), ('ev-ve-metbex','assembly_required',false,true,false,40), ('ev-ve-metbex','color',false,true,true,50),
  ('ev-tekstili','material',true,true,false,10), ('ev-tekstili','dimensions',false,true,false,20), ('ev-tekstili','room_type',false,true,false,30), ('ev-tekstili','color',false,true,true,40),
  ('ofis-mebeli','material',false,true,false,10), ('ofis-mebeli','dimensions',true,true,false,20), ('ofis-mebeli','assembly_required',false,true,false,30), ('ofis-mebeli','color',false,true,true,40),
  ('bag-mebeli','material',false,true,false,10), ('bag-mebeli','dimensions',true,true,false,20), ('bag-mebeli','assembly_required',false,true,false,30), ('bag-mebeli','color',false,true,true,40),
  ('yataq-otagi','material',false,true,false,10), ('yataq-otagi','dimensions',true,true,false,20), ('yataq-otagi','assembly_required',false,true,false,30), ('yataq-otagi','color',false,true,true,40),
  ('usaq-mebel','material',false,true,false,10), ('usaq-mebel','dimensions',true,true,false,20), ('usaq-mebel','assembly_required',false,true,false,30), ('usaq-mebel','color',false,true,true,40),
  ('tikinti-ve-temir','manufacturer',false,true,false,10), ('tikinti-ve-temir','material',false,true,false,20), ('tikinti-ve-temir','dimensions',false,true,false,30), ('tikinti-ve-temir','weight_value',false,true,false,40), ('tikinti-ve-temir','warranty',false,true,false,50),
  ('insaat-materiallari','manufacturer',false,true,false,10), ('insaat-materiallari','material',true,true,false,20), ('insaat-materiallari','dimensions',false,true,false,30), ('insaat-materiallari','weight_value',false,true,true,40),

  ('avtomobil','manufacturer',true,true,false,10), ('avtomobil','brand_model',true,true,false,20), ('avtomobil','color',false,true,true,30), ('avtomobil','warranty',false,true,false,40),
  ('motosiklet','manufacturer',true,true,false,10), ('motosiklet','brand_model',true,true,false,20), ('motosiklet','color',false,true,true,30), ('motosiklet','warranty',false,true,false,40),
  ('velosiped-skuter','manufacturer',false,true,false,10), ('velosiped-skuter','brand_model',false,true,false,20), ('velosiped-skuter','color',false,true,true,30), ('velosiped-skuter','weight_value',false,true,false,40), ('velosiped-skuter','warranty',false,true,false,50),
  ('idman-ve-istirahet','manufacturer',false,true,false,10), ('idman-ve-istirahet','material',false,true,false,20), ('idman-ve-istirahet','dimensions',false,true,false,30), ('idman-ve-istirahet','weight_value',false,true,true,40),
  ('bag-ve-heyet','manufacturer',false,true,false,10), ('bag-ve-heyet','material',false,true,false,20), ('bag-ve-heyet','dimensions',false,true,false,30), ('bag-ve-heyet','warranty',false,true,false,40),

  ('smart-ev','manufacturer',true,true,false,10), ('smart-ev','brand_model',true,true,false,20), ('smart-ev','wifi',false,true,false,30), ('smart-ev','bluetooth',false,true,false,40), ('smart-ev','color',false,true,true,50), ('smart-ev','warranty',false,true,false,60),
  ('metbex-texnikasi','manufacturer',true,true,false,10), ('metbex-texnikasi','brand_model',true,true,false,20), ('metbex-texnikasi','color',false,true,true,30), ('metbex-texnikasi','warranty',false,true,false,40),
  ('meiset-texnikasi','manufacturer',true,true,false,10), ('meiset-texnikasi','brand_model',true,true,false,20), ('meiset-texnikasi','color',false,true,true,30), ('meiset-texnikasi','warranty',false,true,false,40),
  ('iqlim-texnikasi','manufacturer',true,true,false,10), ('iqlim-texnikasi','brand_model',true,true,false,20), ('iqlim-texnikasi','wifi',false,true,false,30), ('iqlim-texnikasi','warranty',false,true,false,40),
  ('foto-video','manufacturer',true,true,false,10), ('foto-video','brand_model',true,true,false,20), ('foto-video','storage',false,true,true,30), ('foto-video','battery',false,true,false,40), ('foto-video','warranty',false,true,false,50),
  ('audio-texnika','manufacturer',true,true,false,10), ('audio-texnika','brand_model',true,true,false,20), ('audio-texnika','bluetooth',false,true,false,30), ('audio-texnika','wifi',false,true,false,40), ('audio-texnika','color',false,true,true,50),
  ('geymer','manufacturer',false,true,false,10), ('geymer','brand_model',false,true,false,20), ('geymer','color',false,true,true,30), ('geymer','warranty',false,true,false,40),
  ('sebeke-avadanligi','manufacturer',true,true,false,10), ('sebeke-avadanligi','brand_model',true,true,false,20), ('sebeke-avadanligi','wifi',false,true,false,30), ('sebeke-avadanligi','network',false,true,false,40), ('sebeke-avadanligi','warranty',false,true,false,50),
  ('agilli-saatlar','manufacturer',true,true,false,10), ('agilli-saatlar','brand_model',true,true,false,20), ('agilli-saatlar','bluetooth',false,true,false,30), ('agilli-saatlar','wifi',false,true,false,40), ('agilli-saatlar','water_resistance',false,true,false,50), ('agilli-saatlar','color',false,true,true,60),
  ('dron','manufacturer',true,true,false,10), ('dron','brand_model',true,true,false,20), ('dron','camera',false,true,false,30), ('dron','battery',false,true,false,40), ('dron','warranty',false,true,false,50),

  ('kitablar-ve-ofis','manufacturer',false,true,false,10), ('kitablar-ve-ofis','material',false,true,false,20), ('kitablar-ve-ofis','dimensions',false,true,false,30), ('kitablar-ve-ofis','origin',false,true,false,40),
  ('hediyye-ve-suvenir','material',false,true,false,10), ('hediyye-ve-suvenir','color',false,true,true,20), ('hediyye-ve-suvenir','dimensions',false,true,false,30), ('hediyye-ve-suvenir','origin',false,true,false,40),
  ('zergerlik-ve-saatlar','material',true,true,false,10), ('zergerlik-ve-saatlar','color',false,true,true,20), ('zergerlik-ve-saatlar','gender',false,true,false,30), ('zergerlik-ve-saatlar','water_resistance',false,true,false,40),
  ('oyun-ve-hobbi','manufacturer',false,true,false,10), ('oyun-ve-hobbi','age_group',false,true,false,20), ('oyun-ve-hobbi','material',false,true,false,30), ('oyun-ve-hobbi','dimensions',false,true,false,40),
  ('oyuncaqlar','manufacturer',false,true,false,10), ('oyuncaqlar','age_group',true,true,false,20), ('oyuncaqlar','material',false,true,false,30), ('oyuncaqlar','color',false,true,true,40),
  ('musiqi-aletleri','manufacturer',false,true,false,10), ('musiqi-aletleri','brand_model',false,true,false,20), ('musiqi-aletleri','material',false,true,false,30), ('musiqi-aletleri','color',false,true,true,40),
  ('senet-resm','manufacturer',false,true,false,10), ('senet-resm','material',false,true,false,20), ('senet-resm','color',false,true,true,30), ('senet-resm','dimensions',false,true,false,40)
)
insert into public.category_attributes
  (category_id, attribute_id, is_required, is_filterable, is_variant, sort_order)
select c.id, d.id, t.required, t.filterable, t.variant_axis, t.sort_order
from root_templates t
join public.categories c on c.slug = t.slug
join public.catalog_attribute_definitions d on d.code = t.code
on conflict (category_id, attribute_id) do update
set is_required = excluded.is_required,
    is_filterable = excluded.is_filterable,
    is_variant = excluded.is_variant,
    sort_order = excluded.sort_order;

-- Every root receives a useful generic template if it still has no explicit
-- one. This prevents an empty editor while still allowing admins to customize
-- each category later.
with fallback(code, filterable, variant_axis, sort_order) as (values
  ('manufacturer', true, false, 10),
  ('brand_model', true, false, 20),
  ('material', true, false, 30),
  ('color', true, true, 40),
  ('dimensions', false, false, 50),
  ('origin', true, false, 60)
)
insert into public.category_attributes
  (category_id, attribute_id, is_required, is_filterable, is_variant, sort_order)
select c.id, d.id, false, f.filterable, f.variant_axis, f.sort_order
from public.categories c
cross join fallback f
join public.catalog_attribute_definitions d on d.code = f.code
where c.parent_id is null
  and not exists (
    select 1 from public.category_attributes existing
    where existing.category_id = c.id
  )
on conflict (category_id, attribute_id) do nothing;
