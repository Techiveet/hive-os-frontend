import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const QuoteSubmission: React.FC = () => {
    return (
        <Card className="w-full border-primary/20">
            <CardHeader>
                <CardTitle>Submit Quote</CardTitle>
                <CardDescription>Offer your pricing and terms for this inquiry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Total Amount (ETB)</Label>
                        <Input id="amount" type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="delivery">Estimated Delivery (Days)</Label>
                        <Input id="delivery" type="number" placeholder="e.g. 14" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="proposal">Proposal Details</Label>
                    <Textarea id="proposal" placeholder="Explain why your offer is the best..." className="min-h-[100px]"/>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button variant="default">Send Quote</Button>
            </CardFooter>
        </Card>
    );
};
