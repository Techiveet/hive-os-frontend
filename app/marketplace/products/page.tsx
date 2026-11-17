import { Suspense } from "react";
import ProductCatalogPage from "@/modules/b2b-marketplace/pages/ProductCatalogPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductCatalogPage />
    </Suspense>
  );
}
