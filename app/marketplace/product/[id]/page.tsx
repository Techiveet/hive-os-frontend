"use client";

import { useParams } from "next/navigation";
import ProductDetailPage from "@/modules/b2b-marketplace/pages/ProductDetailPage";

export default function Page() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ProductDetailPage id={id} />;
}
