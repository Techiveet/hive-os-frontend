import LogisticsJobDetailPage from "@/modules/logistics/LogisticsJobDetailPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsJobDetailPage jobId={id} />; }
