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

Mövcud bazada qeydiyyat və profil problemi varsa, ən azı `upgrade-003-auth-repair.sql` faylını işlədin. Bu yeniləmə qeydiyyat triggerini bərpa edir və profili yaranmamış köhnə istifadəçiləri düzəldir.

Supabase Authentication → URL Configuration bölməsində saytın real ünvanını **Site URL** kimi qeyd edin. E-poçt təsdiqi aktivdirsə, həmin ünvanı **Redirect URLs** siyahısına da əlavə edin.

İlk admin istifadəçini yaratdıqdan sonra:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@egshop.az');
```

Satıcı rolu üçün `admin` əvəzinə `seller` istifadə edin.
