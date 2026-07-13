import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Upload, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Result {
  keywords: string;
  category: string;
  color: string;
  brand: string;
  description: string;
}

export function VisualSearchDialog({
  open, onOpenChange, trigger,
}: { open: boolean; onOpenChange: (v: boolean) => void; trigger?: React.ReactNode }) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => { setPreview(null); setResult(null); setLoading(false); };

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Yalnız şəkil faylları");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Şəkil 8MB-dan kiçik olmalıdır");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setLoading(true);
      setResult(null);

      const base64 = dataUrl.split(",")[1];
      try {
        const { data, error } = await supabase.functions.invoke("visual-search", {
          body: { imageBase64: base64, mimeType: file.type },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setResult(data as Result);
      } catch (err: any) {
        toast.error(err?.message || "AI xətası");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const goSearch = () => {
    if (!result) return;
    onOpenChange(false);
    setTimeout(() => {
      navigate({ to: "/catalog", search: { q: result.keywords, cat: undefined } as never });
      reset();
    }, 100);
  };

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Şəkillə axtarış (AI)
            </DialogTitle>
          </DialogHeader>

          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

          {!preview && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Məhsulun şəklini yüklə — AI tanıyıb avtomatik axtaracaq.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition">
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Şəkil çək</span>
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition">
                  <Upload className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Qalereyadan</span>
                </button>
              </div>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="relative">
                <img src={preview} alt="preview" className="w-full h-48 object-contain rounded-lg bg-secondary" />
                <button onClick={reset}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/90 hover:bg-background shadow">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI şəkli analiz edir...
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5 text-sm">
                    <p><span className="font-semibold">Tapılan:</span> {result.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        🔍 {result.keywords}
                      </span>
                      {result.category && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                          {result.category}
                        </span>
                      )}
                      {result.color && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                          🎨 {result.color}
                        </span>
                      )}
                      {result.brand && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                          🏷️ {result.brand}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button onClick={goSearch} className="w-full" size="lg">
                    Bu məhsulu axtar →
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
