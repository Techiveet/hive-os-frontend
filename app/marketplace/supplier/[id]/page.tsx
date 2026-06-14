"use client";

import { useParams } from "next/navigation";
import SupplierDetailPage from "@/modules/b2b-marketplace/pages/SupplierDetailPage";

export default function Page() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <SupplierDetailPage id={id} />;
}
