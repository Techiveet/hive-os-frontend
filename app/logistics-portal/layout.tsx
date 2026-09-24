import AuthGuard from "@/components/auth/auth-guard";
export default function LogisticsPortalLayout({ children }: { children: React.ReactNode }) { return <AuthGuard>{children}</AuthGuard>; }
