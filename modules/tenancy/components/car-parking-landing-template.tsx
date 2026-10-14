"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorOpen,
  MapPin,
  Phone,
  QrCode,
  Radio,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TenantLandingTemplate } from "@/modules/tenancy/landing-template";

interface CarParkingLandingTemplateProps {
  brandSettings: { app_title?: string; footer_text?: string };
  template: TenantLandingTemplate;
  tenantName: string;
}

export function CarParkingLandingTemplate({
  brandSettings,
  template,
  tenantName,
}: CarParkingLandingTemplateProps) {
  // Live Fee Estimator State
  const [estHours, setEstHours] = React.useState(3);
  const [estVehicleType, setEstVehicleType] = React.useState("sedan");

  // Reservation Dialog State
  const [isReserveOpen, setIsReserveOpen] = React.useState(false);
  const [resName, setResName] = React.useState("");
  const [resPlate, setResPlate] = React.useState("");
  const [resPhone, setResPhone] = React.useState("");
  const [isBooked, setIsBooked] = React.useState(false);

  // Dynamic fee calculation: Base 30 ETB/hr, vehicle multiplier, daily cap 250 ETB
  const multiplier =
    estVehicleType === "suv" ? 1.2 : estVehicleType === "pickup" ? 1.3 : estVehicleType === "motorcycle" ? 0.5 : 1.0;
  const rawFee = estHours * 30 * multiplier;
  const calculatedFee = Math.min(250 * multiplier, rawFee);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between py-4 border-b border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Car className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {tenantName || "Addis Smart Parking"}
              </span>
              <span className="block text-[10px] font-mono tracking-widest text-emerald-400 uppercase">
                IoT Autonomous Garage
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#estimator" className="hover:text-emerald-400 transition-colors">
              Rates Estimator
            </a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Smart Barrier &amp; ANPR
            </a>
            <a href="#passes" className="hover:text-emerald-400 transition-colors">
              Monthly Passes
            </a>
            <a href="#location" className="hover:text-emerald-400 transition-colors">
              Directions
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsReserveOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 rounded-full shadow-lg shadow-emerald-500/25 transition-all text-xs tracking-wide"
            >
              Reserve Slot
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-20 pb-16 text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold backdrop-blur-md animate-pulse">
            <Radio className="h-3.5 w-3.5" />
            <span>Live Availability: 42 Free Bays Available Right Now</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
            Smart, Seamless &amp;{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Touchless Parking
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {template.hero?.description ||
              "High-speed automated license plate recognition, digital space availability matrix, EV fast chargers, and mobile checkout with Telebirr and CBE Birr."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => setIsReserveOpen(true)}
              className="w-full sm:w-auto h-12 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl shadow-emerald-500/20 gap-2"
            >
              <DoorOpen className="h-5 w-5" />
              Book Guaranteed Bay
            </Button>

            <a href="#estimator" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-full border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm gap-2"
              >
                <Calculator className="h-4 w-4 text-emerald-400" />
                Live Rate Calculator
              </Button>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
            {[
              { label: "Total Capacity", value: "350+ Bays" },
              { label: "ANPR Recognition Speed", value: "< 0.4s" },
              { label: "Free Grace Window", value: "15 Mins" },
              { label: "EV Supercharging", value: "120 kW" },
            ].map((m) => (
              <div
                key={m.label}
                className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md"
              >
                <div className="text-2xl font-black text-white font-mono">{m.value}</div>
                <div className="text-xs text-slate-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Interactive Rates Estimator */}
        <section id="estimator" className="py-16">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl">
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                Transparent Automated Tariffs
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Live Parking Fee Estimator
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Calculate your exact parking costs in Ethiopian Birr before you drive in.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 mt-8 items-center">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span>Stay Duration:</span>
                    <span className="text-emerald-400 font-mono text-base">{estHours} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={estHours}
                    onChange={(e) => setEstHours(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
                    <span>1h (Quick Stop)</span>
                    <span>4h (Business)</span>
                    <span>8h (Full Day)</span>
                    <span>12h (Extended)</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Vehicle Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "sedan", label: "Sedan" },
                      { id: "suv", label: "SUV (1.2x)" },
                      { id: "pickup", label: "Pickup" },
                      { id: "motorcycle", label: "Motorcycle" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setEstVehicleType(v.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          estVehicleType === v.id
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50"
                            : "border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-800/60"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>First 15 minutes completely free grace period.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Maximum 24-hour rate capped at 250 ETB.</span>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between text-center md:text-left">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                    Calculated Parking Fee
                  </span>
                  <div className="text-5xl font-black text-white font-mono mt-2">
                    {calculatedFee.toFixed(2)}{" "}
                    <span className="text-sm font-semibold text-emerald-400">ETB</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Pay automatically upon barrier exit via Telebirr QR, CBE Birr, or Cash kiosk.
                  </p>
                </div>

                <Button
                  onClick={() => setIsReserveOpen(true)}
                  className="mt-6 w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Reserve At This Rate
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Why Choose Us */}
        <section id="features" className="py-16 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Next-Generation Parking Technology
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Designed for safety, speed, and 100% barrier automation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Radio,
                title: "Touchless ANPR Recognition",
                desc: "Smart optical cameras read your plate on approach and lift the barrier in under 400 milliseconds. No ticket loss, no queue.",
              },
              {
                icon: ShieldCheck,
                title: "24/7 Security & Patrols",
                desc: "High-definition CCTV coverage on all floors, night lighting, guarded perimeter, and automated vehicle overstay alerts.",
              },
              {
                icon: Zap,
                title: "EV Fast Chargers Included",
                desc: "High-output DC charging bays reserved exclusively for electric cars. Top up your battery while you work or shop.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Monthly Commuter Season Passes */}
        <section id="passes" className="py-16 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs mb-2">
              Commuter Savings
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Monthly Season Passes
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Unrestricted entry and reserved slots for daily commuters and corporate fleets.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                name: "Monthly Commuter",
                price: "2,500 ETB",
                period: "per month",
                popular: false,
                features: [
                  "Unlimited 24/7 Gate Barrier Access",
                  "Optical ANPR Automatic Entry",
                  "Ground Floor & Floor 1 bays",
                  "Telebirr Auto-Renewal",
                ],
              },
              {
                name: "VIP Unlimited Reserved",
                price: "5,000 ETB",
                period: "per month",
                popular: true,
                features: [
                  "Dedicated Reserved Personal Bay",
                  "EV Supercharger Access",
                  "Guaranteed Slot At All Times",
                  "Priority Barrier Lane Entry",
                  "Free Monthly Vehicle Wash",
                ],
              },
              {
                name: "Annual Corporate Fleet",
                price: "24,000 ETB",
                period: "per year",
                popular: false,
                features: [
                  "20% Full Year Discount",
                  "Multi-vehicle plate whitelist",
                  "Consolidated Monthly VAT Invoices",
                  "Corporate Fleet Portal Access",
                ],
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
                  p.popular
                    ? "border-emerald-500 bg-emerald-950/20 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                <div>
                  {p.popular && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full inline-block mb-3">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <div className="text-3xl font-black text-white font-mono mt-3">
                    {p.price}
                    <span className="text-xs font-normal text-slate-400 ml-1">/{p.period}</span>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => setIsReserveOpen(true)}
                  className={`mt-8 w-full rounded-xl font-bold text-xs ${
                    p.popular
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  Subscribe Pass
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Location & Contact */}
        <section id="location" className="py-12 border-t border-slate-800/80">
          <div className="grid gap-6 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Facility Location &amp; Hours</h2>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>Bole Road, Next to Addis Ababa Commercial Center</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>Open 24 Hours / 7 Days a Week</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <span>+251 911 234 567 (Attendant Helpdesk)</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">
                  Payment Rails
                </div>
                <div className="text-base font-bold text-white mt-1">
                  Telebirr, CBE Birr &amp; Cash Accepted
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">Telebirr</Badge>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">CBE Birr</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>{brandSettings.footer_text || `&copy; ${new Date().getFullYear()} ${tenantName}. All rights reserved.`}</p>
          <p>Powered by Hive ERP Autonomous Parking Engine</p>
        </footer>
      </div>

      {/* Reservation Dialog Modal */}
      <Dialog open={isReserveOpen} onOpenChange={setIsReserveOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <DoorOpen className="h-5 w-5" />
              Pre-Book Your Parking Slot
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Guaranteed slot reservation with automated license plate barrier check-in.
            </DialogDescription>
          </DialogHeader>

          {isBooked ? (
            <div className="py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Reservation Confirmed!</h3>
              <p className="text-xs text-slate-400">
                License plate <span className="font-mono font-bold text-emerald-400">{resPlate}</span> is now
                registered for barrier entry. Drive directly to the gate!
              </p>
              <Button
                onClick={() => {
                  setIsBooked(false);
                  setIsReserveOpen(false);
                }}
                className="mt-4 bg-emerald-500 text-slate-950 font-bold"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Your Full Name *</Label>
                <Input
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="e.g. Dr. Meron Hailu"
                  className="bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">License Plate *</Label>
                  <Input
                    value={resPlate}
                    onChange={(e) => setResPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. AA-3-98765"
                    className="font-mono font-bold bg-slate-900 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Phone Number</Label>
                  <Input
                    value={resPhone}
                    onChange={(e) => setResPhone(e.target.value)}
                    placeholder="+251 9..."
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                Arrival Window: <span className="text-emerald-400 font-semibold">Today within 2 hours</span>.
                Barrier arm will automatically lift when your plate approaches.
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsReserveOpen(false)} className="border-slate-800 text-slate-400">
                  Cancel
                </Button>
                <Button
                  onClick={() => setIsBooked(true)}
                  disabled={!resName.trim() || !resPlate.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Confirm Reservation
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CarParkingLandingTemplate;
