import { storage } from '../hooks/use-storage';

/**
 * ForBox 仓库员工后端 API client。
 *
 * 所有请求带 Bearer `_warehouse_token`；统一从 MMKV 读出，避免每个 Tab
 * 单独从 context 注入。
 *
 * host 由调用方传入（来自 ConfigContext.resolveConnectionConfig('FLEETBASE_HOST')），
 * 这里只组装 URL 与处理响应。
 */

export interface WarehouseOrderRow {
    uuid: string;
    public_id: string;
    status: string;
    created_at?: string | null;
    // 服务端 eager-load 关联：{uuid, tracking_number, owner_uuid, last_status, ...}
    tracking_number?: string | { tracking_number?: string | null } | null;
    // ForBox 业务字段都在 meta JSON 里
    meta?: {
        route_code?: string | null;
        package_count?: number | null;
        item_category?: string | null;
        merchant_order_no?: string | null;
        estimated_weight_lbs?: number | null;
        inbound_method?: string | null;
    } | null;
    facilitator_name?: string | null;
    dropoff_name?: string | null;
    payload?: {
        dropoff?: {
            city?: string | null;
            postal_code?: string | null;
            country_name?: string | null;
            address?: string | null;
        } | null;
    } | null;
}

export interface PresentedRow {
    uuid: string;
    publicId: string;
    trackingNumber: string;
    merchantName: string;
    merchantOrderNo: string;
    destCity: string;
    routeCode: string;
    packageCount: number | null;
    weightLbs: number | null;
    itemCategory: string;
    daysInWarehouse: number | null;
}

/** 把后端嵌套响应压平成 UI 友好的字段。 */
export function presentRow(row: WarehouseOrderRow): PresentedRow {
    const tn = row.tracking_number;
    const trackingNumber = tn && typeof tn === 'object' ? tn.tracking_number ?? '' : tn ?? '';
    const dropoff = row.payload?.dropoff;
    const destCity = [dropoff?.city, dropoff?.postal_code].filter(Boolean).join(' ') || row.dropoff_name || '';

    let days: number | null = null;
    if (row.created_at) {
        const ms = Date.now() - new Date(row.created_at).getTime();
        if (!Number.isNaN(ms) && ms >= 0) days = Math.floor(ms / 86_400_000);
    }

    return {
        uuid: row.uuid,
        publicId: row.public_id,
        trackingNumber,
        merchantName: row.facilitator_name ?? '',
        merchantOrderNo: row.meta?.merchant_order_no ?? '',
        destCity,
        routeCode: row.meta?.route_code ?? '',
        packageCount: row.meta?.package_count ?? null,
        weightLbs: row.meta?.estimated_weight_lbs ?? null,
        itemCategory: row.meta?.item_category ?? '',
        daysInWarehouse: days,
    };
}

/** 兼容嵌套关联对象 / 纯字符串两种返回形态。 */
export function trackingNumberOf(row: WarehouseOrderRow): string {
    return presentRow(row).trackingNumber;
}

export interface WarehouseListResponse {
    status: 'ok' | 'error';
    data?: {
        data: WarehouseOrderRow[];
        total: number;
        per_page: number;
        current_page: number;
        last_page: number;
    } | WarehouseOrderRow[];
    message?: string;
}

export interface WarehouseScanResponse {
    status: 'ok' | 'error';
    data?: {
        order_id?: string;
        public_id?: string;
        tracking_number?: string;
        status?: string;
        recipient_name?: string;
        package_count?: number;
    };
    message?: string;
}

function joinUrl(host: string, path: string): string {
    return `${host.replace(/\/$/, '')}${path}`;
}

