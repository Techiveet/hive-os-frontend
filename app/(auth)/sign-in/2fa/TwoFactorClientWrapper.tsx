"use client";

import dynamic from "next/dynamic";

const TwoFactorClient = dynamic(() => import("./TwoFactorClient"), {
  ssr: false,
});

export default function TwoFactorClientWrapper() {
  return <TwoFactorClient />;
}
