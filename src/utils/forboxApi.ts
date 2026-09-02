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
