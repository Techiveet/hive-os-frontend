"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Home, HelpCircle } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

export function SecurityHeader({ tenantName }: { tenantName: string }) {
    const { t } = useTranslation();

    const triggerTour = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("start-security-tour"));
        }
    };

    return (
        <>
            <div className="flex w-full items-center justify-end gap-3 mb-4">
                <Button
                    id="tour-security-header-tour-trigger"
                    variant="outline"
                    size="sm"
                    onClick={triggerTour}
                    className="h-8 rounded-lg border-border/50 bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md hover:text-foreground"
                >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {t('global.page_tour', 'Page Tour')}
                </Button>

                <Breadcrumbs 
                    items={[
                        { label: "Hive.OS", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
                        { label: t('nav.security', 'Identity & Access') } 
                    ]} 
                />
            </div>

            <div className="mb-6 space-y-1">
                <h1 className="text-3xl font-space font-black tracking-tight text-foreground uppercase">
                    {t('security.identity', 'Identity')} & <span className="text-primary">{t('security.access', 'Access')}</span>
                </h1>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                        {t('security.node_clearance', 'Node Clearance')}: {tenantName}
                    </p>
                </div>
            </div>
        </>
    );
}