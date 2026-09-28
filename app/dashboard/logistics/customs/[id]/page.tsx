import LogisticsCustomsDetailPage from "@/modules/logistics/LogisticsCustomsDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsCustomsDetailPage customsCaseId={id} />; }
