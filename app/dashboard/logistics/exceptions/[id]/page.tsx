import LogisticsExceptionDetailPage from "@/modules/logistics/LogisticsExceptionDetailPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsExceptionDetailPage exceptionId={id} />; }
