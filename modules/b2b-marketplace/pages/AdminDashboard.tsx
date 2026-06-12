"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Users, Activity, Scale } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">B2B Admin Console</h2>
                <p className="text-muted-foreground">Manage users, moderate content, and resolve disputes.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending KYB Reviews</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">12</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
                        <Scale className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">3</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="disputes" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="disputes">Dispute Resolution</TabsTrigger>
                    <TabsTrigger value="verification">KYB Verification</TabsTrigger>
                    <TabsTrigger value="categories">Category Management</TabsTrigger>
                </TabsList>
                
                <TabsContent value="disputes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dispute Resolution Module</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-4 border rounded-xl bg-destructive/5 border-destructive/20">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive">Escalated</Badge>
                                        <h4 className="font-bold">Order #ORD-9912 - Late Delivery</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">Buyer: TechCorp Ltd • Seller: Global Logistics</p>
                                    <p className="text-sm font-medium mt-2">Escrow Amount: $45,000</p>
                                </div>
                                <div className="space-x-2">
                                    <Button variant="outline">View Chat Logs</Button>
                                    <Button variant="default">Mediate</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
