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
    tracking_number?: string | null;
    status: string;
    package_count?: number | null;
    route_code?: string | null;
    recipient_name?: string | null;
    dest_city?: string | null;
    inbound_at?: string | null;   // 入库时间
    days_in_warehouse?: number | null;
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

export function fetchPendingInbound(host: string) {
    return authedFetch<WarehouseListResponse>(host, '/int/v1/forbox/warehouse/pending-inbound');
}

export function fetchInventory(host: string, page = 1, perPage = 20) {
    return authedFetch<WarehouseListResponse>(
        host,
        `/int/v1/forbox/warehouse/inventory?page=${page}&per_page=${perPage}`
    );
}

export function fetchPendingOutbound(host: string) {
    return authedFetch<WarehouseListResponse>(host, '/int/v1/forbox/warehouse/pending-outbound');
}

export function scanIn(host: string, code: string, remarks?: string) {
    return authedFetch<WarehouseScanResponse>(host, '/int/v1/forbox/warehouse/scan-in', {
        method: 'POST',
        body: JSON.stringify({ code, remarks }),
    });
}

export function scanOut(host: string, code: string) {
    return authedFetch<WarehouseScanResponse>(host, '/int/v1/forbox/warehouse/scan-out', {
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
