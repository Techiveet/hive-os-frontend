import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BuyerDashboard from '@/modules/b2b-marketplace/pages/BuyerDashboard';
import SellerDashboard from '@/modules/b2b-marketplace/pages/SellerDashboard';

export default function B2BMarketplacePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">B2B Marketplace</h2>
            </div>
            <Tabs defaultValue="buyer" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="buyer">Buyer Portal</TabsTrigger>
                    <TabsTrigger value="seller">Seller Portal</TabsTrigger>
                </TabsList>
                <TabsContent value="buyer" className="space-y-4">
                    <BuyerDashboard />
                </TabsContent>
                <TabsContent value="seller" className="space-y-4">
                    <SellerDashboard />
                </TabsContent>
            </Tabs>
        </div>
    );
}
