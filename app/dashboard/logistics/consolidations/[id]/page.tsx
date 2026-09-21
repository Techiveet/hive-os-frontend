import LogisticsConsolidationDetailPage from "@/modules/logistics/LogisticsConsolidationDetailPage";

export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <LogisticsConsolidationDetailPage consolidationId={id}/>;}
