import { useIsAuthenticated } from '../contexts/AuthContext';
import { useIsWarehouseAuthenticated, useActiveRole } from '../contexts/WarehouseAuthContext';

/**
 * 顶层路由守卫 —— 全 App "当前端 / 当前屏幕" 分流的唯一真相源。
 *
 * AppNavigator / AuthStack 的条件渲染 `if`，以及 BootScreen 的启动入口决议
 * （useResolvedRootRoute）都从这里取同一组谓词，避免各处口径分叉：
 * 历史上 Boot 自己重新推导跳转目标，与屏幕 `if` 守卫不一致时会 navigate 到一个
 * 当前未注册的条件屏幕（RN 报 "NAVIGATE ... was not handled by any navigator"），
 * 导致一直卡在 Boot。集中到此处后，这类分叉在结构上不可能再发生。
 *
 * activeRole 是"当前端"的唯一开关，优先级高于原始登录态：
 *   - role==='warehouse' 时即使 driver 已登录也让位给仓库端；
 *   - role==='driver' 时即使 warehouse 已登录也让位给司机端。
 */

export const useShouldShowDriverApp = (): boolean => {
    const isDriverAuth = useIsAuthenticated();
    const role = useActiveRole();
    if (role === 'warehouse') return false;
    return isDriverAuth;
};

export const useShouldShowWarehouseApp = (): boolean => {
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    const role = useActiveRole();
    return isWarehouseAuth && role !== 'driver';
};

export const useShouldShowRoleSelect = (): boolean => {
    const isDriverAuth = useIsAuthenticated();
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    const role = useActiveRole();
    return !isDriverAuth && !isWarehouseAuth && role === null;
};

export const useShouldShowWarehouseLogin = (): boolean => {
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    const role = useActiveRole();
    return !isWarehouseAuth && role === 'warehouse';
};

export const useShouldShowDriverEntry = (): boolean => {
    const isDriverAuth = useIsAuthenticated();
    const role = useActiveRole();
    return !isDriverAuth && role === 'driver';
};

/**
 * Boot 启动检查完成后应进入的"入口屏幕"名。
 *
 * 每个分支都与上面对应的守卫一一对应、按优先级短路，因此返回值对应屏幕的 `if` 必为 true，
 * Boot navigate(target) 不会再出现 "not handled by any navigator"。
 *
 * 注意：司机登录流有多个共享 useShouldShowDriverEntry 守卫的屏幕，这里显式选 PhoneLogin
 * 作为入口（SMS 主路径），其余 EmailLogin / CreateAccount 等由 PhoneLogin 内导航进入。
 */
export type RootEntryRoute = 'DriverNavigator' | 'WarehouseNavigator' | 'PhoneLogin' | 'WarehouseLogin' | 'RoleSelect';

export const useResolvedRootRoute = (): RootEntryRoute => {
    const showDriverApp = useShouldShowDriverApp();
    const showWarehouseApp = useShouldShowWarehouseApp();
    const showDriverEntry = useShouldShowDriverEntry();
    const showWarehouseLogin = useShouldShowWarehouseLogin();

    if (showDriverApp) return 'DriverNavigator';
    if (showWarehouseApp) return 'WarehouseNavigator';
    if (showDriverEntry) return 'PhoneLogin';
    if (showWarehouseLogin) return 'WarehouseLogin';
    return 'RoleSelect';
};