async function authedFetch<T>(host: string, path: string, init: RequestInit = {}): Promise<T> {
    const token = storage.getString('_warehouse_token');
    const cleanToken = token ? JSON.parse(token) : null;

    const res = await fetch(joinUrl(host, path), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
            ...(init.headers ?? {}),
        },
    });

    const body = (await res.json().catch(() => ({}))) as { message?: string } & Record<string, unknown>;

    if (!res.ok) {
        const msg = body?.message ?? `HTTP ${res.status}`;
        throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`);
    }
    return body as T;
}

// ── 端点 ──────────────────────────────────────────────────────────────────

export type WarehouseListMode = 'pending_inbound' | 'in_warehouse' | 'pending_outbound';

const MODE_PATHS: Record<WarehouseListMode, string> = {
    pending_inbound: '/forbox/int/v1/forbox/warehouse/pending-inbound',
    in_warehouse: '/forbox/int/v1/forbox/warehouse/inventory',
    pending_outbound: '/forbox/int/v1/forbox/warehouse/pending-outbound',
};

export const MODE_LABELS: Record<WarehouseListMode, string> = {
    pending_inbound: '待入库',
    in_warehouse: '在库',
    pending_outbound: '待出库',
};

/** 通用列表拉取。pending_inbound / pending_outbound 后端目前一次返回，不分页。 */
export function fetchOrders(host: string, mode: WarehouseListMode, page = 1, perPage = 20) {
    const base = MODE_PATHS[mode];
    const url = mode === 'in_warehouse' ? `${base}?page=${page}&per_page=${perPage}` : base;
    return authedFetch<WarehouseListResponse>(host, url);
}

export function fetchPendingInbound(host: string) {
    return fetchOrders(host, 'pending_inbound');
}

export function fetchInventory(host: string, page = 1, perPage = 20) {
    return fetchOrders(host, 'in_warehouse', page, perPage);
}

export function fetchPendingOutbound(host: string) {
    return fetchOrders(host, 'pending_outbound');
}

export interface DailyPickup {
    date: string;
    count: number;
}

export interface RouteInventoryRow {
    route_code: string;
    count: number;
}

export interface WarehouseStats {
    pending_inbound?: number;
    in_warehouse?: number;
    pending_outbound?: number;
    dispatched_today?: number;
    pending_appointments?: number;
    avg_dwell_hours?: number;
    daily_pickups?: DailyPickup[];
    route_inventory?: RouteInventoryRow[];
}

export interface WarehouseStatsResponse {
    status: 'ok' | 'error';
    data?: WarehouseStats;
    message?: string;
}

export function fetchOperationsStats(host: string) {
    return authedFetch<WarehouseStatsResponse>(host, '/forbox/int/v1/forbox/operations/stats');
}

export interface OrderEntity {
    uuid: string;
    name?: string | null;
    type?: string | null;
    weight?: string | number | null;
}

export interface OrderPlace {
    uuid?: string;
    name?: string | null;
    street1?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    phone?: string | null;
}

export interface OrderTrackingStatus {
    uuid: string;
    status: string;
    details?: string | null;
    created_at: string;
}

export interface OrderPodItem {
    uuid: string;
    type: 'pickup' | 'delivery' | 'photo' | 'signature' | string;
    remarks?: string | null;
    file_url?: string | null;
    raw_data?: string | null;
    created_at: string;
}

export interface OrderDriver {
    uuid?: string;
    name?: string | null;
    phone?: string | null;
}

export interface OrderDetail {
    uuid: string;
    public_id: string;
    status: string;
    created_at?: string | null;
    tracking_number?: string | { tracking_number?: string | null } | null;
    meta?: Record<string, unknown> | null;
    facilitator_name?: string | null;
    payload?: {
        pickup?: OrderPlace | null;
        dropoff?: OrderPlace | null;
        entities?: OrderEntity[];
    } | null;
    tracking_statuses?: OrderTrackingStatus[];
    pod?: OrderPodItem[];
    pickup_driver?: OrderDriver | null;
}

export interface OrderDetailResponse {
    status?: 'ok' | 'error';
    data?: OrderDetail;
    message?: string;
}

export function fetchOrderDetail(host: string, idOrPublicId: string) {
    return authedFetch<OrderDetail | OrderDetailResponse>(
        host,
        `/forbox/int/v1/forbox/orders/${encodeURIComponent(idOrPublicId)}`
    );
}

export function scanIn(host: string, code: string, remarks?: string) {
    return authedFetch<WarehouseScanResponse>(host, '/forbox/int/v1/forbox/warehouse/scan-in', {
        method: 'POST',
        body: JSON.stringify({ code, remarks }),
    });
}

export function scanOut(host: string, code: string) {
    return authedFetch<WarehouseScanResponse>(host, '/forbox/int/v1/forbox/warehouse/scan-out', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
}

// ── 弱网重试队列 ──────────────────────────────────────────────────────────

export interface PendingScan {
    id: string;          // 客户端 uuid
    mode: 'scan-in' | 'scan-out';
    code: string;
    queued_at: string;   // ISO
    last_error?: string;
    attempts: number;
}

const PENDING_KEY = '_warehouse_pending_scans';

export function loadPendingScans(): PendingScan[] {
    const raw = storage.getString(PENDING_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as PendingScan[]) : [];
    } catch {
        return [];
    }
}

export function savePendingScans(list: PendingScan[]): void {
    storage.set(PENDING_KEY, JSON.stringify(list));
}

export function enqueuePendingScan(item: PendingScan): void {
    const list = loadPendingScans();
    list.push(item);
    savePendingScans(list);
}

export function removePendingScan(id: string): void {
    const list = loadPendingScans().filter((p) => p.id !== id);
    savePendingScans(list);
}
