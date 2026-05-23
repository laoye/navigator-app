import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouseAuth } from '../contexts/WarehouseAuthContext';

/**
 * 司机端 / 仓库端双登录共存与角色切换的协调逻辑。
 *
 * 设计前提（已在 AppNavigator / AuthStack 验证）：
 *   - 两端 token 各自独立持久化（`_driver_token` / `_warehouse_token`），互不覆盖，
 *     因此可以同时保持登录态；
 *   - 顶层开关 `_active_role` 决定渲染哪个 Navigator，改它即可切换，无需重新登录；
 *   - 切到尚未登录的一端时，对应的登录页（PhoneLogin / WarehouseLogin）会按
 *     activeRole 自动出现，登录成功后两端 token 都在。
 *
 * 在线状态约定：
 *   - 司机切去仓库端时强制置离线（避免人不在车上却被判定可接单）；
 *   - 从仓库端切回司机端时保持离线，由司机手动再上线（不自动恢复）。
 */
export function useRoleSwitch() {
    const { isAuthenticated: isDriverAuth, isOnline, toggleOnline, logout: driverLogout } = useAuth();
    const { isAuthenticated: isWarehouseAuth, setActiveRole, logoutWarehouse } = useWarehouseAuth();

    // best-effort 置离线：网络失败也不应阻断角色切换
    const goOffline = useCallback(async () => {
        if (!isOnline) return;
        try {
            await toggleOnline(false);
        } catch {
            /* swallow —— 切换体验优先，离线上报失败不阻断 */
        }
    }, [isOnline, toggleOnline]);

    const switchToWarehouse = useCallback(async () => {
        await goOffline();
        setActiveRole('warehouse');
    }, [goOffline, setActiveRole]);

    const switchToDriver = useCallback(() => {
        // 回切不自动上线
        setActiveRole('driver');
    }, [setActiveRole]);

    // 退出当前端：另一端仍登录则自动切过去，否则回 RoleSelect（activeRole=null）
    const signOutDriver = useCallback(async () => {
        await goOffline();
        driverLogout();
        setActiveRole(isWarehouseAuth ? 'warehouse' : null);
    }, [goOffline, driverLogout, isWarehouseAuth, setActiveRole]);

    const signOutWarehouse = useCallback(() => {
        logoutWarehouse(); // 内部会清 warehouse token 并把 activeRole 置 null
        setActiveRole(isDriverAuth ? 'driver' : null); // 紧接着覆盖：driver 在则切过去
    }, [logoutWarehouse, isDriverAuth, setActiveRole]);

    return {
        isDriverAuth,
        isWarehouseAuth,
        switchToWarehouse,
        switchToDriver,
        signOutDriver,
        signOutWarehouse,
    };
}

export default useRoleSwitch;
