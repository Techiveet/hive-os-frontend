"use client";

/**
 * LOCAL PREVIEW ONLY — renders the Savory Lounge tenant landing with mock data
 * so the design/animations can be reviewed without the backend running.
 * Visit /savory-preview in `next dev`. Safe to delete before shipping.
 */

import { RestaurantLandingTemplate } from "@/modules/tenancy/components/restaurant-landing-template";
import { resolveLandingTemplate } from "@/modules/tenancy/landing-template";

export default function SavoryPreviewPage() {
  const base = resolveLandingTemplate(undefined);

  const template = {
    ...base,
    // Empty arrays let the template's lounge-themed defaults show in preview
    stats: [],
    testimonials: [],
    hero: {
      ...base.hero,
      slides: [
        {
          image: "/landing/hero.png",
          title: "Where The Night Comes Alive",
          subtitle:
            "An immersive lounge & club experience — craft cocktails, live DJ sets, and unforgettable late nights.",
          badge: "Lounge • Club • Bar",
        },
        {
          image: "/landing/dining.png",
          title: "Dine In The Glow",
          subtitle:
            "Chef-crafted plates and signature flavors served in a cinematic, candle-lit atmosphere.",
          badge: "Fine Dining",
        },
        {
          image: "/landing/hero_3.png",
          title: "The After-Hours Sanctuary",
          subtitle:
            "Bottle service, private VIP lounges, and deep house beats that move until late.",
          badge: "VIP Nightlife",
        },
      ],
    },
  };

  const brandSettings = { app_title: "Savory Lounge" };

  return (
    <RestaurantLandingTemplate
      template={template}
      brandSettings={brandSettings}
      tenantName="Savory Lounge"
    />
  );
}
