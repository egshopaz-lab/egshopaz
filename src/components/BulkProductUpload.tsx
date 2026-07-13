import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props { sellerId: string; onDone?: () => void }

// Simple CSV parser (handles quoted fields with commas)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

const TEMPLATE = `title,price,old_price,stock,brand,sku,description,image_url,delivery_days_min,delivery_days_max,delivery_city,free_shipping
"Nümunə məhsul 1",29.99,39.99,100,"Brend A","SKU-001","Məhsulun təsviri","https://example.com/img1.jpg",1,3,"Bakı",true
"Nümunə məhsul 2",15.5,,50,"Brend B","SKU-002","İkinci məhsul","",2,5,"Bakı",false`;

export function BulkProductUpload({ sellerId, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "elzan-mehsul-sablonu.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { toast.error("Fayl boşdur və ya başlıq sətri yoxdur"); setBusy(false); return; }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);
    const iTitle = idx("title");
    const iPrice = idx("price");
    if (iTitle < 0 || iPrice < 0) {
      toast.error("Fayl 'title' və 'price' sütunlarını saxlamalıdır");
      setBusy(false);
      return;
    }

    const errors: string[] = [];
    const inserts: any[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const title = (row[iTitle] ?? "").trim();
      const price = parseFloat(row[iPrice] ?? "");
      if (!title || isNaN(price) || price <= 0) {
        errors.push(`Sətir ${r + 1}: title və qiymət düzgün deyil`);
        continue;
      }
      const get = (n: string) => { const i = idx(n); return i >= 0 ? (row[i] ?? "").trim() : ""; };
      const num = (n: string) => { const v = get(n); const x = parseFloat(v); return isNaN(x) ? null : x; };
      const intnum = (n: string, d = 0) => { const v = get(n); const x = parseInt(v); return isNaN(x) ? d : x; };
      const bool = (n: string) => { const v = get(n).toLowerCase(); return v === "true" || v === "1" || v === "yes" || v === "bəli"; };

      const img = get("image_url");
      inserts.push({
        seller_id: sellerId,
        title: title.slice(0, 200),
        price,
        old_price: num("old_price"),
        stock: intnum("stock", 0),
        brand: get("brand") || null,
        sku: get("sku") || null,
        description: get("description") || null,
        image_url: img || null,
        images: img ? [img] : [],
        delivery_days_min: intnum("delivery_days_min", 1),
        delivery_days_max: intnum("delivery_days_max", 3),
        delivery_city: get("delivery_city") || "Bakı",
        free_shipping: bool("free_shipping"),
        is_active: true,
      });
    }

    let ok = 0;
    // batch in chunks of 50
    for (let i = 0; i < inserts.length; i += 50) {
      const batch = inserts.slice(i, i + 50);
      const { error } = await supabase.from("products").insert(batch);
      if (error) errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
      else ok += batch.length;
    }

    setResult({ ok, fail: inserts.length - ok + (rows.length - 1 - inserts.length), errors: errors.slice(0, 10) });
    if (ok > 0) toast.success(`${ok} məhsul əlavə olundu`);
    if (errors.length > 0) toast.error(`${errors.length} xəta`);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    onDone?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2 mb-1"><Upload className="h-5 w-5 text-primary" /> Toplu məhsul yükləmə (CSV)</h3>
        <p className="text-sm text-muted-foreground">Bir faylda yüzlərlə məhsul əlavə edin. Şablonu yükləyin, doldurub geri yükləyin.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary text-sm">
          <Download className="h-4 w-4" /> CSV şablonunu yüklə
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm"
        >
          <FileText className="h-4 w-4" /> {busy ? "Yüklənir..." : "Faylı seç və yüklə"}
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
        <div className="font-semibold mb-1">Tələb olunan sütunlar:</div>
        <code>title, price</code> (digərləri opsionaldır: old_price, stock, brand, sku, description, image_url, delivery_days_min/max, delivery_city, free_shipping)
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">{result.ok} məhsul uğurla əlavə olundu</span>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
                <AlertCircle className="h-4 w-4" /> Xətalar:
              </div>
              {result.errors.map((e, i) => <div key={i} className="text-xs text-destructive">{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
