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

Supabase bağlantısı `src/supabase.js` daxilində konfiqurasiya olunub.

Yeni layihədə SQL Editor vasitəsilə faylları bu sıra ilə tam işlədin:

1. `supabase/schema.sql`
2. `supabase/upgrade-002.sql`
3. `supabase/upgrade-003-auth-repair.sql`
4. `supabase/upgrade-004-commerce-integrity.sql`

Mövcud bazada 003 və 004 yeniləmələrini sıra ilə işlədin. 003 qeydiyyat triggerini və çatışmayan profilləri bərpa edir. 004 səbət miqdarını, stok yoxlamasını və sifariş məbləğinin serverdə təhlükəsiz hesablanmasını düzəldir.

Supabase Authentication → URL Configuration bölməsində `https://egshop.az` ünvanını **Site URL** kimi qeyd edin. E-poçt təsdiqi aktivdirsə, `https://egshop.az/**` ünvanını **Redirect URLs** siyahısına da əlavə edin.

İlk admin istifadəçini yaratdıqdan sonra:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@egshop.az');
```

Satıcı rolu üçün `admin` əvəzinə `seller` istifadə edin.
