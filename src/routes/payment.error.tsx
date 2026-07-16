import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/payment/error")({
  validateSearch: z.object({ payment_id: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Ödəniş tamamlanmadı — EG Shop" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PaymentError,
});
function PaymentError() {
  return <main className="container mx-auto max-w-lg px-4 py-16 text-center"><AlertCircle className="mx-auto h-20 w-20 text-rose-500" /><h1 className="mt-5 text-3xl font-black">Ödəniş tamamlanmadı</h1><p className="mt-3 leading-7 text-muted-foreground">Kartınızdan vəsait tutulmayıbsa yenidən cəhd edə bilərsiniz. Problem davam edərsə bankınızla və ya EG Shop dəstəyi ilə əlaqə saxlayın.</p><Link to="/orders" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-bold hover:border-primary hover:text-primary"><ArrowLeft className="h-4 w-4" /> Sifarişlərə qayıt</Link></main>;
}
