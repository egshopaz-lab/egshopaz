import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Şifrəni yenilə — EG Shop" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  useEffect(() => {
    // Supabase recovery link sets a session via URL hash; listener fires on PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = z.string().min(6, "Şifrə minimum 6 simvol").max(72).safeParse(password);
    if (!v.success) { toast.error(v.error.issues[0].message); return; }
    if (password !== confirm) { toast.error("Şifrələr uyğun gəlmir"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Şifrəniz uğurla yeniləndi");
    navigate({ to: "/" });
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="container mx-auto px-4 py-10 max-w-md">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
        <h1 className="text-2xl font-extrabold mb-1">Yeni şifrə təyin edin</h1>
        <p className="text-sm text-muted-foreground mb-5">
          {ready ? "Yeni şifrənizi daxil edin." : "Bərpa linkini yoxlayırıq..."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <input type={show1 ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Yeni şifrə (min 6 simvol)" maxLength={72} autoComplete="new-password" className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShow1((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition">
              {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input type={show2 ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Yeni şifrəni təkrar daxil edin" maxLength={72} autoComplete="new-password" className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShow2((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition">
              {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button type="submit" disabled={busy || !ready}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60">
            {busy ? "..." : "Şifrəni yenilə"}
          </button>
        </form>
      </div>
    </div>
  );
}
