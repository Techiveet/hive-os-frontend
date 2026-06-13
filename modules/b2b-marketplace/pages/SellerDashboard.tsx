"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import QuoteSubmission from '../components/QuoteSubmission';
import { Crown, Star, Clock, MessageSquare, BellRing, PackageCheck } from 'lucide-react';

export default function SellerDashboard() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">8</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2"><Crown className="h-4 w-4"/> Plan: Freemium</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-amber-600">3 Quotes Left</div>
                        <Button variant="link" className="text-amber-600 h-auto p-0 text-xs">Upgrade to Premium</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_300px]">
                <Tabs defaultValue="inquiries" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="inquiries">Marketplace Feed</TabsTrigger>
                        <TabsTrigger value="quotes">My Quotes</TabsTrigger>
                        <TabsTrigger value="saved">Saved Searches & Alerts</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="inquiries" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Marketplace Feed</CardTitle>
                                <CardDescription>Inquiries matching your category: Electronics</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg bg-card hover:shadow-sm transition-all gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-lg">Looking for 500x Laptops (Core i7)</h4>
                                                <Badge variant="secondary">IT Hardware</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Required Delivery: Next Month • Location: New York, USA</p>
                                        </div>
                                        <Button>Submit Quote</Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <QuoteSubmission />
                    </TabsContent>

                    <TabsContent value="saved">
                        <Card>
                            <CardHeader>
                                <CardTitle>Saved Searches & Alerts</CardTitle>
                                <CardDescription>Manage your automated notifications for new leads.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border rounded-xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold">Search: "Smartphones" in Europe</h4>
                                        <p className="text-sm text-muted-foreground">Quantity &gt; 1000 units</p>
                                    </div>
                                    <Button variant="secondary" size="sm"><BellRing className="h-4 w-4 mr-2"/> Active</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Reputation Engine Widget */}
                <Card>
                    <CardHeader>
                        <CardTitle>Reputation Score</CardTitle>
                        <CardDescription>Your performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                            <div className="text-4xl font-black text-primary">4.8</div>
                            <div className="flex justify-center text-amber-400 mt-1">
                                <Star className="h-4 w-4 fill-current"/><Star className="h-4 w-4 fill-current"/><Star className="h-4 w-4 fill-current"/><Star className="h-4 w-4 fill-current"/><Star className="h-4 w-4"/>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Based on 124 reviews</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500"/> On-time Delivery</span>
                                <span className="font-bold">98%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-500"/> Responsiveness</span>
                                <span className="font-bold">&lt; 2 hours</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-purple-500"/> Product Quality</span>
                                <span className="font-bold">4.9 / 5</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
