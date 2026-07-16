-- Repair advertising labels that were inserted from a previously mojibake-encoded migration.
update public.ad_service_types
set
  name = case slug
    when 'shop_promotion' then 'Mağazanı reklam et'
    when 'product_promotion' then 'Məhsulu irəli çək'
    when 'banner_promotion' then 'Banner reklamı'
    else name
  end,
  description = case slug
    when 'shop_promotion' then 'Mağazanı ana səhifədə və seçilmiş vitrinlərdə göstərir.'
    when 'product_promotion' then 'Məhsulu kataloqda və ana səhifədə ön sıralara çıxarır.'
    when 'banner_promotion' then 'Şəkil və ya video bannerini seçilmiş reklam mövqeyində göstərir.'
    else description
  end,
  updated_at = now()
where slug in ('shop_promotion', 'product_promotion', 'banner_promotion');
