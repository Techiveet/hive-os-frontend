"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Phone, ShieldCheck, Send } from 'lucide-react';

export default function SecureChat() {
    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b bg-muted/10 py-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-base flex items-center gap-2">
                        Global Electronics Co. 
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Regarding Inquiry: 500x Laptops</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8"><Phone className="h-4 w-4"/></Button>
                    <Button variant="default" size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700"><Video className="h-4 w-4"/></Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {/* Chat Messages */}
                <div className="bg-primary/10 text-foreground p-3 rounded-2xl rounded-tl-sm max-w-[80%] text-sm">
                    Hello! We can fulfill this order. Please review the attached quote.
                </div>
                <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm ml-auto">
                    Thanks. Does the warranty cover international shipping?
                </div>
            </CardContent>
            <div className="p-3 border-t bg-background flex items-center gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="icon"><Send className="h-4 w-4" /></Button>
            </div>
        </Card>
    );
}
