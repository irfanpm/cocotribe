import { db } from "../src/lib/db";
import { razorpay, type GatewayPayment } from "../src/lib/razorpay";
import { cancelOrder, markCaptured } from "../src/lib/orders";
async function main() {
  const expired = await db.order.findMany({
    where: {
      method: "RAZORPAY",
      paymentStatus: "PENDING",
      status: "PENDING",
      reservedUntil: { lt: new Date() },
    },
    take: 100,
  });
  for (const order of expired) {
    if (order.razorpayOrderId) {
      const result = await razorpay<{ items: GatewayPayment[] }>(
        `orders/${order.razorpayOrderId}/payments`,
      );
      const payment = result.items.find((p) => p.status === "captured");
      if (payment) {
        await markCaptured(
          payment.order_id,
          payment.id,
          payment.amount,
          payment.currency,
        );
        continue;
      }
      if (result.items.some((p) => p.status === "authorized")) continue;
    }
    await cancelOrder(order.id);
  }
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  console.log(`Checked ${expired.length} expired reservations.`);
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
