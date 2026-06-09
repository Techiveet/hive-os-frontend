"use client";

import * as React from "react";
import { ArrowRight, Utensils, Clock, MapPin, Phone, Star, CheckCircle2, X, Wine, Martini, Box, Image as ImageIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslation } from "@/store/use-translation";
import { getBackendStorageUrl, getBackendApiRoot, getTenantHeaders, getPublicServeUrl } from "@/lib/runtime-context";
import { SecureAssetImage } from "@/components/ui/secure-asset-image";
import { Model3DViewer } from "@/components/ui/model-3d-viewer";
import { useQuery } from "@tanstack/react-query";
import type { HospitalityMenuItem } from "@/modules/hospitality/types";

// Types
import { type TenantLandingTemplate, type TenantLandingHeroSlide } from "@/modules/tenancy/landing-template";

type BrandSettings = {
  app_title?: string | null;
  logo_light?: string | null;
  logo_dark?: string | null;
  footer_text?: string | null;
  primary_color?: string | null;
  font_family?: string | null;
};

type DynamicMenuItem = {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  model3d: string | null;
  image: string;
  badge: string | null;
};

// Default slides removed (all slides now load from the database settings)



const defaultEvents = [
  {
    title: "Thursday Live Jazz Night",
    time: "Every Thursday, 7:00 PM",
    desc: "Soulful live jazz performances from guest musicians paired with unlimited select cocktails.",
    image: "/landing/hero.png"
  },
  {
    title: "Friday Mixology Masterclass",
    time: "Every Friday, 6:00 PM",
    desc: "An exclusive, interactive session teaching you how to mix five signature cocktails from scratch.",
    image: "/landing/liquor.png"
  },
  {
    title: "Saturday Grand DJ Night",
    time: "Every Saturday, 8:00 PM",
    desc: "Feel the nightlife energy with deep house, electronic, and afrobeat grooves mixed by resident DJs.",
    image: "/landing/hero_3.png"
  }
];

// Layered Section Title Helper Component - Palmy style
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionTitle({ title, subtitle, t }: { title: string; subtitle: string; t: any }) {
  return (
    <div className="relative mb-20 text-center select-none">
      {/* Background large outlined text */}
      <span 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl sm:text-[8rem] md:text-[9.5rem] font-black tracking-[0.25em] uppercase pointer-events-none whitespace-nowrap z-0"
        style={{
          WebkitTextStroke: "1.5px rgba(255, 26, 67, 0.08)",
          color: "transparent"
        }}
      >
        {t(`landing.title.bg.${subtitle.toLowerCase()}`, subtitle)}
      </span>
      {/* Foreground title */}
      <h2 className="relative text-4xl sm:text-5xl font-black tracking-tight text-foreground uppercase z-10">
        <span className="bg-gradient-to-r from-[#FF1A43] via-[#D31A9B] to-[#7B16D9] bg-clip-text text-transparent">
          {t(`landing.title.fg.${title.toLowerCase().replace(/\s+/g, "_")}`, title)}
        </span>
        <span className="block w-20 h-1.5 bg-gradient-to-r from-[#FF1A43] via-[#D31A9B] to-[#7B16D9] mx-auto mt-4 rounded-full shadow-[0_0_15px_rgba(255,26,67,0.5)] animate-pulse" />
      </h2>
    </div>
  );
}

interface DynamicEventItem {
  title: string;
  time: string;
  desc: string;
  image: string;
}

