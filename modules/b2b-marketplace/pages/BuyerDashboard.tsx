"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import InquiryBuilder from '../components/InquiryBuilder';
import QuoteComparisonTool from '../components/QuoteComparisonTool';
import { AlertCircle, UploadCloud, ShieldAlert, PackageCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BuyerDashboard() {
    return (
        <div className="space-y-6">
            <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>KYC Verification Pending</AlertTitle>
                <AlertDescription>
                    Please complete your business verification to unlock Escrow payments and premium supplier quotes.
                </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quotes Received</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders in Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1</div>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Free Inquiries Left</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">0</div>
                        <p className="text-xs text-muted-foreground mt-1 cursor-pointer hover:underline">Upgrade to Premium</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="inquiries" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inquiries">My Inquiries</TabsTrigger>
                    <TabsTrigger value="compare">Compare Quotes</TabsTrigger>
                    <TabsTrigger value="milestones">Milestones & Tracking</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Upload (CSV)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inquiries" className="space-y-4">
                    <InquiryBuilder />
                </TabsContent>
                
                <TabsContent value="compare">
                    <QuoteComparisonTool />
                </TabsContent>

                <TabsContent value="milestones">
                    <Card>
                        <CardHeader>
                            <CardTitle>Milestones & Payment Tracking</CardTitle>
                            <CardDescription>Monitor your escrow payments and shipment logistics.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-xl p-4 space-y-4 bg-muted/20">
                                <div className="flex justify-between items-center pb-4 border-b">
                                    <div>
                                        <h4 className="font-bold">Order #ORD-8821</h4>
                                        <p className="text-sm text-muted-foreground">Supplier: Global Electronics Co.</p>
                                    </div>
                                    <Badge variant="default" className="bg-emerald-500">In Transit</Badge>
                                </div>
                                
                                <div className="space-y-6 py-4">
                                    {/* Timeline */}
                                    <div className="flex items-center text-sm">
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground z-10"><PackageCheck className="h-4 w-4"/></div>
                                        <div className="h-1 flex-1 bg-primary mx-2"></div>
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground z-10"><AlertCircle className="h-4 w-4"/></div>
                                        <div className="h-1 flex-1 bg-muted mx-2"></div>
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground z-10">3</div>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Payment Escrowed</span>
                                        <span>Shipped (FedEx 1192838)</span>
                                        <span>Delivered & Inspected</span>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-2">
                                    <Button variant="outline" size="sm">View Tracking</Button>
                                    <Button size="sm">Release Escrow</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bulk">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bulk Upload via CSV</CardTitle>
                            <CardDescription>Upload your ERP export to generate hundreds of inquiries instantly.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed rounded-xl p-12 text-center space-y-4 hover:bg-muted/30 transition-colors cursor-pointer">
                                <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                    <UploadCloud className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold">Drag & Drop your CSV file</h3>
                                <p className="text-sm text-muted-foreground">Supported format: .csv or .xlsx up to 50MB</p>
                                <Button variant="outline" className="mt-4">Browse Files</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
