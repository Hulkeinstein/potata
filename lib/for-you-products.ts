import { getCachedProductRows, getHotProductIds, toAppProduct } from "@/lib/products";
import type { Product } from "@/types";

export async function getForYouProducts(): Promise<Product[]> {
  const [rows, hotIds] = await Promise.all([getCachedProductRows(), getHotProductIds()]);
  const hotSet = new Set(hotIds);
  // 공유 캐시 순서는 유지하고 DTO에서 제거되는 createdAt으로 먼저 정렬한다.
  return [...rows].sort((left, right) => {
    const chronology = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (chronology !== 0) return chronology;
    return left.id === right.id ? 0 : left.id < right.id ? 1 : -1;
  }).map((row) => toAppProduct(row, hotSet));
}
