import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import type { OrderItemSnapshot, OrderStatus } from "@/types";
import { CommerceText, OrderDate, OrderStatusText } from '@/components/cart/CommerceText';

// status 뱃지 스타일 매핑
const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  PAID: "bg-green-500/10 text-green-400 border border-green-500/30",
  CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/30",
};

export default async function OrdersPage() {
  // 미인증 방어 (middleware가 이미 보호하나 서버 컴포넌트에서도 방어적으로 처리)
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mypage/orders");
  }

  // 본인 주문만 조회 (IDOR 방지 — userId 필터 필수)
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-black pt-20 pb-24 text-white">
      <div className="max-w-2xl mx-auto px-6">

        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/mypage"
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            ← <CommerceText name="mypage" />
          </Link>
          <h1 className="text-2xl font-bold font-outfit mt-3"><CommerceText name="history" /></h1>
          <p className="text-zinc-400 text-sm mt-1"><CommerceText name="historyHint" /></p>
        </div>

        {/* 빈 상태 */}
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
            <div className="text-5xl">🛍️</div>
            <div>
              <p className="text-zinc-300 text-lg font-medium mb-1"><CommerceText name="noOrders" /></p>
              <p className="text-zinc-500 text-sm"><CommerceText name="emptyHint" /></p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-brand-neon text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <CommerceText name="start" />
            </Link>
          </div>
        )}

        {/* 주문 목록 */}
        <div className="space-y-4">
          {orders.map((order) => {
            // Prisma Json 필드 캐스팅 (any 회피)
            const items = order.items as unknown as OrderItemSnapshot[];
            const status = order.status as OrderStatus;

            return (
              <div
                key={order.id}
                className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-4"
              >
                {/* 주문 헤더 */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1"><OrderDate date={order.createdAt.toISOString()} /></p>
                    <p className="text-xs font-mono text-zinc-400 break-all">
                      <CommerceText name="number" />: {order.id}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[status]}`}
                  >
                    <OrderStatusText status={status} />
                  </span>
                </div>

                {/* 상품 목록 (주문 시점 스냅샷 가격 사용) */}
                <div className="divide-y divide-white/5">
                  {items.map((item, idx) => (
                    <div key={idx} className="py-3 flex gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 mb-0.5">{item.brand}</p>
                        <p className="text-sm font-medium text-white truncate">{item.name}</p>
                        <div className="flex gap-2 text-xs text-zinc-400 mt-1">
                          {item.size && <span><CommerceText name="size" />: {item.size}</span>}
                          {item.color && <span><CommerceText name="color" />: {item.color}</span>}
                          <span>x{item.quantity}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-white">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatPrice(item.price)} / <CommerceText name="unit" />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 결제 요약 */}
                <div className="pt-2 border-t border-white/5 space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span><CommerceText name="subtotal" /></span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span><CommerceText name="shipping" /></span>
                    <span>{order.shipping === 0 ? <CommerceText name="free" /> : formatPrice(order.shipping)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-white pt-1">
                    <span><CommerceText name="total" /></span>
                    <span className="text-brand-neon">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
