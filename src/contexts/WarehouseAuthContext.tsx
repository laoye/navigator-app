import React, { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import useStorage from '../hooks/use-storage';
import { useConfig } from './ConfigContext';

/**
 * 仓库员工角色登录态。
 *
 * 与 Driver 体系完全隔离：
 *   - token 存在 MMKV key `_warehouse_token`（与 driver 的 `_driver_token` 互不影响）
 *   - staff 信息存 `_warehouse_staff`
 *   - 顶层 `_active_role` 决定 AppNavigator 渲染哪个 Navigator
 *
 * 调用 ForBox 后端 `POST /forbox/int/v1/forbox/ops/auth/login`（OpsStaff 体系），
 * 仅放行 role=warehouse 或 admin 的账号；operations 角色不开放给 App。
 */

export type ActiveRole = 'driver' | 'warehouse' | null;

export interface WarehouseStaff {
    uuid: string;
    name: string;
    email: string;
    role: 'admin' | 'operations' | 'warehouse';
}

interface WarehouseAuthContextValue {
    staff: WarehouseStaff | null;
    token: string | null;
    isAuthenticated: boolean;
    activeRole: ActiveRole;
    setActiveRole: (role: ActiveRole) => void;
    loginWarehouse: (email: string, password: string) => Promise<WarehouseStaff>;
    logoutWarehouse: () => void;
}

const WarehouseAuthContext = createContext<WarehouseAuthContextValue | null>(null);

export const WarehouseAuthProvider = ({ children }: { children: ReactNode }) => {
    const { resolveConnectionConfig } = useConfig();
    const [token, setToken] = useStorage<string | null>('_warehouse_token', null);
    const [staff, setStaff] = useStorage<WarehouseStaff | null>('_warehouse_staff', null);
    const [activeRole, setActiveRole] = useStorage<ActiveRole>('_active_role', null);

    const loginWarehouse = useCallback(
        async (email: string, password: string): Promise<WarehouseStaff> => {
            const host = resolveConnectionConfig('FLEETBASE_HOST');
            if (!host) {
                throw new Error('Fleetbase host not configured');
            }

            const url = `${String(host).replace(/\/$/, '')}/forbox/int/v1/forbox/ops/auth/login`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const body = await res.json().catch(() => ({} as Record<string, unknown>));

            if (!res.ok) {
                const msg = (body as { message?: string }).message ?? `HTTP ${res.status}`;
                throw new Error(msg);
            }

            const data = (body as { data?: { token?: string; staff?: WarehouseStaff } }).data ?? {};
            const issuedToken = data.token;
            const issuedStaff = data.staff;

            if (!issuedToken || !issuedStaff) {
                throw new Error('Invalid login response');
            }

            // 仅放行 warehouse / admin 角色（operations 不在 App 端使用）
            if (issuedStaff.role !== 'warehouse' && issuedStaff.role !== 'admin') {
                throw new Error('该账号无仓库 App 权限');
            }

            setToken(issuedToken);
            setStaff(issuedStaff);
            setActiveRole('warehouse');

            return issuedStaff;
        },
        [resolveConnectionConfig, setToken, setStaff, setActiveRole]
    );

    const logoutWarehouse = useCallback(() => {
        const host = resolveConnectionConfig('FLEETBASE_HOST');
        // 后端 logout 是 best-effort —— 失败也不影响本地清理
        if (host && token) {
            const url = `${String(host).replace(/\/$/, '')}/forbox/int/v1/forbox/ops/auth/logout`;
            fetch(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            }).catch(() => {
                /* swallow */
            });
        }
        setToken(null);
        setStaff(null);
        setActiveRole(null);
    }, [resolveConnectionConfig, token, setToken, setStaff, setActiveRole]);

    const value = useMemo<WarehouseAuthContextValue>(
        () => ({
            staff,
            token,
            isAuthenticated: !!token && !!staff,
            activeRole,
            setActiveRole,
            loginWarehouse,
            logoutWarehouse,
        }),
        [staff, token, activeRole, setActiveRole, loginWarehouse, logoutWarehouse]
    );

    return <WarehouseAuthContext.Provider value={value}>{children}</WarehouseAuthContext.Provider>;
};

export const useWarehouseAuth = (): WarehouseAuthContextValue => {
    const ctx = useContext(WarehouseAuthContext);
    if (!ctx) {
        throw new Error('useWarehouseAuth must be used within WarehouseAuthProvider');
    }
    return ctx;
};

/**
 * 以 hook 形式返回当前 active role；用于 AppNavigator 在 driver / warehouse 之间分流。
 */
export const useActiveRole = (): ActiveRole => {
    return useWarehouseAuth().activeRole;
};

/**
 * 是否已选择仓库员工身份并完成登录。
 */
export const useIsWarehouseAuthenticated = (): boolean => {
    return useWarehouseAuth().isAuthenticated;
};
