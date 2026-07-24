import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isValidE164Phone, normalizeE164Phone } from "@/lib/phone";
import { PhoneNumberField } from "@/components/PhoneNumberField";

interface PhoneVerificationCardProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  onVerified?: () => void | Promise<void>;
  title?: string;
}

export function PhoneVerificationCard({
  phone,
  onPhoneChange,
  onVerified,
  title = "Telefon nömrəsini təsdiqləyin",
}: PhoneVerificationCardProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const normalizedPhone = useMemo(() => normalizeE164Phone(phone), [phone]);
  const verifiedPhone = user?.phone ? normalizeE164Phone(user.phone) : "";
  const isVerified = Boolean(
    user?.phone_confirmed_at
    && verifiedPhone
    && verifiedPhone === normalizedPhone,
  );

  useEffect(() => {
    if (!phone && user?.phone) onPhoneChange(normalizeE164Phone(user.phone));
  }, [onPhoneChange, phone, user?.phone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!isValidE164Phone(normalizedPhone)) {
      toast.error("Telefon nömrəsini ölkə kodu ilə düzgün daxil edin");
      return;
    }
    if (!user) {
      toast.error("Əvvəlcə e-poçt hesabınıza daxil olun");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ phone: normalizedPhone });
    setBusy(false);
    if (error) {
      toast.error(error.message || "SMS kodu göndərilə bilmədi");
      return;
    }
    onPhoneChange(normalizedPhone);
    setSent(true);
    setCooldown(60);
    toast.success("6 rəqəmli təsdiq kodu SMS-lə göndərildi");
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("6 rəqəmli kodu daxil edin");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: code,
      type: "phone_change",
    });
    if (error) {
      setBusy(false);
      toast.error(error.message || "SMS kodu yanlışdır və ya vaxtı bitib");
      return;
    }

    await supabase.auth.refreshSession();
    setBusy(false);
    toast.success("Telefon nömrəsi təsdiqləndi");
    await onVerified?.();
  };

  if (isVerified) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900">
        <div className="flex items-center gap-3">
          <BadgeCheck className="h-6 w-6" />
          <div>
            <div className="font-bold">Telefon təsdiqlənib</div>
            <div className="text-sm">{verifiedPhone}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Təhlükəsizlik üçün nömrənizə göndərilən 6 rəqəmli kodu daxil edin.
          </p>
        </div>
      </div>

      <PhoneNumberField
        value={phone}
        onChange={(value) => {
          onPhoneChange(value);
          setSent(false);
          setCode("");
        }}
        disabled={busy}
        required
      />

      {sent && (
        <div className="mt-3">
          <label className="text-sm font-semibold" htmlFor="phone-verification-code">
            SMS təsdiq kodu
          </label>
          <input
            id="phone-verification-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-center text-xl font-bold tracking-[0.35em]"
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!sent ? (
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
            SMS kodu göndər
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={verifyCode}
              disabled={busy || code.length !== 6}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Kodu təsdiqlə
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || cooldown > 0}
              className="h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50"
            >
              {cooldown > 0 ? `Yenidən göndər (${cooldown})` : "Yenidən göndər"}
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        SMS xərclərinin və saxta sorğuların qarşısını almaq üçün kod yalnız 60 saniyədən bir göndərilir.
      </p>
    </div>
  );
}

