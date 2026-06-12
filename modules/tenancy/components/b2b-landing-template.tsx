"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Building2, Package, ShieldCheck, Truck, Globe, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/store/use-translation';
import { motion } from 'framer-motion';

export default function B2BLandingTemplate() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-background pt-24 pb-32">
                <div className="container mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl mx-auto space-y-6"
                    >
                        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-foreground">
                            Global B2B Sourcing, <br />
                            <span className="text-primary">Simplified.</span>
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Connect with verified wholesale suppliers, post RFQs, and secure your supply chain with our end-to-end Escrow and Logistics platform.
                        </p>
                        
                        {/* Search Bar */}
                        <div className="mt-8 flex max-w-2xl mx-auto items-center p-2 bg-card rounded-2xl shadow-xl border border-border/50">
                            <Search className="h-5 w-5 ml-3 text-muted-foreground" />
                            <Input 
                                type="text" 
                                placeholder="What are you looking to source?" 
                                className="flex-1 border-0 focus-visible:ring-0 bg-transparent text-base"
                            />
                            <Button size="lg" className="rounded-xl px-8 font-bold">Search</Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 bg-card/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold">How the Marketplace Works</h2>
                        <p className="text-muted-foreground mt-4">A streamlined procurement process</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: '1', title: 'Post Inquiry', desc: 'Use smart templates to describe your needs.' },
                            { step: '2', title: 'Receive Quotes', desc: 'Verified sellers submit competitive bids.' },
                            { step: '3', title: 'Compare & Chat', desc: 'Negotiate via secure chat and compare terms.' },
                            { step: '4', title: 'Secure Payment', desc: 'Pay via Escrow. Funds release on delivery.' }
                        ].map((s) => (
                            <div key={s.step} className="bg-background p-6 rounded-2xl border border-border/50 text-center space-y-4 shadow-sm hover:shadow-md transition-all">
                                <div className="h-12 w-12 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center font-black text-xl">
                                    {s.step}
                                </div>
                                <h3 className="font-bold text-lg">{s.title}</h3>
                                <p className="text-sm text-muted-foreground">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Top Categories */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-12 text-center">Top Sourcing Categories</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Electronics', 'Apparel & Textiles', 'Machinery', 'Home & Garden', 'Beauty & Personal Care', 'Packaging', 'Vehicles & Parts', 'Construction Materials'].map((cat) => (
                            <div key={cat} className="group cursor-pointer bg-card p-6 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center text-center space-y-3">
                                <Package className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="font-semibold text-sm">{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Elements */}
            <section className="py-24 bg-primary text-primary-foreground">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="space-y-4 flex flex-col items-center">
                            <ShieldCheck className="h-12 w-12 text-primary-foreground/80" />
                            <h3 className="text-2xl font-bold">Trade Assurance</h3>
                            <p className="text-primary-foreground/70">Your payments are held securely in Escrow until the goods are delivered and inspected.</p>
                        </div>
                        <div className="space-y-4 flex flex-col items-center">
                            <Building2 className="h-12 w-12 text-primary-foreground/80" />
                            <h3 className="text-2xl font-bold">Verified Suppliers</h3>
                            <p className="text-primary-foreground/70">Strict KYB verification ensures you only deal with legitimate businesses.</p>
                        </div>
                        <div className="space-y-4 flex flex-col items-center">
                            <Truck className="h-12 w-12 text-primary-foreground/80" />
                            <h3 className="text-2xl font-bold">Integrated Logistics</h3>
                            <p className="text-primary-foreground/70">Real-time freight tracking and shipping estimates directly within the platform.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-card text-center">
                <div className="container mx-auto px-4 max-w-2xl space-y-8">
                    <h2 className="text-4xl font-bold">Ready to scale your business?</h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="rounded-xl px-8">Join as Buyer <ChevronRight className="ml-2 h-4 w-4" /></Button>
                        <Button size="lg" variant="outline" className="rounded-xl px-8">Become a Seller</Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
