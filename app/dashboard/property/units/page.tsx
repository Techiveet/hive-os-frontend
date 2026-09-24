import { Suspense } from "react";

import UnitsPage from "@/modules/property/pages/UnitsPage";

export default function Page() {
  // UnitsPage reads ?status= from the URL.
  return (
    <Suspense fallback={null}>
      <UnitsPage />
    </Suspense>
  );
}
