/**
 * 把异常转成可给用户看的文案。
 *
 * 后端/网络抛出的原文往往是英文技术串（"Unauthenticated."、"Network request
 * failed"、"HTTP 500"），统一映射为本地化提示；只有后端返回的其他可读业务
 * message 才透传给用户。
 */
export function userFacingError(err: unknown, t: (key: string, options?: Record<string, unknown>) => string, fallbackKey: string = 'common.errors.requestFailed'): string {
    const message = err instanceof Error ? err.message.trim() : '';

    if (message === 'Unauthenticated.') {
        return t('common.errors.sessionExpired');
    }
    if (message === 'Network request failed') {
        return t('common.errors.networkUnavailable');
    }
    if (message === '' || /^HTTP \d+$/.test(message)) {
        return t(fallbackKey);
    }

    return message;
}
