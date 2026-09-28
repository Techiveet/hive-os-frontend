import LogisticsWarehouseHandoffDetailPage from "@/modules/logistics/LogisticsWarehouseHandoffDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsWarehouseHandoffDetailPage handoffId={id} />; }
