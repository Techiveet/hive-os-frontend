import React from 'react';
import { InquiryBuilder } from '../components/InquiryBuilder';
import { QuoteComparisonTool } from '../components/QuoteComparisonTool';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store } from 'lucide-react';

export const BuyerDashboard: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Store className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
                    <p className="text-muted-foreground">Manage your wholesale sourcing and compare quotes.</p>
                </div>
            </div>

            <Tabs defaultValue="new-inquiry" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="new-inquiry">New Inquiry</TabsTrigger>
                    <TabsTrigger value="active-inquiries">Active Inquiries</TabsTrigger>
                </TabsList>
                <TabsContent value="new-inquiry" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <InquiryBuilder />
                        <div className="hidden lg:flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/20 text-muted-foreground p-12 text-center">
                            Fill out the details on the left to broadcast a new RFQ (Request For Quotation) to the B2B network.
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="active-inquiries" className="mt-6">
                    <QuoteComparisonTool />
                </TabsContent>
            </Tabs>
        </div>
    );
};
export default BuyerDashboard;