export function RestaurantLandingTemplate({
  brandSettings,
  template,
  tenantName,
}: {
  brandSettings?: BrandSettings | null;
  template: TenantLandingTemplate;
  tenantName: string;
}) {
  // Slides are loaded entirely from dashboard settings
  const heroSlides: TenantLandingHeroSlide[] =
    Array.isArray(template?.hero?.slides) ? template.hero.slides : [];
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const safeCurrentSlide = currentSlide < heroSlides.length ? currentSlide : 0;
  const activeSlide = heroSlides[safeCurrentSlide] || heroSlides[0] || { image: "", title: "", subtitle: "", badge: "" };
  const [dynamicEvents, setDynamicEvents] = React.useState<DynamicEventItem[]>(defaultEvents);

  // Load dynamic menu items from API
  const { data: apiMenuItemsData } = useQuery({
    queryKey: ["tenantPublicMenuItems"],
    queryFn: async () => {
      const res = await fetch(`${getBackendApiRoot()}/public/hospitality/menu-items`, {
        headers: {
          Accept: "application/json",
          ...getTenantHeaders(),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch public menu items");
      return res.json() as Promise<HospitalityMenuItem[]>;
    },
    staleTime: 30000, // 30s – reflects admin changes quickly
  });

  const dynamicMenuItems = React.useMemo(() => {
    if (!apiMenuItemsData || !Array.isArray(apiMenuItemsData) || apiMenuItemsData.length === 0) {
      return [];
    }
    
    // Sort: featured first, then by sort_order, then available before unavailable
    const sortedItems = [...apiMenuItemsData].sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      if (a.is_available && !b.is_available) return -1;
      if (!a.is_available && b.is_available) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    // Show up to 8 items on the landing page
    const selectedItems = sortedItems.slice(0, 8);

    return selectedItems.map((item) => {
      // Use getPublicServeUrl so private serve URLs (/api/v1/files/{id}/serve) become
      // public serve URLs (/api/v1/files/{id}/public-serve) for unauthenticated visitors.
      const rawImage = item.image_url ?? null;
      const rawModel = item.model_3d_url ?? null;
      const imageUrl = rawImage
        ? (getPublicServeUrl(rawImage) || rawImage)
        : "/landing/dish.png";
      const model3dUrl = rawModel
        ? (getPublicServeUrl(rawModel) || rawModel)
        : null;
      
      let badge: string | null = null;
      if (Array.isArray(item.tags) && item.tags.length > 0) {
        badge = item.tags[0];
      } else if (item.is_featured) {
        badge = "Featured";
      }

      return {
        id: String(item.id),
        name: item.name,
        category: item.category?.name || "Main Course",
        price: `${Math.round(Number(item.price))} ETB`,
        description: item.description || "",
        model3d: model3dUrl,
        image: imageUrl,
        badge: badge,
      };
    });
  }, [apiMenuItemsData]);

  const [activeDishState, setActiveDishState] = React.useState<DynamicMenuItem | null>(null);
  const [viewMode, setViewMode] = React.useState<"3d" | "image">("3d");

  // Reset active dish whenever the list changes so the first item is always highlighted
  React.useEffect(() => {
    setActiveDishState(null);
  }, [dynamicMenuItems]);

  const activeDish = activeDishState || dynamicMenuItems[0] || null;

  // Set default view mode based on what media is available for the active dish
  React.useEffect(() => {
    if (activeDish?.model3d) {
      setViewMode("3d");
    } else {
      setViewMode("image");
    }
  }, [activeDish?.id]);

  // Dynamic specialties (highlights) configuration from settings
  const specialtiesEyebrow = template?.highlights?.[0]?.kicker || t("landing.specialties.eyebrow", "Our Specialties");
  const specialtiesTitle = template?.highlights?.[0]?.title || t("landing.specialties.title", "Crafted with passion, served with perfection.");
  const specialtiesDescription = template?.highlights?.[0]?.description || t("landing.specialties.description", "Every dish tells a story of local sourcing, seasonal inspiration, and meticulous preparation. Discover flavors that linger long after the last bite.");
  const rawSpecialtiesImage = template?.highlights?.[0]?.image;
  const specialtiesImage = rawSpecialtiesImage ? (getPublicServeUrl(rawSpecialtiesImage) ?? rawSpecialtiesImage) : "/landing/dish.png";

  const specialtiesItems = [
    {
      title: template?.highlights?.[1]?.title || "Artisan Steaks",
      desc: template?.highlights?.[1]?.description || "Dry-aged to perfection for minimum 28 days."
    },
    {
      title: template?.highlights?.[2]?.title || "Fresh Catch",
      desc: template?.highlights?.[2]?.description || "Sourced daily from local sustainable fisheries."
    },
    {
      title: template?.highlights?.[3]?.title || "Handcrafted Pasta",
      desc: template?.highlights?.[3]?.description || "Made fresh every morning using traditional methods."
    }
  ];

  // Booking Modal States
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);
  const [locations, setLocations] = React.useState<{ id: number; name: string; capacity: number; min_spend: string }[]>([]);
  const [isLoadingTables, setIsLoadingTables] = React.useState(false);
  const [formData, setFormData] = React.useState({
    customer_name: "",
    customer_phone: "",
    reservation_time: "",
    location_id: "",
    guest_count: "2",
    special_requests: "",
    booking_type: "Regular Reservation",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [successReservation, setSuccessReservation] = React.useState<{ reservation_code: string; customer_name: string; reservation_time: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);

    // Inject Palmy Poppins Font dynamically
    if (typeof document !== "undefined") {
      const link = document.createElement("link");
      link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;900&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    // Fetch dynamic events from public endpoint
    fetch(`${getBackendApiRoot()}/public/hospitality/events`, {
      headers: {
        Accept: "application/json",
        ...getTenantHeaders(),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load events");
        return res.json();
      })
      .then((data: { name: string; start_at: string; description?: string; cover_image_url?: string }[]) => {
        if (data && data.length > 0) {
          const mappedEvents: DynamicEventItem[] = data.map((evt) => {
            const date = new Date(evt.start_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dayStr = date.toLocaleDateString([], { weekday: 'long' });
            return {
              title: evt.name,
              time: `${dayStr}, ${timeStr}`,
              desc: evt.description || "",
              image: getPublicServeUrl(evt.cover_image_url) || evt.cover_image_url || "/landing/hero.png",
            };
          });
          setDynamicEvents(mappedEvents);
        }
      })
      .catch((err) => console.error("Error loading dynamic events:", err));
  }, []);

  React.useEffect(() => {
    if (isBookingOpen) {
      setIsLoadingTables(true);
      fetch(`${getBackendApiRoot()}/public/hospitality/available-tables`, {
        headers: {
          Accept: "application/json",
          ...getTenantHeaders(),
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load tables");
          return res.json();
        })
        .then((data) => {
          setLocations(data);
          if (data && data.length > 0) {
            setFormData((prev) => ({ ...prev, location_id: String(data[0].id) }));
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingTables(false));
    }
  }, [isBookingOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${getBackendApiRoot()}/public/hospitality/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...getTenantHeaders(),
        },
        body: JSON.stringify({
          location_id: Number(formData.location_id),
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          reservation_time: formData.reservation_time,
          guest_count: Number(formData.guest_count),
          special_requests: `[Booking Type: ${formData.booking_type}] ${formData.special_requests}`.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit reservation.");
      }

      setSuccessReservation({
        reservation_code: result.reservation.reservation_code,
        customer_name: result.reservation.customer_name,
        reservation_time: result.reservation.reservation_time,
      });

      setFormData({
        customer_name: "",
        customer_phone: "",
        reservation_time: "",
        location_id: locations[0]?.id ? String(locations[0].id) : "",
        guest_count: "2",
        special_requests: "",
        booking_type: "Regular Reservation",
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safeguard currentSlide index against changes in heroSlides length
  React.useEffect(() => {
    if (currentSlide >= heroSlides.length) {
      setCurrentSlide(0);
    }
  }, [heroSlides.length, currentSlide]);

  React.useEffect(() => {
    if (!mounted || heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [mounted, heroSlides.length, currentSlide]);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const brandName = brandSettings?.app_title || tenantName || "Savory Lounge";
  
  // Resolve Logo
  const rawLogoUrl = isDark
    ? (brandSettings?.logo_dark || brandSettings?.logo_light)
    : (brandSettings?.logo_light || brandSettings?.logo_dark);
  const logoUrl = getPublicServeUrl(rawLogoUrl);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md shadow-sm animate-in fade-in"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,26,67,0.3)]" />
              ) : (
                <Utensils className="h-8 w-8 text-[#FF1A43] drop-shadow-[0_0_8px_rgba(255,26,67,0.4)]" />
              )}
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-[#FF1A43] via-[#EC4899] to-[#7B16D9] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,26,67,0.35)]">{brandName}</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-wide font-sans">
              <button onClick={() => scrollToSection("specialties")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.specialties", "Specialties")}</button>
              <button onClick={() => scrollToSection("menu")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.menu", "Our Menus")}</button>
              <button onClick={() => scrollToSection("services")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.services", "What We Offer")}</button>
              <button onClick={() => scrollToSection("events")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.events", "Theme Nights")}</button>
              <button onClick={() => scrollToSection("cellar")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.cellar", "The Cellar")}</button>
              <button onClick={() => scrollToSection("experience")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.experience", "Experience")}</button>
              <button onClick={() => scrollToSection("location")} className="hover:text-[#FF1A43] transition-colors">{t("landing.nav.location", "Location")}</button>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <ThemeToggle />
              <Button onClick={() => setIsBookingOpen(true)} className="hidden lg:flex rounded-full px-8 font-bold shadow-lg shadow-[#FF1A43]/25 hover:scale-105 transition-transform bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] hover:from-[#e61539] hover:to-[#6a12bd] text-white border-none">
                {t("landing.cta.book", "Book a Table")}
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 lg:pt-48 lg:pb-56 overflow-hidden flex items-center min-h-[95vh] bg-[#080510]">
        {/* Ambient background glows for lounge/club vibe */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-[#FF1A43]/15 rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-[#7B16D9]/20 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Background Slider & Overlay */}
        <div className="absolute inset-0 z-0 bg-background overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={safeCurrentSlide}
              initial={{ scale: 1.15, opacity: 0 }}
              animate={{ scale: 1, opacity: isDark ? 0.7 : 0.85 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
               {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={getPublicServeUrl(activeSlide.image) ?? activeSlide.image} 
                alt="Restaurant Interior" 
                className="w-full h-full object-cover object-center" 
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20 pointer-events-none z-10" />
        </div>

        {/* Huge outline background text mask - Palmy style */}
        <div 
          className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-[10rem] sm:text-[16rem] md:text-[20rem] font-black tracking-[0.25em] select-none pointer-events-none uppercase z-10"
          style={{
            WebkitTextStroke: isDark ? "1.5px rgba(255, 26, 67, 0.12)" : "1.5px rgba(255, 26, 67, 0.22)",
            color: "transparent"
          }}
        >
          {safeCurrentSlide === 0 ? "SAVORY" : safeCurrentSlide === 1 ? "DINING" : "LOUNGE"}
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-20 text-center w-full">
          <AnimatePresence mode="wait">
            <motion.div 
              key={safeCurrentSlide} 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -30 }} 
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8 flex justify-center">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={brandName} className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,26,67,0.45)] mb-4" />
                )}
              </div>
              <div>
                <Badge variant="outline" className="mb-6 px-5 py-2 text-sm font-bold uppercase tracking-widest backdrop-blur-md bg-[#FF1A43]/10 border-[#FF1A43]/45 text-[#FF1A43] shadow-[0_0_15px_rgba(255,26,67,0.2)]">
                  {t(`landing.hero.badge_${safeCurrentSlide}`, activeSlide.badge)}
                </Badge>
              </div>
              
              <h1 className="mx-auto max-w-5xl text-5xl sm:text-7xl lg:text-[6.5rem] font-black tracking-tighter leading-[0.95] mb-8 uppercase">
                <span className="bg-gradient-to-r from-[#FF1A43] via-[#D31A9B] to-[#7B16D9] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  {t(`landing.hero.title_${safeCurrentSlide}`, activeSlide.title)}
                </span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-lg sm:text-2xl text-muted-foreground mb-12 font-medium leading-relaxed">
                {t(`landing.hero.subtitle_${safeCurrentSlide}`, activeSlide.subtitle)}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                <Button onClick={() => setIsBookingOpen(true)} size="lg" className="rounded-full px-10 h-16 text-lg font-bold shadow-[0_0_25px_rgba(255,26,67,0.45)] hover:shadow-[0_0_40px_rgba(255,26,67,0.65)] hover:scale-105 transition-all duration-300 w-full sm:w-auto bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] text-white border-none">
                  {t("landing.cta.reservation", "Make a Reservation")}
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => scrollToSection("menu")}
                  className="rounded-full px-10 h-16 text-lg font-bold backdrop-blur-md bg-background/30 border-[#7B16D9]/40 w-full sm:w-auto hover:border-[#FF1A43] hover:bg-background/80 transition-all shadow-[0_0_15px_rgba(123,22,217,0.15)] hover:shadow-[0_0_25px_rgba(255,26,67,0.25)]"
                >
                  {t("landing.cta.menu", "View Menu")}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Manual Navigation Controls */}
        {heroSlides.length > 1 && (
          <>
            {/* Prev Button - Premium Coaster & Wine Glass Styled */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 h-16 w-16 rounded-full border border-amber-500/35 bg-black/55 backdrop-blur-md flex flex-col items-center justify-center text-amber-400/80 hover:text-amber-300 hover:border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] transition-all duration-300 group hidden sm:flex"
              aria-label="Previous Slide"
            >
              <Wine className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 text-amber-400/60 group-hover:text-amber-300">Prev</span>
            </button>

            {/* Next Button - Premium Coaster & Martini Glass Styled */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 h-16 w-16 rounded-full border border-amber-500/35 bg-black/55 backdrop-blur-md flex flex-col items-center justify-center text-amber-400/80 hover:text-amber-300 hover:border-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] transition-all duration-300 group hidden sm:flex"
              aria-label="Next Slide"
            >
              <Martini className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 text-amber-400/60 group-hover:text-amber-300">Next</span>
            </button>

            {/* Slide Dots Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-black/35 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/5 shadow-2xl">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i === safeCurrentSlide 
                      ? "w-8 bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] shadow-[0_0_10px_rgba(255,26,67,0.5)]" 
                      : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Highlights / Specialties */}
      <section id="specialties" className="py-32 bg-muted/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[400px] bg-[#7B16D9]/10 rounded-full blur-[100px] pointer-events-none z-0" />
        
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#7B16D9]/30 to-transparent" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="relative order-2 lg:order-1"
            >
              <div className="absolute -inset-6 bg-gradient-to-r from-[#FF1A43]/10 to-[#7B16D9]/10 rounded-[3rem] transform -rotate-3 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={specialtiesImage} 
                alt="Signature Dish" 
                className="relative rounded-[2.5rem] shadow-[0_0_35px_rgba(123,22,217,0.18)] hover:shadow-[0_0_45px_rgba(255,26,67,0.28)] transition-all duration-500 w-full object-cover aspect-square lg:aspect-[4/5] border border-white/[0.08]"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="absolute -bottom-8 -right-8 bg-background/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/[0.08]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                  <span className="font-black text-xl">4.9/5</span>
                </div>
                <p className="text-muted-foreground font-bold">{t("landing.reviews.rating", "Based on 2,000+ reviews")}</p>
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="order-1 lg:order-2 text-left"
            >
              <p className="text-sm font-black uppercase tracking-[0.3em] text-[#FF1A43] mb-4 flex items-center gap-4">
                <span className="w-12 h-px bg-[#FF1A43]" />
                {specialtiesEyebrow}
              </p>
              <h2 className="text-5xl sm:text-6xl font-black tracking-tighter mb-8 leading-[1.1] text-foreground">
                {specialtiesTitle}
              </h2>
              {specialtiesDescription.includes("<") ? (
                <div 
                  className="text-xl text-muted-foreground mb-10 leading-relaxed font-medium text-left [&_p]:mb-4 [&_strong]:text-foreground [&_a]:text-[#FF1A43] [&_a]:underline [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: specialtiesDescription }}
                />
              ) : (
                <p className="text-xl text-muted-foreground mb-10 leading-relaxed font-medium">
                  {specialtiesDescription}
                </p>
              )}
              
              <div className="space-y-8">
                {specialtiesItems.map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.6 }}
                    className="flex gap-6 items-start group"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF1A43]/10 text-[#FF1A43] group-hover:bg-gradient-to-r group-hover:from-[#FF1A43] group-hover:to-[#7B16D9] group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(255,26,67,0.1)]">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-2xl mb-2 group-hover:text-[#FF1A43] transition-colors">{item.title}</h3>
                      <p className="text-muted-foreground text-lg">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3D Menu Section */}
      {activeDish && dynamicMenuItems.length > 0 && (
        <section id="menu" className="py-32 bg-background relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-[#FF1A43]/5 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionTitle
            title={template?.menus?.title || t("landing.menu.title", "Explore Our Menus in 3D")}
            subtitle={template?.menus?.eyebrow || t("landing.menu.subtitle", "Menus")}
            t={t}
          />

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: 3D Viewer or Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 relative h-[450px] sm:h-[550px] w-full rounded-[2.5rem] overflow-hidden border border-white/[0.08] shadow-[0_0_35px_rgba(123,22,217,0.18)] bg-card"
            >
              {/* Toggle switch for 2D/3D if both exist */}
              {activeDish.model3d && activeDish.image && activeDish.image !== "/landing/dish.png" && (
                <div className="absolute top-6 right-6 z-30 bg-background/80 backdrop-blur-md p-1 rounded-full border border-white/[0.08] flex gap-1 shadow-lg">
                  <button
                    onClick={() => setViewMode("3d")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      viewMode === "3d"
                        ? "bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    3D View
                  </button>
                  <button
                    onClick={() => setViewMode("image")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      viewMode === "image"
                        ? "bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    2D Image
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeDish.id}-${viewMode}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full relative"
                >
                  {viewMode === "3d" && activeDish.model3d ? (
                    <Model3DViewer
                      src={activeDish.model3d}
                      alt={activeDish.name}
                      className="w-full h-full border-none bg-transparent"
                      viewerClassName="w-full h-full"
                      autoRotate={true}
                      showOpenButton={false}
                      fallbackImage={activeDish.image}
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <SecureAssetImage
                        src={activeDish.image}
                        alt={activeDish.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  
                  {/* Floating details */}
                  <div className="absolute bottom-6 left-6 right-6 bg-background/85 backdrop-blur-md p-6 rounded-2xl border border-white/[0.08] flex items-center justify-between z-20 shadow-2xl">
                    <div>
                      <Badge className="mb-2 bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] text-white border-none">{activeDish.badge}</Badge>
                      <h4 className="font-black text-xl text-foreground">{activeDish.name}</h4>
                    </div>
                    <span className="text-2xl font-black bg-gradient-to-r from-yellow-500 to-[#FF1A43] bg-clip-text text-transparent">{activeDish.price}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Right Column: Dish Selection */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 space-y-6 text-left"
            >
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-[#FF1A43] mb-3 flex items-center gap-4">
                  <span className="w-12 h-px bg-[#FF1A43]" />
                  {template?.menus?.description_eyebrow || t("landing.menu.eyebrow", "Interactive Experience")}
                </p>
                {template?.menus?.description?.includes("<") ? (
                  <div
                    className="text-lg text-muted-foreground font-medium leading-relaxed html-content"
                    dangerouslySetInnerHTML={{ __html: template.menus.description }}
                  />
                ) : (
                  <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                    {template?.menus?.description || t("landing.menu.description", "Interact directly with our signature dishes in high-fidelity 3D, or select from our exquisite main courses.")}
                  </p>
                )}
              </div>

              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 no-scrollbar">
                {dynamicMenuItems.map((dish) => (
                  <button
                    key={dish.id}
                    onClick={() => setActiveDishState(dish)}
                    className={`w-full text-left p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                      activeDish.id === dish.id
                        ? "bg-gradient-to-r from-[#7B16D9]/10 via-[#7B16D9]/5 to-card border-[#7B16D9]/50 shadow-[0_0_30px_rgba(123,22,217,0.15)] scale-[1.02] pl-7"
                        : "bg-card hover:bg-muted/30 border-border/80 pl-5"
                    }`}
                  >
                    {/* Glowing Left Indicator for active item */}
                    {activeDish.id === dish.id && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-gradient-to-b from-[#FF1A43] to-[#7B16D9] shadow-[0_0_15px_rgba(255,26,67,0.6)]" />
                    )}
                    <div className="space-y-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        activeDish.id === dish.id ? "text-purple-400" : "text-primary"
                      }`}>
                        {dish.category}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black group-hover:text-[#FF1A43] transition-colors">{dish.name}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {dish.model3d && (
                            <span 
                              title="3D interactive model available" 
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#7B16D9]/10 text-[#7B16D9] dark:text-purple-400 border border-[#7B16D9]/20 dark:border-purple-500/20 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(123,22,217,0.15)]"
                            >
                              <Box className="w-3.5 h-3.5" />
                              3D
                            </span>
                          )}
                          {dish.image && dish.image !== "/landing/dish.png" && (
                            <span 
                              title="Photo available" 
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FF1A43]/10 text-[#FF1A43] border border-[#FF1A43]/20 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(255,26,67,0.15)]"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              Image
                            </span>
                          )}
                        </div>
                      </div>
                      {activeDish.id === dish.id && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-sm mt-2 font-medium text-muted-foreground leading-relaxed"
                        >
                          {dish.description}
                        </motion.p>
                      )}
                    </div>
                    <span className={`text-lg font-black ml-4 shrink-0 ${
                      activeDish.id === dish.id ? "bg-gradient-to-r from-yellow-500 to-[#FF1A43] bg-clip-text text-transparent" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {dish.price}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* What We Offer / Services Section - Palmy style */}
      <section id="services" className="py-32 bg-muted/5 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] bg-[#7B16D9]/5 rounded-full blur-[100px] pointer-events-none z-0" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionTitle title="Exclusive Services" subtitle="Services" t={t} />
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Private Events & Buyouts",
                desc: "Celebrate anniversaries, VIP corporate receptions, or private parties. We offer full and partial venue buyout options.",
                image: "/landing/dining.png"
              },
              {
                title: "VIP Lounge Experience",
                desc: "Indulge in premium bottle service, bespoke seating in our high-end lounge, and dedicated butler treatment.",
                image: "/landing/hero_3.png"
              },
              {
                title: "Catering & Masterclasses",
                desc: "Elevate your private gatherings with custom menus, chef-led dining, and mixology sessions hosted by our top artisans.",
                image: "/landing/dish.png"
              }
            ].map((srv, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="group relative rounded-[2.5rem] overflow-hidden shadow-2xl h-[450px] border border-white/[0.08] hover:border-[#FF1A43]/60 hover:shadow-[0_0_35px_rgba(255,26,67,0.25)] transition-all duration-500 bg-card"
              >
                {/* Background image */}
                <div className="absolute inset-0 z-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={srv.image} 
                    alt={srv.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/35 group-hover:via-black/75 transition-all duration-300" />
                </div>
                
                {/* Card details */}
                <div className="absolute inset-0 z-10 p-8 flex flex-col justify-end text-left space-y-4">
                  <h3 className="text-2xl font-black text-white group-hover:text-[#FF1A43] transition-colors">{srv.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed font-medium opacity-90">{srv.desc}</p>
                  <Button 
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, booking_type: srv.title.includes("Private") ? "Private Event / Buyout" : srv.title.includes("VIP") ? "VIP Lounge Table" : "Other Celebration" }));
                      setIsBookingOpen(true);
                    }}
                    variant="outline" 
                    className="rounded-full bg-white/10 hover:bg-gradient-to-r hover:from-[#FF1A43] hover:to-[#7B16D9] border-white/20 hover:border-none text-white hover:text-white font-bold tracking-wider uppercase text-xs w-fit px-6 h-10 hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,26,67,0.2)]"
                  >
                    {t("landing.services.inquire", "Inquire Now")}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section - Palmy style */}
      <section id="events" className="py-32 bg-background relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/3 right-1/4 w-[380px] h-[380px] bg-[#FF1A43]/5 rounded-full blur-[100px] pointer-events-none z-0" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionTitle title="Upcoming Theme Nights" subtitle="Events" t={t} />
          
          <div className="grid md:grid-cols-3 gap-8">
            {dynamicEvents.map((evt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="group relative rounded-[2.5rem] overflow-hidden shadow-xl border border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[520px] hover:border-[#FF1A43]/60 hover:shadow-[0_0_35px_rgba(255,26,67,0.25)] transition-all duration-500"
              >
                {/* Image panel */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={evt.image} 
                    alt={evt.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] text-white shadow-[0_0_12px_rgba(255,26,67,0.4)] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border-none">
                    {evt.time.split(",")[0]}
                  </div>
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[#FF1A43]">{evt.time}</span>
                    <h3 className="text-2xl font-black text-foreground group-hover:text-[#FF1A43] transition-colors">{evt.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium">{evt.desc}</p>
                  </div>
                  
                  <div className="flex gap-4 pt-4 border-t border-border/40">
                    <Button 
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, booking_type: "Regular Reservation", special_requests: `Interested in: ${evt.title}` }));
                        setIsBookingOpen(true);
                      }}
                      className="flex-1 rounded-full font-bold text-sm h-11 hover:scale-105 transition-transform bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] hover:from-[#e61539] hover:to-[#6a12bd] text-white border-none shadow-[0_0_15px_rgba(255,26,67,0.25)]"
                    >
                      Book Ticket
                    </Button>
                    <Button 
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, booking_type: "VIP Lounge Table", special_requests: `Interested in VIP Lounge for: ${evt.title}` }));
                        setIsBookingOpen(true);
                      }}
                      variant="outline"
                      className="flex-1 rounded-full font-bold text-sm h-11 hover:border-[#FF1A43]/50 hover:bg-[#FF1A43]/10 transition-all duration-300 hover:text-white"
                    >
                      VIP Table
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Liquor Store Section */}
      <section id="cellar" className="py-32 bg-muted/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] z-0 pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Side: Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <p className="text-sm font-black uppercase tracking-[0.3em] text-[#FF1A43] mb-4 flex items-center gap-4">
                <span className="w-12 h-px bg-[#FF1A43]" />
                {t("landing.cellar.eyebrow", "The Liquor Boutique")}
              </p>
              <h2 className="text-5xl sm:text-6xl font-black tracking-tighter mb-8 leading-[1.1] uppercase text-foreground">
                <span className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
                  {t("landing.cellar.title", "Savory Spirits & Wine Cellar")}
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 leading-relaxed font-medium">
                {t("landing.cellar.description", "Step into a sanctuary of taste. From rare single-malt scotches and vintage champagnes to bespoke local spirits, our cellar offers an curated selection for the refined palate.")}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-8">
                {[
                  { title: "Rare Vintages", desc: "Exquisite wines from the world's most prestigious vineyards." },
                  { title: "Bespoke Spirits", desc: "Hard-to-find single malts, small-batch bourbons, and fine cognacs." },
                  { title: "Private Tastings", desc: "Curated wine and spirit tasting sessions led by our sommelier." },
                  { title: "Exclusive Sourcing", desc: "Request rare bottles directly through our concierge service." }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="p-6 bg-card rounded-3xl border border-white/[0.08] hover:border-yellow-500/50 hover:shadow-[0_0_30px_rgba(234,179,8,0.25)] transition-all duration-300"
                  >
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm font-medium">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Right Side: Image with Frame */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-yellow-500/10 rounded-[3rem] transform rotate-3 blur-2xl z-0" />
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-yellow-500/20 hover:border-yellow-500/50 transition-colors duration-500 group z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/landing/liquor.png" 
                  alt="Premium Spirits Selection" 
                  className="w-full object-cover aspect-[4/5] scale-100 group-hover:scale-105 transition-transform duration-[1.5s]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10 sm:p-12 opacity-95 text-left z-20">
                  <h3 className="text-3xl font-black text-white mb-2">The Connoisseur Collection</h3>
                  <p className="text-white/80 font-medium">Browse our premium cellar list, or book a private tasting session in our VIP lounge room.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ambiance */}
      <section id="experience" className="py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center justify-center gap-4">
              <span className="w-8 h-px bg-primary" />
              {t("landing.ambiance.eyebrow", "The Ambiance")}
              <span className="w-8 h-px bg-primary" />
            </p>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter mb-6 max-w-3xl mx-auto">
              {t("landing.ambiance.title", "An atmosphere that elevates every moment.")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              {t("landing.ambiance.description", "Whether it's a romantic dinner, a family celebration, or a business lunch, our dining spaces are designed to provide the perfect backdrop.")}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative rounded-[3rem] overflow-hidden shadow-2xl border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/landing/dining.png" 
              alt="Dining Area" 
              className="w-full h-[500px] sm:h-[700px] object-cover hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-10 sm:p-16 text-left">
              <Badge className="w-fit mb-4 bg-primary text-primary-foreground hover:bg-primary px-4 py-1">Featured Space</Badge>
              <h3 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">The Garden Terrace</h3>
              <p className="text-white/90 max-w-xl text-xl leading-relaxed">Experience alfresco dining surrounded by lush greenery and ambient lighting. Perfect for evening sunsets and starry nights.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Info & CTA */}
      <section id="location" className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-foreground to-transparent bg-[length:20px_20px]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)' }} />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <h2 className="text-5xl sm:text-7xl font-black tracking-tighter mb-8 leading-[1.1] uppercase">
                {t("landing.footer.cta", "Ready to join us?")}
              </h2>
              <p className="text-2xl text-primary-foreground/90 mb-12 max-w-lg leading-relaxed font-medium">
                {t("landing.footer.description", "Reserve your table today and let us treat you to an unforgettable dining experience.")}
              </p>
              <Button onClick={() => setIsBookingOpen(true)} size="lg" variant="secondary" className="rounded-full px-10 h-16 text-lg font-black w-full sm:w-auto hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.25)]">
                {t("landing.cta.book", "Book a Table")}
              </Button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid sm:grid-cols-2 gap-10 bg-primary-foreground/10 p-10 rounded-[2.5rem] backdrop-blur-md border border-primary-foreground/20 text-left"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-foreground text-primary p-4 rounded-full shadow-lg">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="font-black text-2xl">Hours</h3>
                </div>
                <div className="text-primary-foreground/90 space-y-2 text-lg font-medium">
                  <p>Mon-Thu: 11am - 10pm</p>
                  <p>Fri-Sat: 11am - 11pm</p>
                  <p>Sunday: 10am - 9pm</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-foreground text-primary p-4 rounded-full shadow-lg">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <h3 className="font-black text-2xl">Location</h3>
                </div>
                <div className="text-primary-foreground/90 space-y-2 text-lg font-medium">
                  <p>123 Culinary Blvd</p>
                  <p>Metropolis, NY 10001</p>
                  <p className="pt-4 flex items-center gap-3 font-bold text-xl">
                    <Phone className="h-5 w-5" /> (555) 123-4567
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain grayscale opacity-50" />
            ) : (
                <Utensils className="h-6 w-6 text-primary grayscale opacity-50" />
            )}
            <span className="font-bold text-lg text-muted-foreground">{brandName}</span>
          </div>
          <p className="text-muted-foreground font-medium">
            {brandSettings?.footer_text || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
          </p>
          <div className="flex gap-8 text-muted-foreground font-medium">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) setIsBookingOpen(false);
              }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              {/* Gold Gradient Accent bar */}
              <div className="h-2 w-full bg-gradient-to-r from-[#FF1A43] via-[#D31A9B] to-[#7B16D9]" />
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0E0B1B]/40">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white">{t("landing.booking.title", "Book a Table")}</h3>
                  <p className="text-xs text-[#FF1A43] mt-1 font-bold">{t("landing.booking.subtitle", "Submit a VIP reservation request instantly")}</p>
                </div>
                <button
                  onClick={() => setIsBookingOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-full p-2 hover:bg-white/10 text-white/70 hover:text-white transition-all duration-300 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Success View */}
              {successReservation ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 overflow-y-auto bg-[#0E0B1B]">
                  <div className="rounded-full bg-[#FF1A43]/10 p-6 border border-[#FF1A43]/20 text-[#FF1A43] animate-bounce shadow-[0_0_20px_rgba(255,26,67,0.2)]">
                    <CheckCircle2 className="h-16 w-16" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-white">{t("landing.booking.success", "Reservation Requested!")}</h4>
                    <p className="text-white/80 max-w-sm text-sm">
                      {t("landing.booking.success_desc", "Thank you, :name. Your reservation request has been received. We will contact you to confirm.", { name: successReservation.customer_name })}
                    </p>
                  </div>
                  
                  <div className="w-full bg-white/[0.02] border border-white/10 p-5 rounded-2xl space-y-3 font-mono text-sm text-white">
                    <div className="flex justify-between">
                      <span className="text-white/60">Code:</span>
                      <span className="font-bold text-[#FF1A43]">{successReservation.reservation_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Time:</span>
                      <span className="font-bold">{new Date(successReservation.reservation_time).toLocaleString()}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      setSuccessReservation(null);
                      setIsBookingOpen(false);
                    }}
                    className="rounded-full w-full font-bold h-12 bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] border-none text-white hover:from-[#e61539] hover:to-[#6a12bd]"
                  >
                    {t("landing.booking.close", "Close")}
                  </Button>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0E0B1B]">
                  {submitError && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold">
                      {submitError}
                    </div>
                  )}

                  <div className="space-y-4 text-white">
                    {/* Name */}
                    <div className="space-y-2">
                      <label htmlFor="customer_name" className="text-sm font-bold text-white/90">
                        {t("landing.booking.name_label", "Full Name *")}
                      </label>
                      <input
                        type="text"
                        id="customer_name"
                        required
                        placeholder="John Doe"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none placeholder:text-white/30"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label htmlFor="customer_phone" className="text-sm font-bold text-white/90">
                        {t("landing.booking.phone_label", "Phone Number *")}
                      </label>
                      <input
                        type="tel"
                        id="customer_phone"
                        required
                        placeholder="+251 911 123 456"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none placeholder:text-white/30"
                      />
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-2">
                      <label htmlFor="reservation_time" className="text-sm font-bold text-white/90">
                        {t("landing.booking.time_label", "Date & Time *")}
                      </label>
                      <input
                        type="datetime-local"
                        id="reservation_time"
                        required
                        value={formData.reservation_time}
                        onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none [color-scheme:dark]"
                      />
                    </div>

                    {/* Table / Seating Area */}
                    <div className="space-y-2">
                      <label htmlFor="location_id" className="text-sm font-bold text-white/90">
                        {t("landing.booking.location_label", "Seating Preference *")}
                      </label>
                      {isLoadingTables ? (
                        <div className="flex items-center gap-2 text-sm text-white/60 p-3 border border-white/10 rounded-xl bg-white/[0.02]">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF1A43] border-t-transparent" />
                          <span>Loading seating areas...</span>
                        </div>
                      ) : locations.length === 0 ? (
                        <div className="text-sm text-white/60 p-3 border border-white/10 rounded-xl bg-white/[0.02]">
                          No seating areas available. We will assign one automatically.
                        </div>
                      ) : (
                        <select
                          id="location_id"
                          required
                          value={formData.location_id}
                          onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-[#0E0B1B] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none"
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id} className="bg-[#0E0B1B] text-white">
                              {loc.name} (Capacity: {loc.capacity} guests {Number(loc.min_spend) > 0 ? `, Min spend: ${loc.min_spend} ETB` : ""})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Number of Guests */}
                    <div className="space-y-2">
                      <label htmlFor="guest_count" className="text-sm font-bold text-white/90">
                        {t("landing.booking.guests_label", "Number of Guests *")}
                      </label>
                      <select
                        id="guest_count"
                        required
                        value={formData.guest_count}
                        onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#0E0B1B] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                          <option key={num} value={num} className="bg-[#0E0B1B] text-white">
                            {num} {num === 1 ? "Guest" : "Guests"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Booking Type */}
                    <div className="space-y-2">
                      <label htmlFor="booking_type" className="text-sm font-bold text-white/90">
                        {t("landing.booking.type_label", "Booking Type *")}
                      </label>
                      <select
                        id="booking_type"
                        required
                        value={formData.booking_type}
                        onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-[#0E0B1B] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none"
                      >
                        <option value="Regular Reservation" className="bg-[#0E0B1B] text-white">Regular Reservation</option>
                        <option value="VIP Lounge Table" className="bg-[#0E0B1B] text-white">VIP Lounge Table</option>
                        <option value="Birthday Party" className="bg-[#0E0B1B] text-white">Birthday Party</option>
                        <option value="Corporate Event" className="bg-[#0E0B1B] text-white">Corporate Event</option>
                        <option value="Bachelorette Party" className="bg-[#0E0B1B] text-white">Bachelorette Party</option>
                        <option value="Private Event / Buyout" className="bg-[#0E0B1B] text-white">Private Event / Buyout</option>
                        <option value="Other Celebration" className="bg-[#0E0B1B] text-white">Other Celebration</option>
                      </select>
                    </div>

                    {/* Special Requests */}
                    <div className="space-y-2">
                      <label htmlFor="special_requests" className="text-sm font-bold text-white/90">
                        {t("landing.booking.requests_label", "Special Requests")}
                      </label>
                      <textarea
                        id="special_requests"
                        rows={3}
                        placeholder="Allergies, high chair, window seat..."
                        value={formData.special_requests}
                        onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] text-white px-4 py-3 text-sm focus:border-[#FF1A43] focus:ring-1 focus:ring-[#FF1A43] focus:outline-none placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-full w-full font-bold h-14 shadow-lg shadow-[#FF1A43]/25 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF1A43] to-[#7B16D9] border-none text-white hover:from-[#e61539] hover:to-[#6a12bd] transition-all duration-300 hover:scale-[1.01]"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          <span>Booking...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Reservation Request</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RestaurantLandingTemplate;
