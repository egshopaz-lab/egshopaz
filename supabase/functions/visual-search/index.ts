// Visual search through any OpenAI-compatible chat-completions provider.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 tələb olunur" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_URL = Deno.env.get("AI_API_URL");
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    const AI_MODEL = Deno.env.get("AI_MODEL");
    if (!AI_API_URL || !AI_API_KEY || !AI_MODEL) {
      throw new Error("AI_API_URL, AI_API_KEY və AI_MODEL konfiqurasiya olunmayıb");
    }

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "Sən məhsul tanıma asistantısan. Şəkildəki əsas məhsulu analiz edib Azərbaycan dilində qısa axtarış açar sözləri qaytarırsan.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Bu şəkildəki məhsulu analiz et və axtarış parametrlərini qaytar." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "search_params",
            description: "Şəkildən çıxarılan axtarış parametrləri",
            parameters: {
              type: "object",
              properties: {
                keywords: { type: "string", description: "1-3 sözlük əsas axtarış sorğusu (məs: 'qırmızı koftə', 'qara krossovka'). Azərbaycan dilində." },
                category: { type: "string", description: "Kateqoriya: geyim, ayaqqabı, texnika, aksesuar, ev, idman, uşaq, gözəllik, digər" },
                color: { type: "string", description: "Əsas rəng (azərbaycanca): qırmızı, mavi, qara, ağ, yaşıl, sarı, narıncı, çəhrayı, boz, qəhvəyi və s. Əgər rəng dəqiq deyilsə boş qoy." },
                brand: { type: "string", description: "Əgər loqo/brand görünürsə adını yaz, yoxsa boş qoy" },
                description: { type: "string", description: "Məhsul haqqında 1 cümləlik təsvir" },
              },
              required: ["keywords", "category", "color", "brand", "description"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "search_params" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çox sayda sorğu. Bir az gözləyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI provayderi ödəniş tələb edir və ya kredit limiti bitib." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI xətası" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI nəticə qaytarmadı" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visual-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Naməlum xəta" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
