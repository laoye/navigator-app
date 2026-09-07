/**
 * ForBox 交接点凭证校验（客户端拦截 + 服务端兜底）
 *
 * 够不够**只由服务端算**：要求存在后台的凭证策略里，运营随时可改，
 * App 这边再算一遍必然走样。这里只保留「这一步要不要校验」的判断，
 * 具体差多少走 forboxApi.fetchPodStatus。
 */

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

