import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const InquiryBuilder: React.FC = () => {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Create New B2B Inquiry</CardTitle>
                <CardDescription>Specify your wholesale needs to broadcast to verified sellers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Inquiry Title</Label>
                    <Input id="title" placeholder="e.g. 500 units of Office Chairs" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="desc">Detailed Requirements</Label>
                    <Textarea id="desc" placeholder="Provide material specifications, dimensions, etc." className="min-h-[120px]"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="budget">Target Budget (ETB)</Label>
                        <Input id="budget" type="number" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deadline">Submission Deadline</Label>
                        <Input id="deadline" type="date" />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button>Publish Inquiry</Button>
            </CardFooter>
        </Card>
    );
};
