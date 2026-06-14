import { Suspense } from "react";
import RegisterPage from "@/modules/b2b-marketplace/pages/RegisterPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}
