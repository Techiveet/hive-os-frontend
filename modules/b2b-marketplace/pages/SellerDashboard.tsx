import React from 'react';
import { QuoteSubmission } from '../components/QuoteSubmission';
import { Store, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const SellerDashboard: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <Store className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Seller Dashboard</h1>
                        <p className="text-muted-foreground">Discover wholesale leads and submit winning quotes.</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Leads Today</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">+2 from yesterday</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">5</div>
                        <p className="text-xs text-muted-foreground">2 awaiting response</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">68%</div>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold">Open Marketplace Inquiries</h2>
                    
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary">Electronics</Badge>
                                        <span className="text-sm text-muted-foreground">Posted 2 hours ago</span>
                                    </div>
                                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">100x Dell Latitude Laptops</h3>
                                    <p className="text-muted-foreground text-sm mt-2">Looking for a verified supplier who can provide 100 units of Dell Latitude 5000 series. Need delivery within 30 days.</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">Budget: Open</div>
                                    <Button className="mt-4" size="sm">Draft Quote</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-4">Draft Response</h2>
                    <QuoteSubmission />
                </div>
            </div>
        </div>
    );
};
export default SellerDashboard;
