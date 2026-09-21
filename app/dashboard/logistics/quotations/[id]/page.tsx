import LogisticsQuotationDetailPage from "@/modules/logistics/LogisticsQuotationDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsQuotationDetailPage quotationId={id} />; }
