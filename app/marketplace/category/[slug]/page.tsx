"use client";

import { useParams } from "next/navigation";
import CategoryDetailPage from "@/modules/b2b-marketplace/pages/CategoryDetailPage";

export default function Page() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  return <CategoryDetailPage slug={slug} />;
}
