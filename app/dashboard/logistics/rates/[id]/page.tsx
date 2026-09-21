import LogisticsRateSheetDetailPage from "@/modules/logistics/LogisticsRateSheetDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsRateSheetDetailPage rateSheetId={id} />; }
