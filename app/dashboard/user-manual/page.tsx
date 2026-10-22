"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen, Home, ChevronRight, Fingerprint, Lock, Globe,
  ShieldCheck, Key, Server, Sparkles, AlertCircle, CheckCircle2,
  ExternalLink, Copy, Check, Search, Layers, LayoutDashboard,
  Warehouse, Boxes, Truck, HelpCircle, Users, Zap, RefreshCw,
  Database, Activity, BarChart3, Bell, Shield, Compass, UserCheck, Eye,
  FileText, Download, Printer, Filter, Archive, Clock,
  UserPlus, ShieldAlert, Trash2, Pencil, VenetianMask, PlusCircle,
  Mail, ArrowRight
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/store/use-translation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Chapter {
  id: string;
  number: string;
  title: string;
  category: string;
  badge: string;
  summary: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: "chapter-0",
    number: "00",
    title: "Central Administrator Authentication & Gateway Handshake",
    category: "Security & Access",
    badge: "Essential",
    summary: "Master Cluster Gateway login, domain resolution, System Identifier & Encryption Key verification, and cryptographic session handshake.",
  },
  {
    id: "chapter-1",
    number: "01",
    title: "Executive Dashboard & Telemetry Operations",
    category: "Core Operations",
    badge: "Core",
    summary: "Role-based views (Central Super Admin vs Tenant Admin vs Operator), real-time KPI metrics, Warehouse & Inventory charts, and interactive tours.",
  },
  {
    id: "chapter-2",
    number: "02",
    title: "System Audit Logs & Forensic Investigation",
    category: "Security & Audit",
    badge: "Security",
    summary: "Inspect every system action, filter by operator/node/date, payload before/after diffs, export compliance reports, and manage cold storage archives.",
  },
  {
    id: "chapter-3",
    number: "03",
    title: "Identity & Access Control Matrix (RBAC)",
    category: "Security & Access",
    badge: "Security",
    summary: "Operator identity lifecycle, pinned ID & Operator columns, multi-dimensional filters (Status, Role, 2FA), role definitions, capability bindings, and security actions.",
  },
  {
    id: "chapter-4",
    number: "04",
    title: "Multi-Tenancy & Workspace Governance",
    category: "Architecture",
    badge: "Upcoming",
    summary: "Tenant database provisioning, domain mappings, subscription quotas, and cluster isolation.",
  },
  {
    id: "chapter-5",
    number: "05",
    title: "Warehouse Operations & Spatial Storage",
    category: "Supply Chain",
    badge: "Upcoming",
    summary: "Warehouses, zones, aisles, racks, shelves, box assignments, and QR receipt verification.",
  },
];

