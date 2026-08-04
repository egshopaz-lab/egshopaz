import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getBusinessModuleDescription,
  getBusinessModuleIcon,
  getBusinessModuleName,
  type BusinessModule,
} from "@/lib/businessModules";
import { cn } from "@/lib/utils";
import { formatAZN } from "@/lib/format";

interface BusinessModuleSelectorProps {
  selectedCodes?: string[];
  required?: boolean;
  onSaved?: (codes: string[]) => void;
}

export function BusinessModuleSelector({
  selectedCodes,
  required = false,
  onSaved,
}: BusinessModuleSelectorProps) {
  const { i18n } = useTranslation();
  const [modules, setModules] = useState<BusinessModule[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedCodes ?? []));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCodes) setSelected(new Set(selectedCodes));
  }, [selectedCodes]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const moduleResult = await (supabase as any)
        .from("business_modules")
        .select(
          "code,name_az,name_en,name_ru,description_az,description_en,description_ru,icon_key,sort_order,is_active,activation_fee,monthly_fee,commission_percent,config",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;
      if (moduleResult.error) {
        setLoadError(moduleResult.error.message);
        setLoading(false);
        return;
      }

      setModules((moduleResult.data ?? []) as BusinessModule[]);

      if (selectedCodes === undefined) {
        const sessionResult = await supabase.auth.getUser();
        const sellerId = sessionResult.data.user?.id;
        if (sellerId) {
          const selectedResult = await (supabase as any)
            .from("seller_business_modules")
            .select("module_code")
            .eq("seller_id", sellerId);
          if (!selectedResult.error) {
            setSelected(
              new Set(
                (selectedResult.data ?? []).map(
                  (row: { module_code: string }) => row.module_code,
                ),
              ),
            );
          }
        }
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedCodes]);

  const sortedSelection = useMemo(() => Array.from(selected).sort(), [selected]);

  const toggle = (code: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const save = async () => {
    if (selected.size === 0) {
      toast.error("Ən azı bir biznes modulu seçin");
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("set_my_business_modules", {
      _module_codes: sortedSelection,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const savedCodes = (data ?? []).map((row: { module_code: string }) => row.module_code);
    setSelected(new Set(savedCodes));
    toast.success("Biznes modulları yadda saxlanıldı");
    onSaved?.(savedCodes);
  };

  const content = (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {required ? <LockKeyhole className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
        </div>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          Biznes istiqamətinizi seçin
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
          Bir və ya bir neçə modul seçə bilərsiniz. Seçdiyiniz modullar satıcı iş
          məkanınızın imkanlarını müəyyən edəcək.
        </p>
        {required && (
          <p className="mt-2 text-sm font-semibold text-primary">
            Ödəniş tamamlanıb. Kabinetə keçmək üçün ən azı bir modul seçin.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-bold text-destructive">Modullar yüklənmədi</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = getBusinessModuleIcon(module.icon_key);
              const active = selected.has(module.code);
              return (
                <button
                  key={module.code}
                  type="button"
                  onClick={() => toggle(module.code)}
                  aria-pressed={active}
                  className={cn(
                    "group relative min-h-40 rounded-2xl border p-5 text-left transition-all",
                    "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg",
                    active
                      ? "border-primary bg-primary/[0.06] shadow-md ring-2 ring-primary/15"
                      : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="block pr-8 text-base font-extrabold">
                    {getBusinessModuleName(module, i18n.language)}
                  </span>
                  <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">
                    {getBusinessModuleDescription(module, i18n.language)}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    {Number(module.activation_fee ?? 0) > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                        Aktivləşdirmə: {formatAZN(Number(module.activation_fee))}
                      </span>
                    )}
                    {Number(module.monthly_fee ?? 0) > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        Aylıq: {formatAZN(Number(module.monthly_fee))}
                      </span>
                    )}
                    {module.commission_percent !== null && module.commission_percent !== undefined && (
                      <span className="rounded-full bg-muted px-2 py-1">
                        Komissiya: {Number(module.commission_percent)}%
                      </span>
                    )}
                    {Number(module.activation_fee ?? 0) === 0 && Number(module.monthly_fee ?? 0) === 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Pulsuz modul</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sticky bottom-4 z-10 mt-7 flex flex-col items-center justify-between gap-3 rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur sm:flex-row">
            <div>
              <p className="font-bold">{selected.size} modul seçilib</p>
              <p className="text-xs font-semibold text-primary">
                Aktivləşdirmə: {formatAZN(modules.filter((module) => selected.has(module.code)).reduce((sum, module) => sum + Number(module.activation_fee ?? 0), 0))}
                {" · "}Aylıq: {formatAZN(modules.filter((module) => selected.has(module.code)).reduce((sum, module) => sum + Number(module.monthly_fee ?? 0), 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                Seçimi sonradan "Biznes modulları" bölməsindən dəyişə bilərsiniz.
              </p>
            </div>
            <button
              type="button"
              disabled={saving || selected.size === 0}
              onClick={() => void save()}
              className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {required ? "Kabinetə davam et" : "Seçimi yadda saxla"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (!required) return content;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.05] via-background to-background px-4 py-8 md:py-12">
      {content}
    </main>
  );
}
