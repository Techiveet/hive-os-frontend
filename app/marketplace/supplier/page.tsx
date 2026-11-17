import { Suspense } from "react";
import SuppliersPage from "@/modules/b2b-marketplace/pages/SuppliersPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SuppliersPage />
    </Suspense>
  );
}
