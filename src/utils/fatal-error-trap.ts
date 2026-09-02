import { Alert } from 'react-native';
import storage from './storage';

// Release 包里致命 JS 错误只会走 ExceptionsManager 直接把 App 崩掉，错误内容
// 无处可查（2026-09-01 TestFlight 崩溃即此路径）。这里在默认处理器之前把
// 错误同步落盘 MMKV，下次启动弹窗展示，供远程测试员截图回传。
const STORAGE_KEY = '_last_fatal_js_error';

type FatalErrorRecord = {
    message: string;
    stack: string;
    time: string;
};

export function installFatalErrorTrap(): void {
    const errorUtils = (global as any).ErrorUtils;
    if (!errorUtils?.setGlobalHandler) return;

    const defaultHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        if (isFatal) {
            try {
                const record: FatalErrorRecord = {
                    message: String((error as Error)?.message ?? error),
                    stack: String((error as Error)?.stack ?? ''),
                    time: new Date().toISOString(),
                };
                // storage.set 是 react-native-mmkv 的同步 JSI 调用，
                // 必须在 defaultHandler 触发原生 abort 之前完成落盘
                storage.set(STORAGE_KEY, JSON.stringify(record));
            } catch {
                // 落盘失败不能阻断默认崩溃流程
            }
        }
        defaultHandler?.(error, isFatal);
    });
}

export function showLastFatalError(): void {
    try {
        const raw = storage.getString(STORAGE_KEY);
        if (!raw) return;
        storage.delete(STORAGE_KEY);

        const record: FatalErrorRecord = JSON.parse(raw);
        const stackPreview = record.stack.split('\n').slice(0, 12).join('\n');
        Alert.alert('上次启动发生错误（请截图发给开发者）', `时间: ${record.time}\n\n${record.message}\n\n${stackPreview}`, [{ text: '知道了' }]);
    } catch {
        // 展示失败静默跳过，不影响正常启动
    }
}
