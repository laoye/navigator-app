/**
 * 订单状态的语义集合。
 *
 * ForBox 流程的终态是 `delivered`（已签收）。`completed` 是 fleetbase 其他流程
 * （transport / storefront）的终态，历史订单也可能停在那里，一并当作已关闭处理。
 * 与后端 `Fleetbase\Forbox\Support\DriverAssignment::CLOSED` 和 ops-portal 的
 * CLOSED_STATUSES 保持同一份口径——这三处任何一处漏掉某个终态，都会让已结束的订单
 * 继续出现在司机的当前任务里。
 */

/** 已结束、不再流转的订单状态。 */
export const CLOSED_ORDER_STATUSES = ['delivered', 'completed', 'canceled', 'cancelled', 'order_canceled'];

/** 尚未进入流转的订单状态。 */
export const PRE_ACTIVE_ORDER_STATUSES = ['created', 'order_created'];

export function isClosedOrderStatus(status?: string | null): boolean {
    return typeof status === 'string' && CLOSED_ORDER_STATUSES.includes(status);
}

/** 不该出现在司机当前任务列表里的订单：已结束，或还没开始流转。 */
export function isInactiveOrderStatus(status?: string | null): boolean {
    return isClosedOrderStatus(status) || (typeof status === 'string' && PRE_ACTIVE_ORDER_STATUSES.includes(status));
}
