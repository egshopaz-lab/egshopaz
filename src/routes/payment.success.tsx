import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, PackageSearch } from "lucide-react";

export const Route = createFileRoute("/payment/success")({
  validateSearch: z.object({ payment_id: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Ödəniş qəbul edildi — EG Shop" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PaymentSuccess,
});
function PaymentSuccess() {
  return <main className="container mx-auto max-w-lg px-4 py-16 text-center"><CheckCircle2 className="mx-auto h-20 w-20 text-emerald-600" /><h1 className="mt-5 text-3xl font-black">Ödəniş qəbul edildi</h1><p className="mt-3 leading-7 text-muted-foreground">Bank təsdiqi serverdə yoxlanılır. Sifarişinizin son vəziyyətini “Sifarişlərim” bölməsindən izləyə bilərsiniz.</p><Link to="/orders" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"><PackageSearch className="h-5 w-5" /> Sifarişlərim</Link></main>;
}
