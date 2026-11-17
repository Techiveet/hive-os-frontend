"use client";

import React from "react";
import AdminDisputes from "@/modules/b2b-marketplace/pages/AdminDisputes";


export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">B2B Admin Console</h2>
        <p className="text-muted-foreground">Resolve disputes between buyers and suppliers.</p>
      </div>
      <AdminDisputes />
    </div>
  );
}
