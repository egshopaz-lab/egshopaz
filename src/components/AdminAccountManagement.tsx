import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Edit3,
  PackageCheck,
  PackageX,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { ACQUISITION_SOURCES, acquisitionSourceLabel } from "@/lib/acquisitionSources";

interface AccountRow {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  shop_name: string | null;
  roles: string[];
  account_status: "active" | "inactive" | "temporary_blocked" | "permanent_blocked";
  blocked_until: string | null;
  block_reason: string | null;
  acquisition_source: string | null;
  acquisition_detail: string | null;
  created_at: string;
  last_active_at: string | null;
  seller_status: string | null;
  seller_payment_status: string | null;
  seller_registration_fee: number | null;
  seller_paid_at: string | null;
  seller_product_access_override: boolean;
}

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  inactive: "Passiv",
  temporary_blocked: "Müvəqqəti blok",
  permanent_blocked: "Daimi blok",
};

const paidStatuses = new Set(["success", "migrated"]);

export function AdminAccountManagement({
  initialRole,
}: {
  initialRole: "buyer" | "seller" | "pvz";
}) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [payment, setPayment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc(
      "admin_list_accounts" as never,
      {
        _search: search.trim() || null,
        _role: initialRole,
        _status: status || null,
        _source: source || null,
        _limit: 300,
      } as never,
    );
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as AccountRow[]);
    setLoading(false);
  }, [initialRole, search, source, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const visibleRows =
    initialRole !== "seller" || !payment
      ? rows
      : rows.filter((row) =>
          payment === "paid"
            ? paidStatuses.has(row.seller_payment_status ?? "")
            : !paidStatuses.has(row.seller_payment_status ?? ""),
        );

  const invokeAction = async (
    row: AccountRow,
    action: string,
    options: Record<string, unknown> = {},
  ) => {
    setBusyId(row.user_id);
    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: { target_user_id: row.user_id, action, ...options },
    });
    setBusyId(null);
    if (error || !data?.ok) {
      toast.error(data?.error ?? error?.message ?? "Əməliyyat alınmadı");
      return;
    }
    toast.success("Əməliyyat tamamlandı və Audit Log-a yazıldı");
    await load();
  };

  const edit = async (row: AccountRow) => {
    const full_name = prompt("Ad Soyad:", row.full_name ?? "");
    if (full_name === null) return;
    const phone = prompt("Telefon:", row.phone ?? "");
    if (phone === null) return;
    const email = prompt("E-poçt:", row.email);
    if (email === null) return;
    const shop_name = prompt("Mağaza adı:", row.shop_name ?? "");
    if (shop_name === null) return;
    const acquisition_source = prompt(
      `Mənbə kodu (${ACQUISITION_SOURCES.map((x) => x.value).join(", ")}):`,
      row.acquisition_source ?? "",
    );
    if (acquisition_source === null) return;
    const acquisition_detail = prompt("Cəlb edən şəxs/mənbə detalı:", row.acquisition_detail ?? "");
    if (acquisition_detail === null) return;
    await invokeAction(row, "edit", {
      profile_patch: {
        full_name,
        phone,
        email,
        shop_name,
        acquisition_source: acquisition_source || null,
        acquisition_detail,
      },
    });
  };

  const toggleProductAccess = async (row: AccountRow) => {
    const granting = !row.seller_product_access_override;
    const reason = prompt(
      granting ? "Ödənişsiz məhsul icazəsinin səbəbi:" : "Məhsul icazəsinin ləğv səbəbi:",
      granting ? "Admin tərəfindən xüsusi icazə" : "",
    );
    if (reason === null) return;
    setBusyId(row.user_id);
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData.user?.id;
    if (!adminId) {
      setBusyId(null);
      toast.error("Admin sessiyası tapılmadı");
      return;
    }
    const { error } = await supabase.rpc(
      "admin_set_seller_product_access" as never,
      {
        _admin_id: adminId,
        _target_id: row.user_id,
        _allowed: granting,
        _reason: reason,
        _admin_email: authData.user?.email ?? null,
        _ip_address: null,
        _user_agent: navigator.userAgent,
      } as never,
    );
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      granting ? "Məhsul yerləşdirmə icazəsi verildi" : "Məhsul yerləşdirmə icazəsi ləğv edildi",
    );
    await load();
  };

  const actionCls =
    "inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50";
  const columnCount = initialRole === "seller" ? 8 : 7;

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ad, e-poçt, telefon, mağaza və ya cəlb edən şəxs..."
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-input bg-background"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 px-3 rounded-lg border border-input bg-background"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {initialRole === "seller" && (
          <select
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
            className="h-11 px-3 rounded-lg border border-input bg-background"
          >
            <option value="">Bütün ödənişlər</option>
            <option value="paid">Ödəniş edənlər</option>
            <option value="unpaid">Ödəniş etməyənlər</option>
          </select>
        )}
        <select
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="h-11 px-3 rounded-lg border border-input bg-background"
        >
          <option value="">Bütün mənbələr</option>
          {ACQUISITION_SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-muted-foreground">{visibleRows.length} nəticə</div>
      <div className="grid gap-3 lg:hidden">
        {loading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Yüklənir...
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nəticə yoxdur
          </div>
        ) : (
          visibleRows.map((row) => {
            const paid = paidStatuses.has(row.seller_payment_status ?? "");
            const productAccess = paid || row.seller_product_access_override;
            return (
              <article
                key={row.user_id}
                className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-extrabold">{row.full_name ?? "Adsız"}</h3>
                    <div className="truncate text-xs">{row.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.phone ?? "—"}
                      {row.shop_name ? ` · ${row.shop_name}` : ""}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${row.account_status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                  >
                    {statusLabels[row.account_status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/40 p-3 text-xs">
                  <div>
                    <span className="block text-muted-foreground">Mənbə</span>
                    <b>{acquisitionSourceLabel(row.acquisition_source)}</b>
                    <p className="break-words text-muted-foreground">
                      {row.acquisition_detail ?? "—"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Qeydiyyat</span>
                    <b>{formatDate(row.created_at)}</b>
                    <p className="text-muted-foreground">
                      Son aktivlik: {row.last_active_at ? formatDate(row.last_active_at) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {row.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary"
                    >
                      {role}
                    </span>
                  ))}
                </div>
                {initialRole === "seller" && (
                  <div className="space-y-2 rounded-xl border p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b>Satıcı ödənişi</b>
                      <span
                        className={`rounded-full px-2 py-1 font-bold ${paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                      >
                        {paid ? "Ödəniş edilib" : "Ödəniş edilməyib"}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Məbləğ: {formatAZN(Number(row.seller_registration_fee ?? 0))}
                    </p>
                    <p
                      className={
                        productAccess
                          ? "font-semibold text-success"
                          : "font-semibold text-destructive"
                      }
                    >
                      {productAccess
                        ? paid
                          ? "Məhsul icazəsi avtomatikdir"
                          : "Məhsul icazəsi admin tərəfindən verilib"
                        : "Məhsul yerləşdirə bilməz"}
                    </p>
                    {!paid && (
                      <button
                        disabled={busyId === row.user_id}
                        onClick={() => void toggleProductAccess(row)}
                        className={`${actionCls} ${productAccess ? "text-destructive" : "text-success"}`}
                      >
                        {productAccess ? (
                          <PackageX className="h-3 w-3" />
                        ) : (
                          <PackageCheck className="h-3 w-3" />
                        )}
                        {productAccess ? "İcazəni ləğv et" : "Məhsula icazə ver"}
                      </button>
                    )}
                  </div>
                )}
                {row.block_reason && (
                  <div className="rounded-xl bg-destructive/5 p-3 text-xs text-destructive">
                    {row.block_reason}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 border-t pt-3">
                  <button
                    disabled={busyId === row.user_id}
                    onClick={() => void edit(row)}
                    className={actionCls}
                  >
                    <Edit3 className="h-3 w-3" />
                    Redaktə
                  </button>
                  {row.account_status === "active" ? (
                    <button
                      disabled={busyId === row.user_id}
                      onClick={() => {
                        const reason = prompt("Passiv etmə səbəbi:") ?? "";
                        void invokeAction(row, "deactivate", { reason });
                      }}
                      className={actionCls}
                    >
                      <UserX className="h-3 w-3" />
                      Passiv
                    </button>
                  ) : (
                    <button
                      disabled={busyId === row.user_id}
                      onClick={() => void invokeAction(row, "restore")}
                      className={`${actionCls} text-success`}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Bərpa
                    </button>
                  )}
                  <button
                    disabled={busyId === row.user_id}
                    onClick={() => {
                      const hours = Number(prompt("Neçə saat bloklansın?", "24") ?? 0);
                      if (hours > 0) {
                        const reason = prompt("Səbəb:") ?? "";
                        void invokeAction(row, "temporary_block", {
                          reason,
                          block_minutes: hours * 60,
                        });
                      }
                    }}
                    className={actionCls}
                  >
                    <Ban className="h-3 w-3" />
                    Müvəqqəti blok
                  </button>
                  <button
                    disabled={busyId === row.user_id}
                    onClick={() => {
                      const reason = prompt("Daimi blok səbəbi:");
                      if (reason !== null) void invokeAction(row, "permanent_block", { reason });
                    }}
                    className={`${actionCls} text-destructive`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Daimi blok
                  </button>
                  <button
                    disabled={busyId === row.user_id}
                    onClick={() => {
                      const word = prompt("Tam silmək üçün DELETE yazın:");
                      if (word === "DELETE") {
                        const reason = prompt("Silmə səbəbi:") ?? "";
                        void invokeAction(row, "hard_delete", { reason });
                      }
                    }}
                    className={`${actionCls} text-destructive`}
                  >
                    <Trash2 className="h-3 w-3" />
                    Tam sil
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
      <div className="hidden rounded-2xl border border-border bg-card overflow-x-auto lg:block">
        <table className="w-full text-sm min-w-[1280px]">
          <thead className="bg-secondary/50 text-left">
            <tr>
              <th className="p-3">Hesab</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Mənbə / cəlb edən</th>
              <th className="p-3">Qeydiyyat</th>
              <th className="p-3">Son aktivlik</th>
              <th className="p-3">Status</th>
              {initialRole === "seller" && <th className="p-3">Ödəniş və məhsul icazəsi</th>}
              <th className="p-3">Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="p-8 text-center text-muted-foreground">
                  Yüklənir...
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-8 text-center text-muted-foreground">
                  Nəticə yoxdur
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const paid = paidStatuses.has(row.seller_payment_status ?? "");
                const productAccess = paid || row.seller_product_access_override;
                return (
                  <tr key={row.user_id} className="border-t border-border align-top">
                    <td className="p-3">
                      <b>{row.full_name ?? "Adsız"}</b>
                      <div className="text-xs">{row.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.phone ?? "—"}
                        {row.shop_name ? ` · ${row.shop_name}` : ""}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {row.roles.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <b>{acquisitionSourceLabel(row.acquisition_source)}</b>
                      <div className="text-xs text-muted-foreground max-w-[220px]">
                        {row.acquisition_detail ?? "—"}
                      </div>
                    </td>
                    <td className="p-3 text-xs">{formatDate(row.created_at)}</td>
                    <td className="p-3 text-xs">
                      {row.last_active_at ? formatDate(row.last_active_at) : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${row.account_status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                      >
                        {statusLabels[row.account_status]}
                      </span>
                      {row.block_reason && (
                        <div className="text-xs mt-1 max-w-[180px]">{row.block_reason}</div>
                      )}
                    </td>
                    {initialRole === "seller" && (
                      <td className="p-3 min-w-[230px] space-y-2">
                        <div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                          >
                            {paid ? "Ödəniş edilib" : "Ödəniş edilməyib"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Məbləğ: {formatAZN(Number(row.seller_registration_fee ?? 0))}
                        </div>
                        {row.seller_paid_at && (
                          <div className="text-xs text-muted-foreground">
                            Ödəniş tarixi: {formatDate(row.seller_paid_at)}
                          </div>
                        )}
                        <div
                          className={`text-xs font-semibold ${productAccess ? "text-success" : "text-destructive"}`}
                        >
                          {productAccess
                            ? paid
                              ? "Məhsul icazəsi: avtomatik"
                              : "Məhsul icazəsi: admin tərəfindən"
                            : "Məhsul yerləşdirə bilməz"}
                        </div>
                        {!paid && (
                          <button
                            disabled={busyId === row.user_id}
                            onClick={() => void toggleProductAccess(row)}
                            className={`${actionCls} ${productAccess ? "text-destructive" : "text-success"}`}
                          >
                            {productAccess ? (
                              <PackageX className="h-3 w-3" />
                            ) : (
                              <PackageCheck className="h-3 w-3" />
                            )}
                            {productAccess ? "İcazəni ləğv et" : "Məhsula icazə ver"}
                          </button>
                        )}
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          disabled={busyId === row.user_id}
                          onClick={() => void edit(row)}
                          className={actionCls}
                        >
                          <Edit3 className="h-3 w-3" />
                          Redaktə
                        </button>
                        {row.account_status === "active" ? (
                          <button
                            disabled={busyId === row.user_id}
                            onClick={() => {
                              const reason = prompt("Passiv etmə səbəbi:") ?? "";
                              void invokeAction(row, "deactivate", { reason });
                            }}
                            className={actionCls}
                          >
                            <UserX className="h-3 w-3" />
                            Passiv
                          </button>
                        ) : (
                          <button
                            disabled={busyId === row.user_id}
                            onClick={() => void invokeAction(row, "restore")}
                            className={`${actionCls} text-success`}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Bərpa
                          </button>
                        )}
                        <button
                          disabled={busyId === row.user_id}
                          onClick={() => {
                            const hours = Number(prompt("Neçə saat bloklansın?", "24") ?? 0);
                            if (hours > 0) {
                              const reason = prompt("Səbəb:") ?? "";
                              void invokeAction(row, "temporary_block", {
                                reason,
                                block_minutes: hours * 60,
                              });
                            }
                          }}
                          className={actionCls}
                        >
                          <Ban className="h-3 w-3" />
                          Müvəqqəti
                        </button>
                        <button
                          disabled={busyId === row.user_id}
                          onClick={() => {
                            const reason = prompt("Daimi blok səbəbi:");
                            if (reason !== null)
                              void invokeAction(row, "permanent_block", { reason });
                          }}
                          className={`${actionCls} text-destructive`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Daimi
                        </button>
                        <button
                          disabled={busyId === row.user_id}
                          onClick={() => {
                            const word = prompt("Tam silmək üçün DELETE yazın:");
                            if (word === "DELETE") {
                              const reason = prompt("Silmə səbəbi:") ?? "";
                              void invokeAction(row, "hard_delete", { reason });
                            }
                          }}
                          className={`${actionCls} text-destructive`}
                        >
                          <Trash2 className="h-3 w-3" />
                          Tam sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
