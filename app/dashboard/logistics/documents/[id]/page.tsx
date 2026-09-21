import LogisticsDocumentDetailPage from "@/modules/logistics/LogisticsDocumentDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LogisticsDocumentDetailPage documentId={id} />; }
