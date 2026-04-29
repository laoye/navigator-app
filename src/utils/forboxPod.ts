/**
 * ForBox 大件 POD 强制校验（客户端拦截 + 服务端兜底）
 *
 * 与 fleetbase 后端 FBOrderObserver 中 enforcePodForStatus 的判定规则保持一致：
 *   - 签字：raw_data 以 'data:image' 开头（base64 PNG）
 *   - 照片：file 关联存在且不是 base64 image（QR 扫码记录有 raw_data 但无 file，自然不计入）
 *
 * 阈值默认 2 photo + 1 signature。方式 B 送仓订单（meta.inbound_method=merchant_dropoff）
 * 在 picked_up 阶段豁免。
 */

export const FORBOX_POD_REQUIRED_PHOTOS = 2;
export const FORBOX_POD_REQUIRED_SIGNATURES = 1;

export interface ProofRow {
    raw_data?: string | null;
    raw?: string | null;          // SDK 字段名差异容忍
    file_uuid?: string | null;
    file?: { uuid?: string } | null;
    url?: string | null;
}

export interface PodCount {
    photos: number;
    signatures: number;
}

export function countProofs(proofs: ProofRow[]): PodCount {
    let photos = 0;
    let signatures = 0;

    for (const p of proofs ?? []) {
        const raw = p.raw_data ?? p.raw ?? null;
        const isSignature = typeof raw === 'string' && raw.startsWith('data:image');

        if (isSignature) {
            signatures++;
            continue;
        }

        const hasFile = !!(p.file_uuid || p.file?.uuid || p.url);
        if (hasFile) {
            photos++;
        }
    }

    return { photos, signatures };
}

/**
 * 判断 fleetbase 订单是否应受 ForBox 强制 POD 守护。
 *
 * 触发条件：
 *   1. order.type === 'forbox'
 *   2. 目标推进状态是 picked_up 或 delivered
 *   3. picked_up + meta.inbound_method === 'merchant_dropoff' 时豁免（方式 B 送仓单）
 */
export function shouldEnforceForboxPod(
    orderType: string | null | undefined,
    targetStatus: string | null | undefined,
    inboundMethod: string | null | undefined
): boolean {
    if (orderType !== 'forbox') return false;
    if (targetStatus !== 'picked_up' && targetStatus !== 'delivered') return false;
    if (targetStatus === 'picked_up' && inboundMethod === 'merchant_dropoff') return false;
    return true;
}

export function isPodSufficient(count: PodCount): boolean {
    return count.photos >= FORBOX_POD_REQUIRED_PHOTOS && count.signatures >= FORBOX_POD_REQUIRED_SIGNATURES;
}

/**
 * 用户友好的不足描述。例如："照片 1/2、签字 0/1"
 */
export function describeShortage(count: PodCount): string {
    const parts: string[] = [];
    if (count.photos < FORBOX_POD_REQUIRED_PHOTOS) {
        parts.push(`照片 ${count.photos}/${FORBOX_POD_REQUIRED_PHOTOS}`);
    }
    if (count.signatures < FORBOX_POD_REQUIRED_SIGNATURES) {
        parts.push(`签字 ${count.signatures}/${FORBOX_POD_REQUIRED_SIGNATURES}`);
    }
    return parts.join('、');
}

/**
 * 通过 fleetbase adapter 拉取订单的 proofs 数组并计数。
 *
 * adapter 由 useFleetbase() 提供；endpoint 与 OrderProofOfDelivery 组件一致：
 *   GET /v1/orders/{order_id}/proofs
 */
export async function fetchOrderPodCount(adapter: any, orderId: string): Promise<PodCount> {
    if (!adapter || !orderId) {
        return { photos: 0, signatures: 0 };
    }
    try {
        const proofs: ProofRow[] = await adapter.get(`orders/${orderId}/proofs`);
        return countProofs(Array.isArray(proofs) ? proofs : []);
    } catch (err) {
        // 网络错误时不强行拦截（让服务端 422 兜底）
        console.warn('[forboxPod] failed to fetch proofs:', err);
        return { photos: FORBOX_POD_REQUIRED_PHOTOS, signatures: FORBOX_POD_REQUIRED_SIGNATURES };
    }
}
