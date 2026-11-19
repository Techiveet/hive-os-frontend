import { Suspense } from "react";
import PaymentCompletePage from "@/modules/b2b-marketplace/pages/PaymentCompletePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentCompletePage />
    </Suspense>
  );
}
