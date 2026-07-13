-- AI settings (singleton)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  enabled_shop boolean NOT NULL DEFAULT true,
  enabled_pvz boolean NOT NULL DEFAULT true,
  enabled_dispute boolean NOT NULL DEFAULT true,
  enabled_support boolean NOT NULL DEFAULT true,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt_shop text NOT NULL DEFAULT 'Sən EG Shop-un satıcı asistentisən. Müştəriyə məhsul haqqında qısa, dəqiq və mehriban cavab ver. Qiymət, çatdırılma, stok haqqında yalnız verilmiş kontekst əsasında danış. Bilmirsənsə "Satıcı tezliklə cavab verəcək" de.',
  system_prompt_pvz text NOT NULL DEFAULT 'Sən EG Shop PVZ (çatdırılma nöqtəsi) operatorusan. Müştəriyə sifariş statusu, götürmə kodu, iş saatları, ünvan haqqında qısa cavab ver. Yalnız verilmiş kontekstdən istifadə et.',
  system_prompt_dispute text NOT NULL DEFAULT 'Sən EG Shop mübahisə həll asistentisən. Tərəflərə peşəkar, neytral cavab ver. Qaydaları izah et, kompensasiya barədə qərarı yalnız admin verə bilər.',
  system_prompt_support text NOT NULL DEFAULT 'Sən EG Shop ümumi dəstək asistentisən. İstifadəçilərə platforma, sifariş, ödəniş, çatdırılma, qaytarma haqqında suallarda kömək et. Mehriban və qısa cavab ver. Azərbaycan dilində danış.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_settings (id) 
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.ai_settings);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI settings public read" ON public.ai_settings FOR SELECT USING (true);
CREATE POLICY "AI settings admin manage" ON public.ai_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- FAQ items
CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  question text NOT NULL,
  answer text NOT NULL,
  keywords text,
  audience text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FAQ public read" ON public.faq_items FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "FAQ admin manage" ON public.faq_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- AI chat (support page)
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI chat owner read" ON public.ai_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "AI chat owner insert" ON public.ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Log of AI replies (for audit)
CREATE TABLE IF NOT EXISTS public.ai_replies_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  source_message_id uuid,
  reply_id uuid,
  prompt_tokens int,
  completion_tokens int,
  status text NOT NULL DEFAULT 'ok',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_replies_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI log admin read" ON public.ai_replies_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed some FAQs
INSERT INTO public.faq_items (category, question, answer, audience) VALUES
  ('order', 'Sifarişimi necə izləyə bilərəm?', 'Sifarişlər səhifəsindən və ya bildirişlərdən sifariş statusunu görə bilərsiniz. Hər mərhələdə sizə bildiriş gələcək.', 'buyer'),
  ('payment', 'Hansı ödəniş üsulları var?', 'Nağd ödəniş PVZ-də, kart ilə ödəniş və bonus balansı ilə ödəniş mümkündür.', 'buyer'),
  ('delivery', 'Çatdırılma neçə gün çəkir?', 'Standart çatdırılma 1-3 iş günü, sürətli çatdırılma 24 saat ərzindədir. Şəhərdən asılıdır.', 'buyer'),
  ('return', 'Məhsulu necə qaytara bilərəm?', '14 gün ərzində məhsulu qaytara bilərsiniz. Mübahisə açmaq üçün sifarişlər səhifəsindən "Şikayət et" düyməsini istifadə edin.', 'buyer'),
  ('seller', 'Necə satıcı ola bilərəm?', '"Satıcı ol" səhifəsindən mağaza adını daxil edib satıcı statusu ala bilərsiniz.', 'all'),
  ('pvz', 'Paketi necə götürəcəyəm?', 'PVZ-yə getdiyiniz zaman QR kodu və ya 10 simvollu götürmə kodunu operatora göstərin.', 'buyer'),
  ('bonus', 'Bonus necə qazanılır?', 'Hər təhvil verilmiş sifarişdən 2% bonus qazanırsınız. Bonus balansını növbəti sifarişdə istifadə edə bilərsiniz.', 'buyer');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;