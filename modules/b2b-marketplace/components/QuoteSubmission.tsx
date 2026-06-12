"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function QuoteSubmission() {
    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Submit a Quote</CardTitle>
                <CardDescription>Your quote is private and only visible to the buyer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Unit Price (USD)</Label>
                        <Input type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                        <Label>Quote Expiry Date</Label>
                        <Input type="date" />
                    </div>
                </div>

                <div className="space-y-2 p-4 bg-muted/20 border rounded-xl">
                    <Label>Logistics Integration</Label>
                    <p className="text-xs text-muted-foreground mb-2">Provide an estimated shipping cost via our API partners.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Select>
                            <SelectTrigger><SelectValue placeholder="Shipping Carrier" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dhl">DHL Express</SelectItem>
                                <SelectItem value="fedex">FedEx Freight</SelectItem>
                                <SelectItem value="local">Local Freight Company</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Estimated Shipping Cost" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Lead Time / Delivery Schedule</Label>
                    <Input placeholder="e.g. 14 Days after payment" />
                </div>
                <div className="space-y-2">
                    <Label>Terms & Notes</Label>
                    <Textarea placeholder="Any specific terms regarding warranty, payment schedules..." rows={3} />
                </div>
                <Button className="w-full">Submit Private Quote</Button>
            </CardContent>
        </Card>
    );
}
