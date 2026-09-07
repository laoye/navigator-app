/**
 * ForBox 后端专有接口（fleetbase SDK 的 adapter 只覆盖 /v1 命名空间，
 * forbox 扩展包挂在 /forbox/... 下，够不着，所以这里直接 fetch）。
 *
 * host 由 useConfig().resolveConnectionConfig('FLEETBASE_HOST') 提供，
 * token 是司机的 Sanctum token（useAuth().authToken）——与 warehouseApi 各走各的体系，
 * 那边用的是仓管的 OpsStaff token。
 */

export interface DriverExceptionReport {
    reason: string;
    photoProofUuids?: string[];
}

export interface DriverExceptionResult {
    exception_uuid: string;
    follow_up_status: string;
}

function buildUrl(host: string, path: string): string {
    return `${String(host).replace(/\/$/, '')}${path}`;
}

export interface PodStageStatus {
    required: { photos: number; signatures: number; scans: number };
    actual: { photos: number; signatures: number; scans: number };
    /** 方式 B 送仓单没有司机现场揽件，该点豁免 */
    exempt: boolean;
    satisfied: boolean;
    /** 可直接展示的差额，如「照片 1/2」；满足时为 null */
    shortage: string | null;
}

/**
 * 查某单在某交接点还差什么凭证。
 *
 * 够不够只在服务端算 —— 此前 App 里有一份自己的计数逻辑、阈值还写死成 2 张，
 * 运营在后台把要求改了 App 不知道，表现就是「App 说够了、后端 422 拦住」。
 */
export async function fetchPodStatus(
    host: string,
    token: string,
    orderId: string,
    stage: string
): Promise<PodStageStatus | null> {
    if (!host || !token || !orderId) {
        return null;
    }

    const path = `/forbox/int/v1/orders/${encodeURIComponent(orderId)}/pod-status?stage=${encodeURIComponent(stage)}`;
    const response = await fetch(buildUrl(host, path), {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.status !== 'ok') {
        throw new Error(body.message ?? '无法获取凭证要求');
    }

    return body.data?.stages?.[stage] ?? null;
}

/**
 * 司机现场上报订单异常。只写证据（原因 + 照片），不定性、不计费、不改状态——
 * 状态由调用方随后走标准的活动推进改成 exception，定性留给运营在 ops 端做。
 */
export async function reportOrderException(
    host: string,
    token: string,
    orderId: string,
    { reason, photoProofUuids = [] }: DriverExceptionReport
): Promise<DriverExceptionResult> {
    if (!host) {
        throw new Error('FLEETBASE_HOST is not configured');
    }

    const response = await fetch(buildUrl(host, `/forbox/int/v1/orders/${encodeURIComponent(orderId)}/driver-exception`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, photo_proof_uuids: photoProofUuids }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.status !== 'ok') {
        // 服务端已经给了可读的中文 message（如"只能上报指派给自己的订单"）就透传，
        // 否则不要把 Laravel 的英文校验句直接怼给司机
        throw new Error(body?.message ?? body?.errors?.reason?.[0] ?? '');
    }

    return body.data as DriverExceptionResult;
}
