import { createFileRoute } from "@tanstack/react-router";
import { PaymentResultPage } from "@/components/PaymentResultPage";

export const Route = createFileRoute("/payment/error")({
  validateSearch: (search: Record<string, unknown>) => ({
    payment_id: typeof search.payment_id === "string" ? search.payment_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Ödəniş tamamlanmadı — EG Shop" }] }),
  component: () => <PaymentResultPage paymentId={Route.useSearch().payment_id} mode="error" />,
});
