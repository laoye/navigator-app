/**
 * 订单派生数据的公共计算。
 *
 * 这些逻辑原先散落在 DriverOrderManagementScreen / PastOrderCard /
 * AdhocOrderCard / LiveOrderRoute / OrderScreen 里各写一份，站点序列一旦
 * 改动（例如三段路线把 pickup/dropoff 和 waypoints 同时用上）就容易只改到
 * 其中几处。集中到这里，屏幕只负责渲染。
 */

/** 语义化的活跃订单状态，供"当前任务"挑选时排序。 */
const IN_PROGRESS_STATUS = 'started';
const DISPATCHED_STATUS = 'dispatched';

/** 需要司机自己去取件的订单状态（商家自送的单不需要）。 */
const PICKUP_PENDING_STATUSES = new Set([DISPATCHED_STATUS, IN_PROGRESS_STATUS]);

/**
 * 订单在路线上的完整站点序列：起点 → 中间站 → 终点。
 *
 * 上游把 pickup/dropoff 和 waypoints 当互斥处理，ForBox 的
 * 「商家 → 中转仓 → 客户」三段单两者都有，只取 waypoints 会漏掉首尾。
 * pickup/dropoff 也可能为空（商家自送单没有取件点），必须过滤掉空值。
 */
export function getOrderStops(order: any): any[] {
    const payload = order?.getAttribute?.('payload') ?? {};
    const { pickup, dropoff, waypoints } = payload;

    return [pickup, ...(waypoints ?? []), dropoff].filter(Boolean);
}

/**
 * 司机当前该去的那一站。按 payload.current_waypoint 在完整站点序列上定位，
 * 定位不到时退回路线第一站；订单没有任何站点时返回 null。
 */
export function getOrderDestination(order: any): any | null {
    const stops = getOrderStops(order);
    const currentWaypoint = order?.getAttribute?.('payload.current_waypoint');

    return stops.find((stop) => stop?.id === currentWaypoint) ?? stops[0] ?? null;
}

/** 一批订单的站点总数。 */
export function countStops(orders: any[] = []): number {
    return orders.reduce((total, order) => total + getOrderStops(order).length, 0);
}

/** 一批订单的预计总时长（秒）。缺失字段按 0 计，避免 NaN 渗进 UI。 */
export function sumDuration(orders: any[] = []): number {
    return orders.reduce((total, order) => total + (order.getAttribute('time') ?? 0), 0);
}

/** 一批订单的预计总里程（米）。缺失字段按 0 计，避免 NaN 渗进 UI。 */
export function sumDistance(orders: any[] = []): number {
    return orders.reduce((total, order) => total + (order.getAttribute('distance') ?? 0), 0);
}

/**
 * 待取件汇总：还需司机跑一趟取件的订单数，以及去重后的取件点数。
 * 商家自送（inbound_method === 'merchant_dropoff'）的单不算。
 */
export function buildPickupSummary(orders: any[] = []): { orders: number; locations: number } {
    const locationIds = new Set<string>();
    let orderCount = 0;

    for (const order of orders ?? []) {
        if (!PICKUP_PENDING_STATUSES.has(order.getAttribute('status'))) continue;

        const meta = order.getAttribute('meta') ?? {};
        if (meta.inbound_method === 'merchant_dropoff') continue;

        const pickup = order.getAttribute('payload.pickup');
        if (!pickup) continue;

        locationIds.add(pickup.id ?? pickup.uuid ?? pickup.street1 ?? 'no-pickup');
        orderCount++;
    }

    return { orders: orderCount, locations: locationIds.size };
}

/**
 * 司机"接下来该干的那一单"：优先在途的，其次已派发的，最后退回第一单。
 * 没有活跃订单时返回 null。
 */
export function pickCurrentTask(orders: any[] = []): any | null {
    const active = orders ?? [];

    return active.find((order) => order.getAttribute('status') === IN_PROGRESS_STATUS) ?? active.find((order) => order.getAttribute('status') === DISPATCHED_STATUS) ?? active[0] ?? null;
}