export default function UserManualPage() {
  const { t } = useTranslation();
  const [activeChapter, setActiveChapter] = useState<string>("chapter-0");
  const [dashboardViewMode, setDashboardViewMode] = useState<"annotated" | "raw">("annotated");
  const [auditViewMode, setAuditViewMode] = useState<"annotated" | "raw">("annotated");
  const [securityViewMode, setSecurityViewMode] = useState<"annotated" | "raw">("raw");
  const [securityActiveSubTab, setSecurityActiveSubTab] = useState<"users" | "roles" | "permissions">("users");
  const [operatorsActiveTab, setOperatorsActiveTab] = useState<"main" | "create" | "view" | "edit" | "delete">("main");
  const [rolesActiveTab, setRolesActiveTab] = useState<"main" | "create" | "view" | "edit" | "delete">("main");
  const [permissionsActiveTab, setPermissionsActiveTab] = useState<"main" | "filters" | "anatomy" | "export">("main");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("https://hive.techiveet.com");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const curOrigin = window.location.origin;
      if (curOrigin && (curOrigin.includes("techiveet.com") || curOrigin.includes("hive.os"))) {
        setOrigin(curOrigin);
      } else {
        setOrigin("https://hive.techiveet.com");
      }
    }
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(t("global.copied", "Copied to clipboard."));
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Breadcrumbs */}
      <div className="flex flex-wrap w-full justify-between items-center gap-3">
        <Breadcrumbs
          items={[
            { label: "Hive.OS", href: "/", icon: <Home className="h-4 w-4" /> },
            { label: t("nav.dashboard", "Dashboard"), href: "/dashboard" },
            { label: t("nav.user_manual", "User Manual") },
          ]}
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border/80 flex items-center gap-1.5 bg-card/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">Gateway:</span>
            <span className="text-primary font-bold">{origin}</span>
          </Badge>
          <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30">
            DOCS V2.4.0
          </Badge>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="p-8 border border-border/50 rounded-[2rem] bg-card/40 backdrop-blur-md shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-space font-black tracking-tight text-foreground">
                  {t("manual.title", "System User Manual & Operations Guide")}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {t(
                  "manual.subtitle",
                  "Step-by-step operating procedures, security handshakes, multi-tenant navigation, and telemetry workflows."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chapter Nav + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Chapters Navigation */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold font-mono uppercase tracking-widest text-muted-foreground px-2">
            {t("manual.chapters", "Manual Chapters")}
          </div>

          <div className="space-y-2">
            {CHAPTERS.map((ch) => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChapter(ch.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer block relative",
                    isActive
                      ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40 text-foreground"
                      : "bg-card/30 border-border/60 hover:bg-card/60 hover:border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-primary">
                      CHAPTER {ch.number}
                    </span>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="text-[10px] font-mono uppercase"
                    >
                      {ch.badge}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold leading-snug text-foreground mb-1">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {ch.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chapter Body */}
        <div className="lg:col-span-8 p-6 sm:p-10 border border-border/50 rounded-[2rem] bg-card/30 backdrop-blur-md shadow-sm space-y-10">
          {activeChapter === "chapter-0" ? (
            /* ========================================================== */
            /* CHAPTER 0: CENTRAL ADMIN LOGIN & HANDSHAKE                 */
            /* ========================================================== */
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-border/50 pb-6">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-primary">
                  <span>CHAPTER 00</span>
                  <span>•</span>
                  <span>SECURITY & AUTHENTICATION</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-space font-black tracking-tight text-foreground">
                  Central Administrator Authentication & Gateway Handshake
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Official operational procedure for establishing cryptographic uplink, authenticating as Central Super Administrator, and accessing the Central Command workspace.
                </p>
              </div>

              {/* Highlight Callouts Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
                    <Globe className="w-4 h-4" />
                    Target Domain & Gateway
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Always verify your address bar shows the Central Master Gateway:{" "}
                    <code className="text-primary font-mono font-bold bg-background/60 px-1.5 py-0.5 rounded">
                      {origin}/sign-in
                    </code>{" "}
                    (dynamically resolved for active environment).
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    Initiate Handshake Button
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clicking the prominent blue button triggers cryptographic verification, token issuance, and 2FA intercept checking.
                  </p>
                </div>
              </div>

              {/* Embedded Screenshot with Focus Highlights */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Figure 0.1: Central Administrator Sign-In Interface
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                    MASTER CLUSTER GATEWAY
                  </Badge>
                </div>

                <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                  <img
                    src="/manual-screenshots/01-sign-in-central-admin.png?v=2"
                    alt="Central Administrator Sign-In screen on Hive.OS"
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 border-2 border-primary/20 pointer-events-none rounded-2xl" />
                </div>
                <p className="text-xs text-muted-foreground italic text-center">
                  Live snapshot of the Command Access portal showing the Master Cluster Gateway card, System Identifier, and Initiate Handshake control.
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-6 pt-4 border-t border-border/50">
                <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Step-by-Step Login Instructions
                </h3>

                <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                  {/* Step 1 */}
                  <div className="flex gap-4 items-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 border border-primary/20">
                      1
                    </div>
                    <div className="space-y-2 flex-1">
                      <h4 className="font-bold text-foreground">Verify the Gateway Domain in Your Browser</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Confirm that the URL bar indicates the primary cluster domain (e.g.{" "}
                        <code className="text-primary font-mono bg-muted/50 px-1 py-0.5 rounded">
                          {origin}/sign-in
                        </code>
                        ). On the right side of the screen, the gateway card should display{" "}
                        <span className="font-bold text-foreground">MASTER CLUSTER GATEWAY (HIVE.OS)</span> and reflect the active origin URL.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 items-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 border border-primary/20">
                      2
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground">Enter Your System Identifier</h4>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          EMAIL ADDRESS
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        In the <strong className="text-foreground">System Identifier</strong> field (marked with the Fingerprint icon), input the Central Super Admin email:
                      </p>
                      <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/50 max-w-md font-mono text-xs">
                        <span className="text-primary font-bold">super@hive.os</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard("super@hive.os", "email")}
                          className="h-6 w-6 ml-auto"
                          title="Copy email"
                        >
                          {copiedKey === "email" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Tip: Hover over the <strong className="text-primary font-mono">ⓘ info icon</strong> next to the field label for real-time guidance.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 border border-primary/20">
                      3
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground">Enter Your Encryption Key</h4>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          PASSWORD
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        In the <strong className="text-foreground">Encryption Key</strong> field (marked with the Lock icon), input your master administrative password. You may click the eye icon to toggle password visibility.
                      </p>
                      <p className="text-[11px] text-muted-foreground italic">
                        Tip: Hover over the <strong className="text-primary font-mono">ⓘ info icon</strong> next to the label for security advice.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 items-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 border border-primary/20">
                      4
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground">Click "INITIATE HANDSHAKE &gt;"</h4>
                        <Badge variant="default" className="text-[10px] font-mono bg-primary">
                          TRIGGER UPLINK
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Click the prominent blue button at the bottom of the form:
                      </p>
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs font-mono text-primary flex items-center gap-2 max-w-sm">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>INITIATE HANDSHAKE &gt;</span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        The button transitions to an animated <em>VERIFYING...</em> spinner while the client establishes a secure API session.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 items-start">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 border border-emerald-500/20">
                      5
                    </div>
                    <div className="space-y-2 flex-1">
                      <h4 className="font-bold text-foreground">Session Decryption & Automatic Redirect</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Upon successful credentials verification:
                      </p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        <li>If <strong>Two-Factor Authentication (2FA)</strong> is enabled or enforced, you will be smoothly routed to <code className="text-primary font-mono bg-muted/50 px-1 py-0.5 rounded">/sign-in/2fa</code> for TOTP code validation.</li>
                        <li>Otherwise, the session is provisioned immediately with full Central Super Admin clearance and redirected to <code className="text-primary font-mono bg-muted/50 px-1 py-0.5 rounded">/dashboard</code>.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeChapter === "chapter-1" ? (
            /* ========================================================== */
            /* CHAPTER 1: DASHBOARD & TELEMETRY OPERATIONS               */
            /* ========================================================== */
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-border/50 pb-6">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-primary">
                  <span>CHAPTER 01</span>
                  <span>•</span>
                  <span>CORE OPERATIONS & TELEMETRY</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-space font-black tracking-tight text-foreground">
                  Executive Dashboard & Mission Control Cockpit
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete operational manual for the Hive.OS central mission control: understanding live telemetry, triggering administrative quick actions (including cache flushing), reading real-time analytics, and managing tenant infrastructure.
                </p>
              </div>

              {/* View Toggle Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                    FIGURE 1.1
                  </Badge>
                  <span className="text-xs font-bold font-space text-foreground">
                    Hive.OS Mission Control Central Overview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={dashboardViewMode === "annotated" ? "default" : "outline"}
                    onClick={() => setDashboardViewMode("annotated")}
                    className="text-xs h-8 rounded-xl font-mono gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Annotated Guide (Zones 1-8)
                  </Button>
                  <Button
                    size="sm"
                    variant={dashboardViewMode === "raw" ? "default" : "outline"}
                    onClick={() => setDashboardViewMode("raw")}
                    className="text-xs h-8 rounded-xl font-mono gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Clean Live View
                  </Button>
                </div>
              </div>

              {/* Dashboard Screenshot Frame */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                  <img
                    src={
                      dashboardViewMode === "annotated"
                        ? "/manual-screenshots/03-dashboard-annotated.png?v=2"
                        : "/manual-screenshots/03-dashboard.png?v=2"
                    }
                    alt="Executive Dashboard Overview"
                    className="w-full h-auto object-cover transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-muted-foreground italic text-center">
                  {dashboardViewMode === "annotated"
                    ? "Interactive annotated blueprint: Each numbered callout corresponds to an essential operational subsystem detailed below."
                    : "Clean production telemetry snapshot showing real cluster data (6 Active Nodes, 14 Users, 1072 Permissions, 55 Modules)."}
                </p>
              </div>

              {/* Comprehensive 8-Zone Operations Guide */}
              <div className="space-y-6 pt-4 border-t border-border/50">
                <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary" />
                  Functional Anatomy & Subsystem Breakdown
                </h3>
                <p className="text-xs text-muted-foreground">
                  Below is a detailed guide explaining what each numbered section on the Mission Control dashboard does and how to operate it:
                </p>

                <div className="grid grid-cols-1 gap-6">
                  {/* Zone 1 */}
                  <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        1
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Sidebar Navigation & In-App User Manual
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-500 ml-auto">
                        NAVIGATION
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        The modular primary sidebar provides instant access to all administrative modules:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Module Search:</strong> Filter modules on the fly with the top search input.</li>
                        <li><strong className="text-foreground">Core Workspaces:</strong> Dashboard, System Audit Logs, Identity & Access (RBAC), Module Subscriptions, and Tenant Accounts.</li>
                        <li><strong className="text-foreground">User Manual Link:</strong> Dedicated button launching this in-app documentation guide directly from anywhere in Hive.OS.</li>
                        <li><strong className="text-foreground">Disconnect Node:</strong> Securely invalidates session tokens, clears client state, and returns to the Central Gateway.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 2 */}
                  <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        2
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Global Command Bar & Interactive System Tours
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500 ml-auto">
                        GLOBAL COMMAND
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Global Search (<kbd className="px-1 py-0.5 bg-muted rounded font-mono">Ctrl + K</kbd>):</strong> Opens the spotlight command palette for jumping to any tenant, user, product, or setting.</li>
                        <li><strong className="text-foreground">System Tour:</strong> Interactive step-by-step walkthroughs guiding administrators through key workflows.</li>
                        <li><strong className="text-foreground">Utility Controls:</strong> Language switcher (EN/AM), theme customizer, notification feed, and internal communications mailbox.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 3 */}
                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        3
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Mission Control Quick Actions & Cache Flush
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 ml-auto">
                        OPERATIONS
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        High-frequency administrative triggers accessible with a single click:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">+ Create Tenant Account</strong>
                          Provisions a new tenant database, tenant subdomain, and allocates quota.
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">System Monitor</strong>
                          Launches real-time resource telemetry (Docker, RAM, CPU, Redis, Queues).
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">Invite Operator</strong>
                          Issues an encrypted invitation link with predefined role clearance.
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-amber-500/40 bg-amber-500/10">
                          <strong className="text-amber-500 font-mono text-[11px] block flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Flush Cache (Highlighted)
                          </strong>
                          Purges Redis application caches, clears model tags, and warms up route mappings across all cluster shards.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zone 4 */}
                  <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        4
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Cluster Infrastructure & RBAC Key Metrics
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500 ml-auto">
                        LIVE TELEMETRY
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-xl font-mono text-primary">6</div>
                        <div className="font-bold text-foreground text-[11px]">ACTIVE NODES</div>
                        <div className="text-[10px] text-muted-foreground">Provisioned: 6</div>
                      </div>
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-xl font-mono text-emerald-500">14</div>
                        <div className="font-bold text-foreground text-[11px]">ACTIVE USERS</div>
                        <div className="text-[10px] text-muted-foreground">Total: 14</div>
                      </div>
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-xl font-mono text-amber-500">147</div>
                        <div className="font-bold text-foreground text-[11px]">SECURITY ROLES</div>
                        <div className="text-[10px] text-muted-foreground">Access Policies</div>
                      </div>
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-xl font-mono text-blue-500">1072</div>
                        <div className="font-bold text-foreground text-[11px]">PERMISSIONS</div>
                        <div className="text-[10px] text-muted-foreground">Permission Nodes</div>
                      </div>
                    </div>
                  </div>

                  {/* Zone 5 */}
                  <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-purple-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        5
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        24H Telemetry & All 55 Registered Modules Chart
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-purple-500/40 text-purple-500 ml-auto">
                        ANALYTICS & CATALOG
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Live Telemetry & Throughput (Left):</strong> Continuous 24-hour visual curve tracking API request rates across all tenant shards, capturing peak operational hours.</li>
                        <li><strong className="text-foreground">Modules & Subscriptions (Right):</strong> Horizontal distribution chart showcasing all 55 registered system modules (Warehouse, Accounting, HRM, Logistics, AI Copilot, etc.) with subscribed tenant counts. Features interactive dragging and zoom controls without clipping.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 6 */}
                  <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        6
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        24H Activity Flow & PostgreSQL / Redis Memory Distribution
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-500 ml-auto">
                        STORAGE & SESSIONS
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">24H Activity Flow (Left):</strong> Compares automated background system executions (green curve) versus authenticated human operator sessions (blue curve).</li>
                        <li><strong className="text-foreground">Storage & Cache Allocation (Right):</strong> Visual distribution of PostgreSQL storage usage across core database tables alongside Redis in-memory cache allocation.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 7 */}
                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        7
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Revenue Intelligence, Shard Health & Traffic Origins
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 ml-auto">
                        FINANCE & HEALTH
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-foreground text-[11px] mb-1">REVENUE INTEL</div>
                        <div className="text-lg font-mono font-bold text-primary">0 ETB</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Enterprise Subscription Coverage: 6/6 Active</p>
                      </div>
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-foreground text-[11px] mb-1">CLUSTER HEALTH</div>
                        <div className="font-mono text-emerald-500 font-bold">193 MB DB • 33% Cache</div>
                        <p className="text-[10px] text-muted-foreground mt-1">60 Active WebSocket Realtime Connections</p>
                      </div>
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                        <div className="font-bold text-foreground text-[11px] mb-1">TRAFFIC ORIGINS</div>
                        <div className="font-mono text-primary font-bold">Addis Ababa (100%)</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Primary Gateway Region</p>
                      </div>
                    </div>
                  </div>

                  {/* Zone 8 */}
                  <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        8
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Zero-Anomaly Alerts Feed & Live System Audit Trail
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500 ml-auto">
                        SECURITY & AUDIT
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">System Alerts:</strong> Real-time anomaly detection monitor. Displays zero active exceptions once past database schema anomalies are resolved.</li>
                        <li><strong className="text-foreground">Live System Audit:</strong> High-precision audit stream capturing authenticated logins, entity modifications, and tenant events (e.g. <code className="text-primary font-mono">[AQUANOVI1]</code>, <code className="text-primary font-mono">[SANDY-LOUNGE]</code>) with millisecond timestamps.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/50 flex items-center justify-end">
                <Link href="/dashboard">
                  <Button className="rounded-full gap-2 font-space font-bold text-xs">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Launch Dashboard Cockpit
                  </Button>
                </Link>
              </div>
            </div>
          ) : activeChapter === "chapter-2" ? (
            /* ========================================================== */
            /* CHAPTER 2: SYSTEM AUDIT LOGS & FORENSIC INVESTIGATION     */
            /* ========================================================== */
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-border/50 pb-6">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-primary">
                  <span>CHAPTER 02</span>
                  <span>•</span>
                  <span>SECURITY & FORENSIC AUDITING</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-space font-black tracking-tight text-foreground">
                  System Audit Logs & Forensic Investigation
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete operational manual for tracking every administrative action, filtering anomalous events across tenant shards, inspecting before/after JSON diff payloads, and exporting tamper-evident audit trails.
                </p>
              </div>

              {/* View Toggle Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                    FIGURE 2.1
                  </Badge>
                  <span className="text-xs font-bold font-space text-foreground">
                    System Audit Logs Console & Investigation Workbench
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={auditViewMode === "annotated" ? "default" : "outline"}
                    onClick={() => setAuditViewMode("annotated")}
                    className="text-xs h-8 rounded-xl font-mono gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Annotated Guide (Zones 1-8)
                  </Button>
                  <Button
                    size="sm"
                    variant={auditViewMode === "raw" ? "default" : "outline"}
                    onClick={() => setAuditViewMode("raw")}
                    className="text-xs h-8 rounded-xl font-mono gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Clean Live View
                  </Button>
                </div>
              </div>

              {/* Screenshot Frame */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                  <img
                    src={
                      auditViewMode === "annotated"
                        ? "/manual-screenshots/02-system-audit-logs-annotated.png?v=2"
                        : "/manual-screenshots/02-system-audit-logs.png?v=2"
                    }
                    alt="System Audit Logs Console"
                    className="w-full h-auto object-cover transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-muted-foreground italic text-center">
                  {auditViewMode === "annotated"
                    ? "Interactive annotated blueprint: Each numbered callout corresponds to an essential forensic auditing control detailed below."
                    : "Clean production telemetry snapshot showing real audit entries (99 Records, 39 Changes, 54 Security Events, 7 Operators)."}
                </p>
              </div>

              {/* Comprehensive 8-Zone Operations Guide */}
              <div className="space-y-6 pt-4 border-t border-border/50">
                <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary" />
                  Functional Anatomy & Subsystem Breakdown
                </h3>
                <p className="text-xs text-muted-foreground">
                  Below is a detailed walkthrough explaining what each numbered section on the System Audit Logs page does and how to investigate actions:
                </p>

                <div className="grid grid-cols-1 gap-6">
                  {/* Zone 1 */}
                  <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        1
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Sidebar Navigation & Direct Route
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500 ml-auto">
                        NAVIGATION
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        Click <strong className="text-foreground">System Audit Logs</strong> in the left sidebar or navigate directly to <code className="text-primary font-mono bg-muted/50 px-1 py-0.5 rounded">{origin}/dashboard/audit-logs</code>.
                      </p>
                      <p>
                        The item illuminates in primary cyan/blue when active, indicating you are inside the central forensic compliance module.
                      </p>
                    </div>
                  </div>

                  {/* Zone 2 */}
                  <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        2
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Page Tour & Universal Command Header
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-500 ml-auto">
                        GLOBAL CONTROLS
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Page Tour (<Compass className="w-3 h-3 inline text-primary" />):</strong> Click the Page Tour dropdown in the breadcrumb bar to launch an interactive, spotlighted walkthrough of the audit console.</li>
                        <li><strong className="text-foreground">Global Search (<kbd className="px-1 py-0.5 bg-muted rounded font-mono">Ctrl + K</kbd>):</strong> Instantly find users, tenants, or records across the entire platform.</li>
                        <li><strong className="text-foreground">Language & Alerts:</strong> Toggle language preferences and view pending system notifications without leaving the audit workbench.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 3 */}
                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        3
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Central Audit Operations & Telemetry KPI Cards
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 ml-auto">
                        LIVE TELEMETRY
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-3">
                      <p>
                        Header banner featuring <strong className="text-foreground">Follow every action.</strong> Provides immediate high-level telemetry matching your active filters:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                          <div className="font-bold text-xl font-mono text-primary">99</div>
                          <div className="font-bold text-foreground text-[11px]">Matching Records</div>
                          <div className="text-[10px] text-muted-foreground">Current filter subset</div>
                        </div>
                        <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                          <div className="font-bold text-xl font-mono text-emerald-500">39</div>
                          <div className="font-bold text-foreground text-[11px]">Changes</div>
                          <div className="text-[10px] text-muted-foreground">Data mutations (CRUD)</div>
                        </div>
                        <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                          <div className="font-bold text-xl font-mono text-amber-500">54</div>
                          <div className="font-bold text-foreground text-[11px]">Security Events</div>
                          <div className="text-[10px] text-muted-foreground">Auth, logins, 2FA</div>
                        </div>
                        <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                          <div className="font-bold text-xl font-mono text-blue-500">7</div>
                          <div className="font-bold text-foreground text-[11px]">Operators</div>
                          <div className="text-[10px] text-muted-foreground">Distinct active actors</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Tip: Click the <strong className="text-foreground">Live refresh</strong> button on the right to toggle continuous 10-second background polling.
                      </p>
                    </div>
                  </div>

                  {/* Zone 4 */}
                  <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-purple-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        4
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Retention Modes: Active Live Logs vs Cold Storage Vault
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-purple-500/40 text-purple-500 ml-auto">
                        STORAGE & COMPLIANCE
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Active Live Logs (Tab):</strong> Real-time hot storage indexed in PostgreSQL for immediate sub-second forensic queries and daily operations.</li>
                        <li><strong className="text-foreground">Cold Storage Vault (Tab):</strong> Immutable compressed parquet archives stored in SeaweedFS / object storage for regulatory compliance (e.g. 7-year audit retention).</li>
                        <li><strong className="text-foreground">Policy Settings Button:</strong> Configure automated retention horizons (e.g. 30, 90, 365 days) and tamper-detection encryption settings.</li>
                        <li><strong className="text-foreground">Archive Older Records Button:</strong> Triggers an asynchronous worker batch to compress and seal historical audit entries.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 5 */}
                  <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        5
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Multi-Dimensional Audit Filter Toolbar
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500 ml-auto">
                        INVESTIGATION
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        Combine granular filters to isolate specific incidents without leaving the page:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">Event Category & Module</strong>
                          Filter by all activity, authentication, security events, or target specific modules like <code className="text-foreground">Security & Access</code>, <code className="text-foreground">Warehouse</code>, or <code className="text-foreground">System Audit</code>.
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">Operator & Exact Event</strong>
                          Filter by specific staff members (e.g. <code className="text-foreground">Hive Overlord</code>, <code className="text-foreground">Midyas Asmera</code>) or specific action verbs (<code className="text-foreground">logged_in</code>, <code className="text-foreground">updated</code>, <code className="text-foreground">viewed</code>).
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">Node Scope & Tenant Shard</strong>
                          Inspect platform-wide actions (<code className="text-foreground">All nodes</code>), central apex operations (<code className="text-foreground">central</code>), or isolate a tenant (<code className="text-foreground">lanouveil</code>, <code className="text-foreground">techive</code>, <code className="text-foreground">savory-lounge</code>).
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border/50">
                          <strong className="text-foreground font-mono text-[11px] block text-primary">Quick Date Presets & Range</strong>
                          One-click filters for <code className="text-foreground">Today</code>, <code className="text-foreground">7 days</code>, <code className="text-foreground">30 days</code>, <code className="text-foreground">90 days</code>, or precise calendar <code className="text-foreground">From / To</code> bounds.
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Click <strong className="text-foreground">▶ Advanced filters</strong> to filter by Client IP address, Record Primary Key, or HTTP Method.
                      </p>
                    </div>
                  </div>

                  {/* Zone 6 */}
                  <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        6
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Search, CSV/JSON Export & Print Controls
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500 ml-auto">
                        DATA EXPORT
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Instant Search:</strong> Real-time keyword filter across activity descriptions and operator names.</li>
                        <li><strong className="text-foreground">Copy (<Copy className="w-3 h-3 inline text-primary" />):</strong> Copies filtered tabular rows directly to the clipboard.</li>
                        <li><strong className="text-foreground">Download / Export (<Download className="w-3 h-3 inline text-emerald-500" />):</strong> Generates CSV or JSON export files for external SIEM tools (Splunk, Datadog) or regulatory compliance.</li>
                        <li><strong className="text-foreground">Print (<Printer className="w-3 h-3 inline text-primary" />):</strong> Formats a printer-friendly version of the audit ledger.</li>
                        <li><strong className="text-foreground">Refresh (<RefreshCw className="w-3 h-3 inline text-blue-500" />):</strong> Re-queries database with active filters.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 7 */}
                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        7
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Forensic Audit Table & Payload Diff Inspection
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 ml-auto">
                        EVIDENCE LEDGER
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        High-precision tamper-evident audit stream displaying key forensic fields:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">ID & Action:</strong> Unique sequential identifier (e.g. <code className="text-primary font-mono">#127</code>) and action pill (<code className="text-foreground font-mono">viewed</code>, <code className="text-foreground font-mono">logged_in</code>, <code className="text-foreground font-mono">session_initialized</code>).</li>
                        <li><strong className="text-foreground">Activity Description:</strong> Human-readable summary of the transaction (e.g. <em>"Opened the System Audit Logs datatable module."</em>).</li>
                        <li><strong className="text-foreground">Module & Operator:</strong> Functional domain affected and identity of the actor (e.g. <code className="text-foreground">Hive Overlord</code>, <code className="text-foreground">Lanouveil Controller</code>).</li>
                        <li><strong className="text-foreground">Node Origin:</strong> Indicates whether the event occurred in the <code className="text-primary font-mono">central</code> apex or an isolated tenant shard (<code className="text-foreground font-mono">lanouveil</code>, <code className="text-foreground font-mono">techive</code>).</li>
                        <li><strong className="text-foreground">Timestamp:</strong> Exact date and time recorded in UTC / Africa/Nairobi timezone.</li>
                        <li><strong className="text-foreground">👁 Inspect Details (Highlighted):</strong> Clicking the eye icon opens the forensic modal displaying:
                          <ul className="list-circle pl-5 mt-1 space-y-0.5 text-foreground/80">
                            <li>Client IP address, Geo-location, and HTTP User Agent.</li>
                            <li>Full Before-and-After JSON Attribute Diff (red for deleted/modified, green for added).</li>
                            <li>Cryptographic session token hash.</li>
                          </ul>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Zone 8 */}
                  <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        8
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Pagination & Rows Per Page Controls
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-500 ml-auto">
                        PAGINATION
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                      <p>
                        Located at the bottom of the table:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-foreground">Showing Indicator:</strong> Displays current range and total count (e.g. <em>"Showing 1 to 10 of 99 entries"</em>).</li>
                        <li><strong className="text-foreground">Rows Per Page:</strong> Switch viewing density between 10, 25, 50, or 100 entries per page.</li>
                        <li><strong className="text-foreground">Page Navigator:</strong> Jump between pages with Previous, numbered buttons (1, 2, 3... 10), and Next.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/50 flex items-center justify-end">
                <Link href="/dashboard/audit-logs">
                  <Button className="rounded-full gap-2 font-space font-bold text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    Open Live Audit Logs
                  </Button>
                </Link>
              </div>
            </div>
          ) : activeChapter === "chapter-3" ? (
            /* ========================================================== */
            /* CHAPTER 3: IDENTITY & ACCESS CONTROL MATRIX (RBAC)         */
            /* ========================================================== */
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-border/50 pb-6">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-primary">
                  <span>CHAPTER 03</span>
                  <span>•</span>
                  <span>IDENTITY & ACCESS GOVERNANCE (RBAC)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-space font-black tracking-tight text-foreground">
                  Identity & Access Control Matrix (RBAC)
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete operational manual for managing human and machine operator identities, enforcing granular role clearances, locking/unlocking account access, cloning clearance levels, inspecting forensic audit telemetry, and exploring the complete cryptographic capability dictionary across all three subsystems.
                </p>
              </div>

              {/* Subsystem Sub-Tabs Selector */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-md">
                <Button
                  size="sm"
                  variant={securityActiveSubTab === "users" ? "default" : "ghost"}
                  onClick={() => setSecurityActiveSubTab("users")}
                  className="rounded-xl font-space font-bold text-xs gap-2"
                >
                  <Users className="w-4 h-4" />
                  1. Operators Directory
                </Button>
                <Button
                  size="sm"
                  variant={securityActiveSubTab === "roles" ? "default" : "ghost"}
                  onClick={() => setSecurityActiveSubTab("roles")}
                  className="rounded-xl font-space font-bold text-xs gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  2. Access Control Matrix (Roles)
                </Button>
                <Button
                  size="sm"
                  variant={securityActiveSubTab === "permissions" ? "default" : "ghost"}
                  onClick={() => setSecurityActiveSubTab("permissions")}
                  className="rounded-xl font-space font-bold text-xs gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  3. Capability Dictionary (Permissions)
                </Button>
              </div>

              {/* ============================================================ */}
              {/* SUB-TAB 1: OPERATORS DIRECTORY                               */}
              {/* ============================================================ */}
              {securityActiveSubTab === "users" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Operator Sub-Lifecycle Tab Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-md shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Operator Workflows:
                      </span>
                      <Button
                        size="sm"
                        variant={operatorsActiveTab === "main" ? "default" : "ghost"}
                        onClick={() => setOperatorsActiveTab("main")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Users className="w-3.5 h-3.5" />
                        1. Directory Overview
                      </Button>
                      <Button
                        size="sm"
                        variant={operatorsActiveTab === "create" ? "default" : "ghost"}
                        onClick={() => setOperatorsActiveTab("create")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        2. Provision (Create)
                      </Button>
                      <Button
                        size="sm"
                        variant={operatorsActiveTab === "view" ? "default" : "ghost"}
                        onClick={() => setOperatorsActiveTab("view")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        3. Inspection (View)
                      </Button>
                      <Button
                        size="sm"
                        variant={operatorsActiveTab === "edit" ? "default" : "ghost"}
                        onClick={() => setOperatorsActiveTab("edit")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                        4. Profile & Clearance (Edit)
                      </Button>
                      <Button
                        size="sm"
                        variant={operatorsActiveTab === "delete" ? "default" : "ghost"}
                        onClick={() => setOperatorsActiveTab("delete")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        5. Purge & Soft-Delete (Delete)
                      </Button>
                    </div>

                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 hidden sm:flex">
                      TAB 1 • 5 LIFECYCLE STAGES
                    </Badge>
                  </div>

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 1: DIRECTORY OVERVIEW (MAIN PAGE)                    */}
                  {/* ---------------------------------------------------------- */}
                  {operatorsActiveTab === "main" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Toggle Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                            FIGURE 3.1-A
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Operators Directory Workbench & Live Identity Controls
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={securityViewMode === "annotated" ? "default" : "outline"}
                            onClick={() => setSecurityViewMode("annotated")}
                            className="text-xs h-8 rounded-xl font-mono gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Annotated Blueprint (Zones 1-8)
                          </Button>
                          <Button
                            size="sm"
                            variant={securityViewMode === "raw" ? "default" : "outline"}
                            onClick={() => setSecurityViewMode("raw")}
                            className="text-xs h-8 rounded-xl font-mono gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Clean Production View
                          </Button>
                        </div>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src={
                              securityViewMode === "annotated"
                                ? "/manual-screenshots/03-identity-access-annotated.png"
                                : "/manual-screenshots/03-operators-main.png"
                            }
                            alt="Operators Directory Workbench"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          {securityViewMode === "annotated"
                            ? "Interactive annotated blueprint: Each numbered callout corresponds to an essential identity & access capability detailed below."
                            : "Clean production telemetry snapshot showing registered operators (13 Total Users, Node Clearance 127, Pinned Fixed Columns, Sequential Counters 1..N, Active Access Switches)."}
                        </p>
                      </div>

                      {/* Comprehensive 8-Zone Operations Guide */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Compass className="w-5 h-5 text-primary" />
                          Functional Anatomy & Subsystem Breakdown (Zones 1 - 8)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Below is a detailed walkthrough explaining what each numbered section on the Operators Directory page does and how to manage node operators:
                        </p>

                        <div className="grid grid-cols-1 gap-6">
                          {/* Zone 1 */}
                          <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                1
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Sidebar Navigation & Direct Security Route
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500 ml-auto">
                                NAVIGATION
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <p>
                                Click <strong className="text-foreground">Identity & Access</strong> in the left sidebar or navigate directly to <code className="text-primary font-mono bg-muted/50 px-1 py-0.5 rounded">{origin}/dashboard/security</code>.
                              </p>
                              <p>
                                The navigation pill illuminates in glowing cyan when active, indicating you are inside the central authentication, RBAC authorization, and user management matrix. Tab persistence ensures your chosen tab is maintained across browser reloads.
                              </p>
                            </div>
                          </div>

                          {/* Zone 2 */}
                          <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                2
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Page Tour Trigger & Breadcrumb Navigation
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-500 ml-auto">
                                GLOBAL CONTROLS
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-foreground">Page Tour (<HelpCircle className="w-3 h-3 inline text-primary" />):</strong> Located in the top-right header, clicking this button triggers the full interactive Joyride walkthrough guiding you step-by-step through Operator management, Roles, and Permissions.</li>
                                <li><strong className="text-foreground">Breadcrumb Trail:</strong> Provides single-click return to Hive.OS Dashboard root.</li>
                                <li><strong className="text-foreground">Node Clearance Indicator:</strong> Displays the current cluster context (Central System or specific Tenant Node) with live neural heartbeat pulses.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Zone 3 */}
                          <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-purple-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                3
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Security Matrix Subsystems (Persistent Tabs)
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-purple-500/40 text-purple-500 ml-auto">
                                PERSISTENT TABS
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <p>
                                Switch between the three foundational pillars of node access governance with full URL state and local storage persistence:
                              </p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-foreground">Operators:</strong> Directory of identities, credential management, clearance bindings, instant access lock switch, 2FA status, and preset date filtering.</li>
                                <li><strong className="text-foreground">Access Roles:</strong> Define custom clearance levels, duplicate/clone existing roles (<Layers className="w-3 h-3 inline text-emerald-500" />), inspect bound capabilities grouped by module domain, and trace assigned operators.</li>
                                <li><strong className="text-foreground">Permissions:</strong> Comprehensive glossary of granular security protocol codes with one-click clipboard copying, domain filters (Identity, Warehouse, Logistics, CRM, etc.), and JSON/CSV export.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Zone 4 */}
                          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                4
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                System Operators Header & Provisioning Action
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 ml-auto">
                                PROVISIONING
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-foreground">TOTAL USERS KPI:</strong> Live metric displaying total active identities currently registered on this node (e.g. <code>13 TOTAL USERS</code>).</li>
                                <li><strong className="text-foreground">+ New Node Operator:</strong> Primary action button that opens the secure Provisioning Dialog to register a new operator with full name, email, clearance role, password, and optional profile photo.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Zone 5 */}
                          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                5
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Multi-Dimensional Operator Filter Suite & Date Presets
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500 ml-auto">
                                FILTERS & PRESETS
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <p>
                                High-precision filters enable immediate pinpointing of specific operator cohorts:
                              </p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-foreground">Quick Date Presets:</strong> Rapidly filter by <code className="text-primary font-bold">Today</code>, <code className="text-primary font-bold">7D</code>, or <code className="text-primary font-bold">30D</code> registration windows.</li>
                                <li><strong className="text-foreground">Status Filter:</strong> Toggle between <code>All Status</code>, <code>Active</code>, or <code>Locked</code> accounts.</li>
                                <li><strong className="text-foreground">Clearance Level (Role):</strong> Filter by assigned Spatie role (e.g. <code>Super Admin</code>, <code>Admin</code>, <code>Accountant</code>, <code>Support Specialist</code>).</li>
                                <li><strong className="text-foreground">Onboarding Status:</strong> Isolate accounts with <code>Password Setup Pending</code> vs <code>Onboarding Complete</code>.</li>
                                <li><strong className="text-foreground">2FA Security Status:</strong> Filter identities with <code>2FA Active</code> vs <code>2FA Inactive</code> for compliance audits.</li>
                                <li><strong className="text-foreground">Joined Date Window:</strong> Filter operators by custom calendar date range.</li>
                                <li><strong className="text-foreground">Clear Button:</strong> Reset all active filter parameters back to default with a single click.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Zone 6 */}
                          <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                6
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Deep Matrix Search & Ledger Export Suite
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500 ml-auto">
                                SEARCH & EXPORT
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-foreground">Real-Time Search:</strong> Server-side debounced search matching operator names, email addresses, and badge IDs.</li>
                                <li><strong className="text-foreground">Clipboard Copy (<Copy className="w-3 h-3 inline text-primary" />):</strong> Copies the active operator table or selected rows directly to clipboard formatted in clean TSV format.</li>
                                <li><strong className="text-foreground">Export Ledger (<Download className="w-3 h-3 inline text-primary" />):</strong> Download the operator directory in CSV, Excel (XLSX), or PDF formats with tamper-evident audit logging.</li>
                                <li><strong className="text-foreground">Certified Print (<Printer className="w-3 h-3 inline text-primary" />):</strong> Generates an official print-formatted operator roster.</li>
                                <li><strong className="text-foreground">Force Synchronize (<RefreshCw className="w-3 h-3 inline text-primary" />):</strong> Manually queries the database to pull real-time clearance changes.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Zone 7 */}
                          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                7
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Pinned Identity Anchors (Fixed Columns: # Sequence & Operator)
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-500 ml-auto">
                                FIXED COLUMNS
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <p>
                                Just like the Products and Inventory modules, the Operator table keeps key identity columns <strong className="text-foreground">permanently pinned on the left</strong> while you scroll sideways:
                              </p>
                              <ul className="list-disc pl-5 space-y-2">
                                <li>
                                  <strong className="text-foreground">Selection Checkbox:</strong> Stays fixed on the far left so you can easily select one or multiple team members for batch actions without losing your place.
                                </li>
                                <li>
                                  <strong className="text-foreground">Sequential Row Number (#):</strong> Displays a clean, consecutive counter (<code className="text-primary font-bold">1, 2, 3...</code>) across all pages. This gives every person an easy row number for quick reference and team discussions.
                                </li>
                                <li>
                                  <strong className="text-foreground">Operator (Photo, Name & Email):</strong> Stays permanently visible on the left side while you scroll horizontally through clearance roles, access statuses, and dates, so you always know whose row you are looking at.
                                </li>
                                <li>
                                  <strong className="text-foreground">Elevation Shadow & Divider:</strong> A subtle shadow clearly separates the pinned identity columns from the scrolling information, keeping the table clean, organized, and effortless to read.
                                </li>
                              </ul>
                            </div>
                          </div>

                          {/* Zone 8 */}
                          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                8
                              </div>
                              <h4 className="font-bold text-sm text-foreground">
                                Instant Access Lock Switch & Security Action Hub
                              </h4>
                              <Badge variant="outline" className="text-[10px] font-mono border-rose-500/40 text-rose-500 ml-auto">
                                SECURITY CONTROLS
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                              <p>
                                Each operator row features granular controls for access management and emergency response:
                              </p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-foreground">Instant Status Switch:</strong> Toggle between <code>ACTIVE</code> (green) and <code>LOCKED</code> (gray). Deactivating an operator revokes all active session tokens instantly without deleting their account.</li>
                                <li><strong className="text-foreground">Impersonate Session (<VenetianMask className="w-3 h-3 inline text-emerald-500" />):</strong> Super Administrators can temporarily assume this operator&apos;s UI context for live troubleshooting without requesting their password.</li>
                                <li><strong className="text-foreground">Inspect Profile (<Eye className="w-3 h-3 inline text-blue-500" />):</strong> Opens the Operator Detail Sheet with direct &ldquo;Audit Trail&rdquo; jump link to System Audit Logs.</li>
                                <li><strong className="text-foreground">Edit Identity (<Pencil className="w-3 h-3 inline text-indigo-500" />):</strong> Modify operator display name, update email, change clearance roles, or upload custom avatars.</li>
                                <li><strong className="text-foreground">Move to Trash (<Trash2 className="w-3 h-3 inline text-destructive" />):</strong> Soft-deletes the identity into the Global Trash Bin (<code>/dashboard/trash</code>) with 30-day retention and real-time Reverb broadcast. A toast action button allows navigating straight to Trash.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Operator Workflows Quick Launch Cards */}
                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Key className="w-5 h-5 text-primary" />
                          Explore Operator Lifecycle Workflows
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Click below to inspect the dedicated manuals and full field walkthroughs for each operator action:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <button
                            onClick={() => setOperatorsActiveTab("create")}
                            className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                                <UserPlus className="w-4 h-4" />
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400">
                                PROVISION
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Provision Operator</h4>
                            <p className="text-xs text-muted-foreground">Add new members, upload avatars, bind clearance levels, and generate cryptographic keys.</p>
                          </button>

                          <button
                            onClick={() => setOperatorsActiveTab("view")}
                            className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                                <Eye className="w-4 h-4" />
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-400">
                                INSPECT
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Inspect Identity</h4>
                            <p className="text-xs text-muted-foreground">Forensic sheet showing timestamps, 2FA status, database IDs, and Audit Trail shortcuts.</p>
                          </button>

                          <button
                            onClick={() => setOperatorsActiveTab("edit")}
                            className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-left transition-all space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                                <Pencil className="w-4 h-4" />
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/40 text-indigo-400">
                                MODIFY
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Edit Profile & Role</h4>
                            <p className="text-xs text-muted-foreground">Update legal name, email, promote/demote clearance, and reset credentials safely.</p>
                          </button>

                          <button
                            onClick={() => setOperatorsActiveTab("delete")}
                            className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-left transition-all space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
                                <Trash2 className="w-4 h-4" />
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono border-rose-500/40 text-rose-400">
                                PURGE
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Soft-Delete & Trash</h4>
                            <p className="text-xs text-muted-foreground">Revoke active sessions, soft-delete to 30-day Trash Bin, and restore records anytime.</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 2: PROVISION OPERATOR (CREATE MODAL)                 */}
                  {/* ---------------------------------------------------------- */}
                  {operatorsActiveTab === "create" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                            FIGURE 3.1-B
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Provision New Node Operator Workflow (&ldquo;New Team Member&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                          PROVISIONING HANDSHAKE
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-operators-create.png"
                            alt="Provision New Operator Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: New Team Member onboarding modal featuring avatar upload engine, full name, email address, role clearance dropdown, and auto-generating encryption key suite.
                        </p>
                      </div>

                      {/* Field-by-Field Breakdown */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-emerald-500" />
                          Field-by-Field Provisioning Specification
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Every credential and clearance parameter configured during the onboarding handshake is strictly verified:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">1. AVATAR PROFILE ASSET</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Visual Identity & Media Storage</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Upload New:</strong> Allows selecting a high-resolution image file (JPG, PNG, GIF, WebP up to 5MB). The asset is compressed and stored on secure cloud/local media buckets.</li>
                              <li><strong className="text-foreground">Library:</strong> Opens the system avatar library to choose from pre-rendered procedural badge seeds.</li>
                              <li><strong className="text-foreground">Default Fallback:</strong> If omitted, the platform dynamically renders high-contrast initials (e.g. &ldquo;SC&rdquo;) on a purple gradient circle.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">2. FULL LEGAL NAME</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Operator Display Name</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Input:</strong> Standard text field (e.g. <code>Elena Vance</code>).</li>
                              <li><strong className="text-foreground">System Audit Trace:</strong> This name is stamped across all picking tickets, dispatch notes, purchase orders, and forensic audit logs executed under this operator&apos;s identity.</li>
                              <li><strong className="text-foreground">Validation:</strong> Minimum 2 characters, sanitizing against SQL/XSS injection.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">3. EMAIL ADDRESS</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Gateway Login Identifier</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Input:</strong> RFC-compliant email address (e.g. <code>operator@hive.os</code>).</li>
                              <li><strong className="text-foreground">Uniqueness:</strong> Must be strictly unique across the tenant cluster. Duplicate registrations are immediately rejected with validation feedback.</li>
                              <li><strong className="text-foreground">Dispatches:</strong> Used for automated security alerts, password resets, and session alerts.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">4. CLEARANCE LEVEL</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Spatie Role Assignment</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Dropdown:</strong> Select from cluster clearance roles (e.g. <code>Accountant</code>, <code>Admin</code>, <code>Inventory Manager</code>, <code>Support Specialist</code>, <code>Super Admin</code>).</li>
                              <li><strong className="text-foreground">Least Privilege:</strong> Automatically binds the exact set of granular capability protocol tokens defined in the Access Control Matrix.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2 md:col-span-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">5. ENCRYPTION KEY (PASSWORD)</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Cryptographic Gateway Credential</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Visibility Eye:</strong> Toggle between hidden dots and cleartext to verify correct character entry.</li>
                              <li><strong className="text-foreground">Generate Button (<Sparkles className="w-3 h-3 inline text-primary" />):</strong> One-click cryptographic random string generator producing a 16-character high-entropy secret with uppercase, lowercase, numbers, and symbols.</li>
                              <li><strong className="text-foreground">Hashing Standard:</strong> Transmitted over TLS 1.3 and hashed via Argon2/Bcrypt with random salt before database write. Cleartext is never persisted.</li>
                            </ul>
                          </div>
                        </div>

                        {/* Step-by-Step Provisioning Guide */}
                        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Step-by-Step Operator Provisioning Walkthrough
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>From the main directory, click the primary <strong className="text-foreground">+ New Node Operator</strong> button in the top header.</li>
                            <li>In the dialog, type the operator&apos;s full legal name into <strong className="text-foreground">Full Name</strong>.</li>
                            <li>Enter their enterprise email into <strong className="text-foreground">Email Address</strong>.</li>
                            <li>Open the <strong className="text-foreground">Clearance Level</strong> select menu and assign their functional role (e.g. <code>Accountant</code>).</li>
                            <li>Click <strong className="text-foreground">Generate</strong> to synthesize an uncrackable initial password, and copy it to deliver securely to the team member.</li>
                            <li>Optionally upload an avatar picture or pick from the library.</li>
                            <li>Click <strong className="text-foreground">Save Member</strong>. The backend commits the user in an atomic transaction, writes a <code>CREATE</code> entry into the audit trail, and fires a WebSocket update to all live administrative sessions.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 3: INSPECT IDENTITY (VIEW MODAL)                     */}
                  {/* ---------------------------------------------------------- */}
                  {operatorsActiveTab === "view" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-blue-500 border-blue-500/30">
                            FIGURE 3.1-C
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Operator Identity Inspection Sheet (&ldquo;Operator Detail&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-blue-500 border-blue-500/30">
                          FORENSIC INSPECTION
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-operators-view.png"
                            alt="Operator Detail Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: Operator Detail sheet displaying profile card, active status indicator, clearance badge, database sequence identifier (#14), member join date, and forensic Audit Trail deep link.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-500" />
                          Identity Inspection Anatomy & Audit Shortcut
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          The Operator Detail sheet provides read-only security clarity without risk of accidental data mutation:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">1. IDENTITY BANNER & AVATAR</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Visual Profile Card</h5>
                            <p className="text-xs text-muted-foreground">
                              Features high-resolution avatar display, full legal name (<strong className="text-foreground">Ops User HDKZ</strong>), and verified registered email (<strong className="text-foreground">ops-user-8@hive.os</strong>).
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">2. SECURITY STATUS BADGES</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Real-Time Access Clearance</h5>
                            <p className="text-xs text-muted-foreground">
                              Displays the real-time account status (<Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-mono text-[10px]">ACTIVE</Badge>) and assigned functional clearance level (<Badge variant="outline" className="text-indigo-400 border-indigo-500/30 font-mono text-[10px]">Support Specialist</Badge>).
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">3. METADATA TELEMETRY GRID</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Database Sequence & Timestamps</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Joined:</strong> Immutable registration timestamp (e.g. <code>Oct 21, 2026</code>).</li>
                              <li><strong className="text-foreground">Operator ID:</strong> Internal primary database key (e.g. <code>14</code>) for API query correlations.</li>
                              <li><strong className="text-foreground">Filter by Clearance:</strong> Quick filter shortcut by role (<code>Support Specialist</code>).</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">4. FORENSIC ACTION HUB</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Deep Links & Communications</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Send Email:</strong> Launches the default mail client addressed to the operator.</li>
                              <li><strong className="text-foreground">Audit Trail Shortcut:</strong> One-click navigation that redirects straight to <code className="text-primary font-mono">{origin}/dashboard/audit-logs</code> pre-filtered for this operator&apos;s events!</li>
                            </ul>
                          </div>
                        </div>

                        {/* Step-by-Step Inspection Guide */}
                        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-blue-500" />
                            How to Perform Forensic Identity Auditing
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Find the target operator in the directory table and click the blue <strong className="text-foreground">View (<Eye className="w-3 h-3 inline text-blue-400" />)</strong> icon in the Actions column.</li>
                            <li>Inspect their verified clearance role, 2FA status, and internal database Operator ID.</li>
                            <li>Click the <strong className="text-foreground">Audit Trail</strong> button in the bottom-left corner of the modal.</li>
                            <li>The system navigates immediately to the <strong className="text-foreground">System Audit Logs</strong> ledger, filtering by this operator so you can review their complete operational history across the node.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 4: PROFILE & CLEARANCE (EDIT MODAL)                  */}
                  {/* ---------------------------------------------------------- */}
                  {operatorsActiveTab === "edit" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-indigo-500 border-indigo-500/30">
                            FIGURE 3.1-D
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Edit Profile & Clearance Level Workflow (&ldquo;Edit Profile&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-indigo-500 border-indigo-500/30">
                          IDENTITY MODIFICATION
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-operators-edit.png"
                            alt="Edit Profile Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: Edit Profile modal allowing avatar replacement or removal, full name and email address adjustments, clearance role promotion/demotion, and secure non-destructive password updates.
                        </p>
                      </div>

                      {/* Field-by-Field Breakdown */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Pencil className="w-5 h-5 text-indigo-500" />
                          Field Breakdown & Non-Destructive Update Rules
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Modifying an existing identity adheres to strict zero-downtime security protocols:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">1. AVATAR CONTROLS</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Remove / Replace Profile Photo</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Remove:</strong> Deletes the custom uploaded photo and resets the operator to synthesized initials.</li>
                              <li><strong className="text-foreground">Upload New / Library:</strong> Allows replacing the avatar without affecting login credentials.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">2. LEGAL NAME & EMAIL</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Identity Corrections</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li>Pre-populated with current operational credentials.</li>
                              <li>Updating email propagates across the gateway. Active sessions remain valid unless a password rotation is executed concurrently.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">3. CLEARANCE RE-ASSIGNMENT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Role Promotion & Demotion</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li>Change the operator&apos;s assigned Spatie role with a single click.</li>
                              <li>Permissions take effect immediately upon their next authenticated API request. Cached Spatie permission stores are flushed automatically.</li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">4. NON-DESTRUCTIVE PASSWORD FIELD</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Safe Credential Updates</h5>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                              <li><strong className="text-foreground">Crucial Rule:</strong> Leave blank to keep current password unchanged.</li>
                              <li>Entering a new key updates the Argon2/Bcrypt hash and invalidates old session cookies to prevent hijacked token persistence.</li>
                            </ul>
                          </div>
                        </div>

                        {/* Step-by-Step Edit Guide */}
                        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                            Step-by-Step Operator Modification Walkthrough
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Click the indigo <strong className="text-foreground">Edit (<Pencil className="w-3 h-3 inline text-indigo-400" />)</strong> icon on the operator row.</li>
                            <li>Modify legal name or operational email address.</li>
                            <li>To promote or demote clearance, select a new role from the <strong className="text-foreground">Clearance Level</strong> menu.</li>
                            <li>If resetting credentials, enter a new password or click <strong className="text-foreground">Generate</strong>; otherwise, leave the password field completely blank.</li>
                            <li>Click <strong className="text-foreground">Save Changes</strong>. The backend writes an <code>UPDATE</code> record to the audit ledger and broadcasts changes in real time.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 5: PURGE & SOFT-DELETE (DELETE MODAL)                */}
                  {/* ---------------------------------------------------------- */}
                  {operatorsActiveTab === "delete" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-rose-500 border-rose-500/30">
                            FIGURE 3.1-E
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Purge Operator Confirmation & Soft-Delete Dialog
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-rose-500 border-rose-500/30">
                          ACCESS REVOCATION & TRASH
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-operators-delete.png"
                            alt="Purge Operator Confirmation Dialog"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: Purge Operator confirmation dialog warning that active sessions and cryptographic encryption keys will be immediately revoked, with soft-delete routing directly to the 30-day Global Trash Bin.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-rose-500" />
                          Cryptographic Purge Protocol & 30-Day Trash Bin Recovery
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Deleting an operator is designed to protect cluster safety while preventing irreversible data loss:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">1. THREAT CONFIRMATION</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Explicit Name Verification</h5>
                            <p className="text-xs text-muted-foreground">
                              The dialog explicitly warns: <strong className="text-foreground">&ldquo;This will permanently delete ops-user-8@hive.os. All active access sessions and encryption keys will be immediately destroyed.&rdquo;</strong>
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">2. INSTANT ACCESS TERMINATION</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Session Token Destruction</h5>
                            <p className="text-xs text-muted-foreground">
                              Upon clicking <strong className="text-foreground">Confirm Purge</strong>, all active JWTs, Sanctum tokens, and gateway sessions associated with this operator are instantly destroyed across all nodes.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">3. GLOBAL TRASH RETENTION</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">30-Day Soft-Delete Protection</h5>
                            <p className="text-xs text-muted-foreground">
                              The account is soft-deleted and moved into the system <strong className="text-foreground">Global Trash Bin</strong> (<code className="text-primary font-mono">{origin}/dashboard/trash</code>). It remains recoverable for 30 days before automated garbage collection.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">4. INSTANT RECOVERY TOAST</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">1-Click Restoration Action</h5>
                            <p className="text-xs text-muted-foreground">
                              Immediately following deletion, a toast notification surfaces containing a direct <strong className="text-foreground">&ldquo;View Trash&rdquo;</strong> button. Clicking it navigates straight to Trash where you can restore the user in one click.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Purge & Recovery Guide */}
                        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            How to Safely Purge & Restore an Operator
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Click the red <strong className="text-foreground">Delete (<Trash2 className="w-3 h-3 inline text-destructive" />)</strong> icon on an operator row (or select multiple checkboxes for bulk purge).</li>
                            <li>Carefully review the confirmation modal confirming the operator name and session revocation warning.</li>
                            <li>Click the red <strong className="text-foreground">Confirm Purge</strong> button.</li>
                            <li>A success toast notification appears: <code className="text-primary font-mono font-bold">Operator moved to trash bin.</code></li>
                            <li>If this action was made in error, click the <strong className="text-foreground">View Trash</strong> button in the toast (or visit <code>/dashboard/trash</code>) and click <strong className="text-foreground">Restore</strong> to recover the account instantly with all permissions intact.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* SUB-TAB 2: ACCESS CONTROL MATRIX (ROLES)                     */}
              {/* ============================================================ */}
              {securityActiveSubTab === "roles" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Roles Sub-Lifecycle Tab Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-md shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        Clearance Workflows:
                      </span>
                      <Button
                        size="sm"
                        variant={rolesActiveTab === "main" ? "default" : "ghost"}
                        onClick={() => setRolesActiveTab("main")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        1. Roles Matrix Overview
                      </Button>
                      <Button
                        size="sm"
                        variant={rolesActiveTab === "create" ? "default" : "ghost"}
                        onClick={() => setRolesActiveTab("create")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                        2. Establish (Create)
                      </Button>
                      <Button
                        size="sm"
                        variant={rolesActiveTab === "view" ? "default" : "ghost"}
                        onClick={() => setRolesActiveTab("view")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        3. Clearance Profile (View)
                      </Button>
                      <Button
                        size="sm"
                        variant={rolesActiveTab === "edit" ? "default" : "ghost"}
                        onClick={() => setRolesActiveTab("edit")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                        4. Reconfigure (Edit)
                      </Button>
                      <Button
                        size="sm"
                        variant={rolesActiveTab === "delete" ? "default" : "ghost"}
                        onClick={() => setRolesActiveTab("delete")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        5. Purge & Soft-Delete (Delete)
                      </Button>
                    </div>

                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 hidden sm:flex">
                      TAB 2 • 5 LIFECYCLE STAGES
                    </Badge>
                  </div>

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 1: ROLES MATRIX OVERVIEW (MAIN PAGE)                 */}
                  {/* ---------------------------------------------------------- */}
                  {rolesActiveTab === "main" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                            FIGURE 3.2-A
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Access Control Matrix & Clearance Level Governance
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                          LIVE CLUSTER ROLES
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-roles-main.png"
                            alt="Access Control Matrix Roles Workbench"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Figure 3.2-A: Production telemetry snapshot of the Access Control Matrix ledger featuring sequential row numbers (#), clear role designations, bound capability counts, active operator metrics, and quick action controls.
                        </p>
                      </div>

                      {/* Quick Action Interactive Cards */}
                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Key className="w-5 h-5 text-primary" />
                          Explore Role Lifecycle Workflows
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Click any card below to open the step-by-step visual guide for each clearance action:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <button
                            type="button"
                            onClick={() => setRolesActiveTab("create")}
                            className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <PlusCircle className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Establish Clearance</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Create new job roles, choose permissions with instant search, and bind capabilities.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRolesActiveTab("view")}
                            className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                <Eye className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-blue-500/50 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Inspect Profile</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              View all bound permission badges, assigned operators count, and jump to forensic audit logs.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRolesActiveTab("edit")}
                            className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                <Pencil className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-indigo-500/50 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Reconfigure Matrix</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Adjust clearance titles and toggle permissions on/off with live system-wide sync.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRolesActiveTab("delete")}
                            className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-rose-500/50 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Purge & Trash</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Safely soft-delete unused roles with 30-day retention in the Global Trash Bin.
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Deep Architecture Breakdown */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-primary" />
                          Role Hierarchy & Capability Binding Architecture
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          The Access Control Matrix defines cryptographic clearance tiers and maps them to granular capability nodes enforced by backend policies:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Pillar 1 */}
                          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-amber-500 shrink-0" />
                              <h4 className="font-bold text-sm text-foreground">Super Admin (God Mode)</h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Root clearance with <code>ALL PROTOCOLS (GOD MODE)</code> engaged. Automatically bypasses capability gates and possesses immutable protection against deletion or tampering.
                            </p>
                          </div>

                          {/* Pillar 2 */}
                          <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                              <h4 className="font-bold text-sm text-foreground">Admin (System Core)</h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Core operational administrator with comprehensive module management, user provisioning, and full tenant configuration authority across the node.
                            </p>
                          </div>

                          {/* Pillar 3 */}
                          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                            <div className="flex items-center gap-2">
                              <Layers className="w-5 h-5 text-emerald-500 shrink-0" />
                              <h4 className="font-bold text-sm text-foreground">Custom Clearance Tiers</h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Bespoke roles (e.g. <em>Subscription Admin</em>, <em>Tenant Viewer</em>, <em>Operations Manager</em>) tailored to specific departmental duty scopes with custom permission bindings.
                            </p>
                          </div>
                        </div>

                        {/* Roles Table Capabilities */}
                        <div className="p-5 rounded-2xl border border-border/60 bg-card/40 space-y-4">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Key className="w-4 h-4 text-primary" />
                            Key Capabilities of the Access Roles Workbench
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Sequential Index Counter (#):</strong>
                              <span>Strictly counts consecutively from <code>1, 2, 3..</code> across pages instead of exposing internal database keys.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Pinned Role Name & Badge:</strong>
                              <span>Stays fixed on the left while scrolling sideways, showing the role icon, clear title, one-click copy button, and security guard label.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• 1-Click Role Cloning (<Layers className="w-3 h-3 inline text-emerald-500" />):</strong>
                              <span>Instantly duplicates any existing role and all its capability nodes without manually re-checking 50+ permission checkboxes.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Direct Forensic Audit Jump:</strong>
                              <span>The Overview modal features a direct shortcut to <code className="text-primary font-mono">{origin}/dashboard/audit-logs</code> pre-filtered to the specific role&apos;s lifecycle events.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Global Trash Bin Integration:</strong>
                              <span>Custom roles are safely moved to the Trash Bin with a 30-day restore guarantee, preventing accidental loss of complex RBAC configurations.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Quick Date Presets:</strong>
                              <span>Filter created roles by <code>Today</code>, <code>7D</code>, or <code>30D</code> presets, or by assignment status (assigned vs unassigned).</span>
                            </div>
                          </div>
                        </div>

                        {/* Step-by-Step Workflows */}
                        <div className="space-y-4">
                          <h4 className="font-bold text-sm font-space text-foreground uppercase tracking-wider">
                            Operational Workflows for Role Governance
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                              <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                                How to Create a New Clearance Level
                              </h5>
                              <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
                                <li>Click the <strong className="text-foreground">+ Create Clearance Level</strong> primary button.</li>
                                <li>Enter the designation title (e.g. <code>Logistics Auditor</code>).</li>
                                <li>Use the capability search bar or filters to locate required permissions.</li>
                                <li>Check individual permissions or click &ldquo;Select All&rdquo;.</li>
                                <li>Click <strong className="text-foreground">Create Clearance Level</strong> to register the role.</li>
                              </ol>
                            </div>

                            <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                              <h5 className="font-bold text-xs text-foreground flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                                How to Clone an Existing Role
                              </h5>
                              <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
                                <li>Find the role you wish to copy (e.g. <code>Subscription Admin</code>).</li>
                                <li>Click the green <strong className="text-foreground">Clone (<Layers className="w-3 h-3 inline text-emerald-500" />)</strong> icon in the Actions column.</li>
                                <li>The system creates a carbon-copy role labeled <code>[Clone] Subscription Admin</code> with all bound capabilities duplicated.</li>
                                <li>Click <strong className="text-foreground">Edit (<Pencil className="w-3 h-3 inline text-indigo-500" />)</strong> to rename it or adjust specific permissions.</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 2: ESTABLISH CLEARANCE LEVEL (CREATE MODAL)          */}
                  {/* ---------------------------------------------------------- */}
                  {rolesActiveTab === "create" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                            FIGURE 3.2-B
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Clearance Level Creation Workflow (&ldquo;Establish Clearance Level&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                          ROLE PROVISIONING
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-roles-create.png"
                            alt="Establish Clearance Level Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: &ldquo;Establish Clearance Level&rdquo; modal featuring role designation naming, interactive guidance icon, live capability search, quick filter pills (All, Active, Available), Select All / Clear All toggles, and individual permission switches.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <PlusCircle className="w-5 h-5 text-emerald-500" />
                          Field-by-Field Clearance Level Creation Guide
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Creating a role defines what team members assigned to this tier can view, edit, or manage across the entire application:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">1. ROLE DESIGNATION</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Role Title & Purpose</h5>
                            <p className="text-xs text-muted-foreground">
                              Enter a descriptive, recognizable name for the job role (e.g. <strong className="text-foreground">Logistics Auditor</strong>, <strong className="text-foreground">Warehouse Supervisor</strong>, or <strong className="text-foreground">Billing Specialist</strong>). This name will be displayed on operator profiles, table badges, and audit logs.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">2. GUIDANCE INFO ICON</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Helpful Popover Guidance</h5>
                            <p className="text-xs text-muted-foreground">
                              Click the <strong className="text-foreground">Information (<HelpCircle className="w-3 h-3 inline text-primary" />)</strong> icon beside the title to open a quick context card. It reminds you of role naming best practices and permission inheritance rules so you don&apos;t have to guess.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">3. CAPABILITY SEARCH & FILTERS</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Live Filtering & Quick Pills</h5>
                            <p className="text-xs text-muted-foreground">
                              With over 150 granular system permissions, you can type in the search bar (e.g. &ldquo;orders&rdquo; or &ldquo;delete&rdquo;) to instantly filter the list. Use the quick filter pills (<Badge variant="outline" className="text-[10px] font-mono">All</Badge>, <Badge variant="outline" className="text-[10px] font-mono">Active</Badge>, <Badge variant="outline" className="text-[10px] font-mono">Available</Badge>) to see only selected or unselected permissions.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">4. BATCH ACTIONS & SAVE</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Select All & Save Clearance</h5>
                            <p className="text-xs text-muted-foreground">
                              Use <strong className="text-foreground">Select All</strong> to grant all filtered permissions in one click, or <strong className="text-foreground">Clear All</strong> to start fresh. When ready, click the primary <strong className="text-foreground">Create Clearance Level</strong> button to register the role immediately.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Creation Guide */}
                        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-emerald-500" />
                            How to Create a New Clearance Level (Step-by-Step)
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Click the <strong className="text-foreground">+ Create Clearance Level</strong> button at the top right of the Roles Directory.</li>
                            <li>Type a clear title in the <strong className="text-foreground">Role Designation</strong> field (e.g. <code>Warehouse Dispatcher</code>).</li>
                            <li>Use the <strong className="text-foreground">Search Capabilities</strong> box to find the permissions needed (e.g. <code>shipments.view</code>, <code>shipments.create</code>).</li>
                            <li>Click the checkbox next to each permission you want this role to have.</li>
                            <li>Click the green <strong className="text-foreground">Create Clearance Level</strong> button at the bottom right.</li>
                            <li>A success message confirms the role was established. It is now immediately available in the Operator Provisioning dropdown!</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 3: CLEARANCE PROFILE (VIEW MODAL)                    */}
                  {/* ---------------------------------------------------------- */}
                  {rolesActiveTab === "view" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-blue-500 border-blue-500/30">
                            FIGURE 3.2-C
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Clearance Profile Inspection Workflow (&ldquo;Clearance Profile&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-blue-500 border-blue-500/30">
                          READ-ONLY AUDIT
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-roles-view.png"
                            alt="Clearance Profile Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: &ldquo;Clearance Profile&rdquo; modal displaying role badge, assigned operators count, full list of bound capability badges, one-click copy title action, and direct Audit Trail shortcut.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-500" />
                          Clearance Profile Inspection Anatomy & Forensic Audit
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          The Clearance Profile modal lets supervisors and security auditors inspect exactly what powers a role possesses without any danger of accidentally changing settings:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">1. CLEARANCE BADGE & COPY</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Role Title & One-Click Copy</h5>
                            <p className="text-xs text-muted-foreground">
                              Displays the full official role title with its security shield badge. Click the <strong className="text-foreground">Copy (<Copy className="w-3 h-3 inline text-primary" />)</strong> icon to instantly copy the role title to your clipboard for documentation or messaging.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">2. ASSIGNED OPERATORS TELEMETRY</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Active Team Member Counter</h5>
                            <p className="text-xs text-muted-foreground">
                              Displays the exact number of active operators who currently hold this clearance tier. This ensures you know how many people are affected before considering any policy changes.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">3. BOUND CAPABILITIES CLOUD</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Granted Permission Badges</h5>
                            <p className="text-xs text-muted-foreground">
                              Every permission granted to this role is listed cleanly as an individual badge tag (e.g. <code>users.view</code>, <code>roles.edit</code>, <code>products.export</code>), making auditing fast and unmistakable.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">4. AUDIT TRAIL SHORTCUT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Direct Forensic Log Navigation</h5>
                            <p className="text-xs text-muted-foreground">
                              Click the <strong className="text-foreground">Audit Trail</strong> button in the bottom left to jump straight to <code className="text-primary font-mono">{origin}/dashboard/audit-logs</code> pre-filtered for events related to this role.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Inspection Guide */}
                        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-blue-500" />
                            How to Inspect a Role Profile (Step-by-Step)
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>In the Roles Directory table, find the role you want to inspect.</li>
                            <li>Click the blue <strong className="text-foreground">View (<Eye className="w-3 h-3 inline text-blue-400" />)</strong> icon in the Actions column.</li>
                            <li>The Clearance Profile modal opens. You can view all granted capabilities and see how many operators are using this role.</li>
                            <li>Click the <strong className="text-foreground">Audit Trail</strong> button if you want to inspect historical modification records.</li>
                            <li>Click <strong className="text-foreground">Close</strong> or press <code>Escape</code> when done.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 4: RECONFIGURE MATRIX (EDIT MODAL)                   */}
                  {/* ---------------------------------------------------------- */}
                  {rolesActiveTab === "edit" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-indigo-500 border-indigo-500/30">
                            FIGURE 3.2-D
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Clearance Reconfiguration Workflow (&ldquo;Modify Clearance Level&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-indigo-500 border-indigo-500/30">
                          ROLE RECONFIGURATION
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-roles-edit.png"
                            alt="Modify Clearance Level Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: &ldquo;Modify Clearance Level&rdquo; modal enabling role title renaming, live capability toggling, permission search, and non-disruptive synchronization across active sessions.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Pencil className="w-5 h-5 text-indigo-500" />
                          Clearance Reconfiguration Anatomy & Live Synchronization
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Modify existing clearance levels to grant new duties or remove obsolete permissions as organizational requirements evolve:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">1. ROLE RENAMING</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Update Designation Title</h5>
                            <p className="text-xs text-muted-foreground">
                              Update the role name easily whenever job duties change. The system safely preserves all existing user assignments and permission mappings under the new name.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">2. CAPABILITY TOGGLING</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Granular Access Adjustments</h5>
                            <p className="text-xs text-muted-foreground">
                              Turn individual capabilities on or off by clicking their checkboxes. Search filters help you pinpoint exact permissions quickly without scrolling through hundreds of entries.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">3. LIVE BROADCAST SYNC</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Instant Session Updates</h5>
                            <p className="text-xs text-muted-foreground">
                              When you save changes to a role, the system immediately pushes the updated capability set to all active sessions via WebSockets, so operators get their updated access instantly without logging out.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">4. INFORMATION GUIDANCE</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Helpful Popover Context</h5>
                            <p className="text-xs text-muted-foreground">
                              The <strong className="text-foreground">Information (<HelpCircle className="w-3 h-3 inline text-primary" />)</strong> icon in the header provides novice administrators with clear explanations of how capability changes affect team members.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Modification Guide */}
                        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-indigo-500" />
                            How to Reconfigure a Clearance Level (Step-by-Step)
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Locate the target role in the Roles Directory table.</li>
                            <li>Click the indigo <strong className="text-foreground">Edit (<Pencil className="w-3 h-3 inline text-indigo-400" />)</strong> icon in the Actions column.</li>
                            <li>Modify the role title if desired, or search for capabilities you wish to add or remove.</li>
                            <li>Check or uncheck permissions as needed.</li>
                            <li>Click the <strong className="text-foreground">Update Clearance Level</strong> button at the bottom right.</li>
                            <li>A success toast notification confirms the change, and the updated permissions are immediately active across the system.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 5: PURGE & SOFT-DELETE (DELETE MODAL)                */}
                  {/* ---------------------------------------------------------- */}
                  {rolesActiveTab === "delete" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-rose-500 border-rose-500/30">
                            FIGURE 3.2-E
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Safe Role Soft-Delete & Trash Bin Workflow (&ldquo;Purge Clearance Level&rdquo; Modal)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-rose-500 border-rose-500/30">
                          SOFT-DELETE SAFEGUARD
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-roles-delete.png"
                            alt="Purge Clearance Level Modal"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: &ldquo;Purge Clearance Level?&rdquo; confirmation modal displaying safety warning, session revocation alert, and 30-day Trash Bin retention guarantee.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-rose-500" />
                          Role Decommissioning Safeguards & Trash Recovery
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Deleting a role uses a safe two-step verification process and sends the role to the Global Trash Bin to protect against accidental deletion:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">1. ROOT IMMUTABILITY</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Protected System Roles</h5>
                            <p className="text-xs text-muted-foreground">
                              Essential core roles like <strong className="text-foreground">Super Admin</strong> and <strong className="text-foreground">Admin</strong> are hard-locked. The system disables delete actions on these roles to guarantee the cluster is never left without administrative access.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">2. SESSION REVOCATION ALERT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Operator Impact Warning</h5>
                            <p className="text-xs text-muted-foreground">
                              The confirmation modal clearly warns you if any operators are currently assigned to the role, helping you avoid accidentally removing permissions that an active team member needs.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">3. GLOBAL TRASH RETENTION</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">30-Day Safe Recovery</h5>
                            <p className="text-xs text-muted-foreground">
                              Purged roles are moved to the Global Trash Bin (<code className="text-primary font-mono">{origin}/dashboard/trash</code>) for 30 days. No records or permissions are permanently destroyed immediately.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">4. INSTANT RESTORATION</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">One-Click Undelete</h5>
                            <p className="text-xs text-muted-foreground">
                              If a role was deleted by mistake, simply click the <strong className="text-foreground">View Trash</strong> button in the toast notification (or visit the Trash page) and click <strong className="text-foreground">Restore</strong> to bring it back with all permissions intact.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Decommissioning Guide */}
                        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-rose-500" />
                            How to Safely Delete a Clearance Level (Step-by-Step)
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>In the Roles Directory table, find the custom role you want to remove.</li>
                            <li>Click the red <strong className="text-foreground">Delete (<Trash2 className="w-3 h-3 inline text-rose-400" />)</strong> icon in the Actions column.</li>
                            <li>Carefully review the confirmation modal confirming the role name and any active operator impact.</li>
                            <li>Click the red <strong className="text-foreground">Confirm Purge</strong> button.</li>
                            <li>A success toast notification appears: <code className="text-primary font-mono font-bold">Role moved to trash bin.</code></li>
                            <li>If this action was made in error, click the <strong className="text-foreground">View Trash</strong> button in the toast (or visit <code>/dashboard/trash</code>) and click <strong className="text-foreground">Restore</strong> to recover the role instantly.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* SUB-TAB 3: CAPABILITY DICTIONARY (PERMISSIONS)               */}
              {/* ============================================================ */}
              {securityActiveSubTab === "permissions" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Dictionary Sub-Lifecycle Tab Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-md shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                        Dictionary Stages:
                      </span>
                      <Button
                        size="sm"
                        variant={permissionsActiveTab === "main" ? "default" : "ghost"}
                        onClick={() => setPermissionsActiveTab("main")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        1. Dictionary Overview
                      </Button>
                      <Button
                        size="sm"
                        variant={permissionsActiveTab === "filters" ? "default" : "ghost"}
                        onClick={() => setPermissionsActiveTab("filters")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Filter className="w-3.5 h-3.5 text-cyan-400" />
                        2. Discovery & Search
                      </Button>
                      <Button
                        size="sm"
                        variant={permissionsActiveTab === "anatomy" ? "default" : "ghost"}
                        onClick={() => setPermissionsActiveTab("anatomy")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        3. Protocol Anatomy & Context
                      </Button>
                      <Button
                        size="sm"
                        variant={permissionsActiveTab === "export" ? "default" : "ghost"}
                        onClick={() => setPermissionsActiveTab("export")}
                        className="rounded-xl font-space font-bold text-xs gap-1.5 h-8"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        4. Compliance Export Suite
                      </Button>
                    </div>

                    <Badge variant="outline" className="font-mono text-[10px] text-cyan-400 border-cyan-400/30 hidden sm:flex">
                      TAB 3 • 4 OPERATIONAL STAGES
                    </Badge>
                  </div>

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 1: DICTIONARY OVERVIEW (MAIN PAGE)                   */}
                  {/* ---------------------------------------------------------- */}
                  {permissionsActiveTab === "main" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                            FIGURE 3.3-A
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Capability Dictionary & Granular Protocols Ledger
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-cyan-500 border-cyan-500/30">
                          1072 INDEXED PROTOCOLS
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-permissions-tab.png"
                            alt="Capability Dictionary Workbench"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Figure 3.3-A: Live production snapshot of the Capability Dictionary showing 1,072 indexed cryptographic protocols, real-time KPI metrics banner, multi-dimensional filter bar (Domains, Actions, Scopes), sequential counter (#), pinned capability codes, natural language context generator, and compliance export suite.
                        </p>
                      </div>

                      {/* Quick Action Interactive Cards */}
                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Key className="w-5 h-5 text-primary" />
                          Explore Capability Dictionary Operations
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Click any card below to open the dedicated visual guide for each operational capability:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <button
                            type="button"
                            onClick={() => setPermissionsActiveTab("filters")}
                            className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                <Filter className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Discovery & Search</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Filter 1,072 capabilities by module domain, action type, scope, or instant keyword search.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPermissionsActiveTab("anatomy")}
                            className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <Key className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-amber-500/50 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Protocol Context Engine</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Understand technical permission keys translated into clear, plain-English sentences.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPermissionsActiveTab("export")}
                            className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all duration-200 group cursor-pointer block"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <Download className="w-4 h-4" />
                              </div>
                              <ArrowRight className="w-4 h-4 text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground">Compliance Export Suite</h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Export structured JSON, CSV spreadsheets, official audit ledgers, or certified print reports.
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Live Telemetry Banner Breakdown */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Fingerprint className="w-5 h-5 text-primary" />
                          Live Capability Telemetry & Metrics Breakdown
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          The Capability Dictionary serves as the central security dictionary, cataloging every authorization key enforced across backend API endpoints and frontend controls:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Total Protocols</span>
                            <div className="text-2xl font-black font-space text-foreground">1072</div>
                            <p className="text-[11px] text-muted-foreground">Total hardcoded authorization tokens registered across all node microservices.</p>
                          </div>

                          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Central Scope</span>
                            <div className="text-2xl font-black font-space text-foreground">1072</div>
                            <p className="text-[11px] text-muted-foreground">Cryptographic capabilities managed directly at the central cluster gateway level.</p>
                          </div>

                          <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Tenant Scope</span>
                            <div className="text-2xl font-black font-space text-foreground">0</div>
                            <p className="text-[11px] text-muted-foreground">Tenant-isolated capability nodes enforced within isolated workspace boundaries.</p>
                          </div>

                          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Active Matches</span>
                            <div className="text-2xl font-black font-space text-foreground">1072</div>
                            <p className="text-[11px] text-muted-foreground">Dynamic real-time counter showing currently visible matches based on applied filters.</p>
                          </div>
                        </div>

                        {/* Core Ledger Capabilities */}
                        <div className="p-5 rounded-2xl border border-border/60 bg-card/40 space-y-4">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Key className="w-4 h-4 text-primary" />
                            Key Architecture of the Capability Ledger
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Sequential Counter (#):</strong>
                              <span>Strictly numbers from <code>1, 2, 3..</code> across pages, reflecting the exact order of active protocols without confusing database key gaps.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Pinned Capability Code:</strong>
                              <span>Remains pinned on the left side while scrolling horizontally, displaying the official protocol key and a quick one-click clipboard copy button.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Natural Language Context Generator:</strong>
                              <span>Translates raw technical codes into clear, plain English sentences so non-technical auditors immediately understand what each permission permits.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Security Scope Badge:</strong>
                              <span>Features glowing indicators like <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-[10px] font-mono">CENTRAL COMMAND</Badge> confirming the operational authority boundary.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Multi-Dimensional Filter Suite:</strong>
                              <span>Filter by functional domains, CRUD action types (View, Create, Update, Delete, Manage), and network scopes simultaneously.</span>
                            </div>
                            <div className="space-y-1">
                              <strong className="text-foreground block">• Enterprise Compliance Suite:</strong>
                              <span>Export the complete ledger in structured JSON, CSV spreadsheets, or print-ready audit reports with tamper-evident formatting.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 2: DISCOVERY & SEARCH (FILTERS WORKFLOW)             */}
                  {/* ---------------------------------------------------------- */}
                  {permissionsActiveTab === "filters" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-cyan-500 border-cyan-500/30">
                            FIGURE 3.3-B
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Capability Discovery, Keyword Search & Multi-Domain Filtering
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-cyan-500 border-cyan-500/30">
                          SEARCH & FILTERS
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-permissions-tab.png"
                            alt="Discovery and Filtering Controls"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: Multi-dimensional filter toolbar featuring Module Domain selector, Action Type dropdown, Scope filter, real-time debounced keyword search bar, and dynamic Active Matches counter.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Filter className="w-5 h-5 text-cyan-400" />
                          Filter Subsystem Anatomy & Discovery Tools
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          With 1,072 individual authorization protocols in the system, the filtering suite enables finding any permission in seconds:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">1. MODULE DOMAIN SELECTOR</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Filter by Functional Business Area</h5>
                            <p className="text-xs text-muted-foreground">
                              Select from core business domains (e.g. <strong className="text-foreground">Identity & Access</strong>, <strong className="text-foreground">Inventory & Warehouse</strong>, <strong className="text-foreground">HR & Attendance</strong>, <strong className="text-foreground">Logistics Fleet</strong>, <strong className="text-foreground">Finance</strong>) to view only capabilities belonging to that specific module.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">2. ACTION TYPE FILTER</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Filter by Operational Power</h5>
                            <p className="text-xs text-muted-foreground">
                              Isolate permissions by the action they grant: <strong className="text-foreground">View</strong> (read-only queries), <strong className="text-foreground">Create</strong> (adding new records), <strong className="text-foreground">Update</strong> (editing), <strong className="text-foreground">Delete</strong> (soft-delete & purge), or <strong className="text-foreground">Manage</strong> (full administrative authority).
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">3. SECURITY SCOPE FILTER</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Filter by Network Authority Boundary</h5>
                            <p className="text-xs text-muted-foreground">
                              Toggle between <strong className="text-foreground">Central Command</strong> (system-wide cluster operations) and <strong className="text-foreground">Tenant Scope</strong> (isolated tenant workspace actions).
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">4. INSTANT SEARCH BAR</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Real-Time Debounced Keyword Matching</h5>
                            <p className="text-xs text-muted-foreground">
                              Type any word (such as <code>inventory</code>, <code>leave</code>, <code>stock</code>, or <code>export</code>) to instantly filter the table. The server processes queries with zero lag and updates the <strong className="text-foreground">Active Matches</strong> counter in real time.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Filtering Guide */}
                        <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-cyan-400" />
                            How to Search & Filter System Capabilities (Step-by-Step)
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Open the <strong className="text-foreground">Capability Dictionary</strong> tab on the Security page.</li>
                            <li>To view a specific department, click the <strong className="text-foreground">All Module Domains</strong> dropdown and choose your domain (e.g. <code>Inventory</code>).</li>
                            <li>To view only delete permissions, click the <strong className="text-foreground">All Actions</strong> dropdown and select <code>Delete</code>.</li>
                            <li>Alternatively, click into the <strong className="text-foreground">Search capability codes...</strong> input box and type a keyword (e.g. <code>purchase</code>).</li>
                            <li>The table instantly filters to display matching protocols, and the <strong className="text-foreground">Active Matches</strong> card shows how many results were found.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 3: PROTOCOL ANATOMY & CONTEXT (UNDERSTANDING KEYS)   */}
                  {/* ---------------------------------------------------------- */}
                  {permissionsActiveTab === "anatomy" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-amber-500 border-amber-500/30">
                            FIGURE 3.3-C
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Protocol Anatomy & Natural Language Context Generator
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-amber-500 border-amber-500/30">
                          AUTHORIZATION KEYS
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-permissions-tab.png"
                            alt="Protocol Anatomy in Capability Table"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: Capability Dictionary rows displaying sequential number (#), technical protocol code, automatic plain-English human context explanation, and Central Command security scope badge.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Key className="w-5 h-5 text-amber-400" />
                          Protocol Anatomy & Human-Readable Translations
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Every row in the ledger provides clear context so non-technical operators and auditors can easily understand technical system permissions:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">1. PROTOCOL CODE</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Cryptographic System Token</h5>
                            <p className="text-xs text-muted-foreground">
                              The official programmatic token (e.g. <code>acknowledge_performance_reviews</code> or <code>adjust_inventory_stock</code>) enforced by backend API middleware and frontend UI gates. Hovering reveals a one-click clipboard copy button.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">2. HUMAN-READABLE CONTEXT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Automated Plain-English Translation</h5>
                            <p className="text-xs text-muted-foreground">
                              The system automatically transforms raw code tokens into plain sentences: <em className="text-foreground">&ldquo;Allows the operator to <strong>Adjust Inventory Stock</strong> within the active environment.&rdquo;</em> This eliminates ambiguity for audit reviews.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">3. SECURITY SCOPE</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Central vs Tenant Authority Badge</h5>
                            <p className="text-xs text-muted-foreground">
                              Clearly identifies whether the permission controls cluster-wide administrative functions (<Badge variant="outline" className="text-amber-500 border-amber-500/40 text-[10px] font-mono">CENTRAL COMMAND</Badge>) or is constrained to a specific workspace tenant.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">4. SEQUENTIAL ID (#)</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Stable Sequential Reference</h5>
                            <p className="text-xs text-muted-foreground">
                              Clean consecutive numbers (<code className="text-primary font-bold">1, 2, 3... 1072</code>) that scale smoothly across pages without exposing internal primary keys or database sequence gaps.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Guide */}
                        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-amber-400" />
                            How to Inspect & Copy Protocol Codes for Security Policies
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Find the target capability in the table (e.g. <code>action_inventory_documents</code>).</li>
                            <li>Read the <strong className="text-foreground">Human-Readable Context</strong> column to verify what action it authorizes.</li>
                            <li>Check the <strong className="text-foreground">Security Scope</strong> badge to ensure it applies to the correct environment.</li>
                            <li>Hover over the code name and click the <strong className="text-foreground">Copy (<Copy className="w-3 h-3 inline text-primary" />)</strong> icon to copy the exact code to your clipboard.</li>
                            <li>Use this copied key when setting up automated API access or reviewing role assignments in the Access Control Matrix.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------------- */}
                  {/* STAGE 4: COMPLIANCE EXPORT SUITE (AUDIT & EXPORT TOOLS)    */}
                  {/* ---------------------------------------------------------- */}
                  {permissionsActiveTab === "export" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      {/* View Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-card/40">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                            FIGURE 3.3-D
                          </Badge>
                          <span className="text-xs font-bold font-space text-foreground">
                            Cryptographic Compliance & Ledger Export Suite
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30">
                          AUDIT COMPLIANCE
                        </Badge>
                      </div>

                      {/* Screenshot Frame */}
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl bg-black/40 group relative">
                          <img
                            src="/manual-screenshots/03-permissions-tab.png"
                            alt="Compliance Export Controls"
                            className="w-full h-auto object-cover transition-transform duration-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">
                          Production snapshot: Action tools showing JSON export, CSV spreadsheet export, Download Ledger button, and Certified Print icon for compliance auditing.
                        </p>
                      </div>

                      {/* Detailed Anatomy */}
                      <div className="space-y-6 pt-4 border-t border-border/50">
                        <h3 className="text-xl font-bold font-space text-foreground flex items-center gap-2">
                          <Download className="w-5 h-5 text-emerald-500" />
                          Compliance Export Tools & Audit Reporting Suite
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Security compliance certifications require regular evidence of access permissions. The Export Suite provides 4 instant options:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">1. ONE-CLICK JSON EXPORT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Structured JSON for Automation & SIEM</h5>
                            <p className="text-xs text-muted-foreground">
                              Click the <strong className="text-foreground">JSON</strong> button to instantly copy the complete protocol dictionary in structured JSON format. Perfect for importing into SIEM security analyzers, automated vulnerability scanners, or custom compliance tooling.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">2. ONE-CLICK CSV EXPORT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Spreadsheet Table for Excel & Sheets</h5>
                            <p className="text-xs text-muted-foreground">
                              Click the <strong className="text-foreground">CSV</strong> button to copy all currently filtered capability rows directly to clipboard. You can paste them straight into Microsoft Excel or Google Sheets for internal audits and quarterly compliance reporting.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">3. DOWNLOAD AUDIT LEDGER</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">File Download (<Download className="w-3 h-3 inline text-primary" />)</h5>
                            <p className="text-xs text-muted-foreground">
                              Click the <strong className="text-foreground">Download</strong> icon above the table to save an official, timestamped export file to your device. The file includes cryptographic hashes confirming the ledger has not been altered.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-card/30 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">4. CERTIFIED PRINT</Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground">Print-Ready Roster (<Printer className="w-3 h-3 inline text-primary" />)</h5>
                            <p className="text-xs text-muted-foreground">
                              Click the <strong className="text-foreground">Printer</strong> icon to launch the browser print dialogue with clean, high-contrast black-and-white formatting designed for physical compliance audit binders.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step Novice Export Guide */}
                        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Compass className="w-4 h-4 text-emerald-500" />
                            How to Export Capability Data for Compliance Audits (Step-by-Step)
                          </h4>
                          <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                            <li>Apply any filters if you only need a specific domain, or keep all filters set to &ldquo;All&rdquo; to export all 1,072 protocols.</li>
                            <li>To paste into an Excel spreadsheet, click the <strong className="text-foreground">CSV</strong> button in the filter bar. Open Excel and press <code>Ctrl+V</code>.</li>
                            <li>To export for IT security software, click the <strong className="text-foreground">JSON</strong> button.</li>
                            <li>To download a file to your computer, click the <strong className="text-foreground">Download (<Download className="w-3 h-3 inline text-primary" />)</strong> icon located above the table.</li>
                            <li>To print an official paper report, click the <strong className="text-foreground">Print (<Printer className="w-3 h-3 inline text-primary" />)</strong> icon.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/50 flex items-center justify-end">
                <Link href="/dashboard/security">
                  <Button className="rounded-full gap-2 font-space font-bold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Open Live Security Matrix
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Upcoming Chapter Placeholder */
            <div className="py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <Layers className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold font-space text-foreground">
                Chapter Under Active Construction
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                This chapter is part of the ongoing user manual suite. Select Chapter 00 or Chapter 01 to view completed operational guides.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
