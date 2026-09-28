import InventoryGoodDetailPage from "@/modules/inventory/pages/goods-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goodId = Number(id);

  if (!Number.isFinite(goodId) || goodId <= 0) {
    return null;
  }

  return <InventoryGoodDetailPage goodId={goodId} />;
}
