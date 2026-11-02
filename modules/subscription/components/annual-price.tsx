import { formatMoney, roundMoney } from "@/lib/money";

/** Display estimate; checkout quotes remain authoritative. */
export function AnnualPrice({ monthlyPrice, discountPercent }: {
  monthlyPrice: number;
  discountPercent?: number;
}) {
  if (discountPercent === undefined || !Number.isFinite(monthlyPrice) || monthlyPrice < 0) return null;
  const discount = Number.isFinite(Number(discountPercent))
    ? Math.min(100, Math.max(0, Number(discountPercent))) : 0;
  const annual = roundMoney(monthlyPrice * 12 * (1 - discount / 100));
  return (
    <span className="mt-2 block text-xs font-semibold text-slate-800 dark:text-slate-200">
      {formatMoney(annual, { decimals: annual % 1 === 0 ? 0 : 2 })}/year
      {monthlyPrice > 0 && discount > 0 ? " (save " + discount + "%)" : ""}
    </span>
  );
}
