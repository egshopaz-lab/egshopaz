# EG Shop

Supabase backend ilə işləyən, asılılıqsız mağaza vitrini.

## Yerli işə salma

```bash
npm run dev
```

## Production build

```bash
npm run build
```

Build nəticəsi `dist/` qovluğuna yazılır. Serverə göndərməzdən əvvəl build əmrini hər dəfə yenidən işlədin; Nginx `dist/` qovluğunu servis etməlidir.

## Supabase quraşdırılması

SQL Editor vasitəsilə faylları bu sıra ilə işlədin:

1. `supabase/schema.sql`
2. `supabase/upgrade-002.sql`
3. `supabase/upgrade-003-auth-repair.sql`
4. `supabase/upgrade-004-commerce-integrity.sql`
5. `supabase/upgrade-005-checkout-and-input-safety.sql`

Mövcud production bazasında yalnız hələ işlədilməmiş upgrade fayllarını sıra ilə tətbiq edin. 005 sifarişi bir DB tranzaksiyasında tamamlayır və təhlükəli marketplace mətnlərini bloklayır.

Supabase Authentication → URL Configuration bölməsində `https://egshop.az` ünvanını **Site URL**, `https://egshop.az/**` ünvanını **Redirect URLs** kimi qeyd edin.

İlk admin istifadəçini yaratdıqdan sonra:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@egshop.az');
```

## Nginx

`deploy/nginx.conf.example` təhlükəsizlik başlıqlarını ehtiva edir. Server konfiqurasiyasına uyğunlaşdırdıqdan sonra `nginx -t` ilə yoxlayıb Nginx-i reload edin. HSTS sətrini yalnız HTTPS server blokunda aktivləşdirin.
