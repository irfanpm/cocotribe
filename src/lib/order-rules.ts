/** Order rules shared by the admin API and the admin screen. No server-only imports. */
export const orderTransitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const paymentTransitions: Record<string, string[]> = {
  PENDING: ["PAID"],
  PAID: ["REFUND_REQUIRED", "REFUNDED"],
  REFUND_REQUIRED: ["REFUNDED"],
  REFUNDED: [],
};
// Online money movements are recorded by Razorpay. Staff may only flag and close refunds.
const onlinePaymentTransitions: Record<string, string[]> = {
  PENDING: [],
  PAID: ["REFUND_REQUIRED"],
  REFUND_REQUIRED: ["REFUNDED"],
  REFUNDED: [],
};
export function nextOrderStatuses(status: string) {
  return [status, ...(orderTransitions[status] || [])];
}
export function nextPaymentStatuses(method: string, paymentStatus: string) {
  const map = method === "RAZORPAY" ? onlinePaymentTransitions : paymentTransitions;
  return [paymentStatus, ...(map[paymentStatus] || [])];
}
type Current = { status: string; paymentStatus: string; method: string };
type Change = { status: string; paymentStatus: string };
/** Returns an error code when the change is not allowed, otherwise null. */
export function orderChangeError(order: Current, change: Change): string | null {
  const statusChanged = change.status !== order.status;
  const paymentChanged = change.paymentStatus !== order.paymentStatus;
  if (statusChanged && !orderTransitions[order.status]?.includes(change.status))
    return "INVALID_STATUS";
  if (paymentChanged && !nextPaymentStatuses(order.method, order.paymentStatus).includes(change.paymentStatus))
    return order.method === "RAZORPAY" ? "PAYMENT_MANAGED_BY_GATEWAY" : "INVALID_STATUS";
  if (paymentChanged && change.paymentStatus === "PAID" && change.status === "CANCELLED")
    return "INVALID_STATUS";
  if (statusChanged && change.status === "COMPLETED" && change.paymentStatus !== "PAID")
    return "PAYMENT_PENDING";
  if (
    statusChanged &&
    order.method === "RAZORPAY" &&
    change.status !== "CANCELLED" &&
    change.paymentStatus !== "PAID"
  )
    return "PAYMENT_PENDING";
  return null;
}
