import { MMKV } from 'react-native-mmkv';
import { useCallback, useRef, useSyncExternalStore } from 'react';

// Initialize MMKV storage once, ensuring it's a singleton
export const storage = new MMKV();

// Main `useStorage` hook function using useSyncExternalStore for React 19 compatibility
function useStorage<T>(key: string, defaultValue?: T): [T, (value: T) => void] {
    // Stabilize defaultValue reference to prevent useSyncExternalStore infinite loops
    // when callers pass inline objects/arrays (e.g. useStorage('key', []))
    const defaultValueRef = useRef(defaultValue);
    // Cache last raw string + parsed result so getSnapshot always returns the
    // same reference when the underlying data hasn't changed (required by React's
    // useSyncExternalStore consistency check).
    const snapshotCache = useRef<{ raw: string | undefined; parsed: T }>({
        raw: undefined,
        parsed: defaultValueRef.current as T,
    });

    const subscribe = useCallback(
        (callback: () => void) => {
            const listener = storage.addOnValueChangedListener((changedKey) => {
                if (changedKey === key) callback();
            });
            return () => listener.remove();
        },
        [key]
    );

    const getSnapshot = useCallback(() => {
        const raw = storage.getString(key);
        if (raw === undefined) return defaultValueRef.current as T;
        if (raw === snapshotCache.current.raw) return snapshotCache.current.parsed;
        try {
            const parsed = JSON.parse(raw) as T;
            snapshotCache.current = { raw, parsed };
            return parsed;
        } catch {
            const parsed = raw as unknown as T;
            snapshotCache.current = { raw, parsed };
            return parsed;
        }
    }, [key]);

    const currentValue = useSyncExternalStore(subscribe, getSnapshot);

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            // 支持 React 惯用的函数式更新。此前不支持:传入的函数会被直接
            // JSON.stringify(得到 undefined)塞给原生 MMKV,整 App 致命崩溃
            // (2026-09-02 前台收推送必崩的根因,NotificationContext 的
            // setNotifications(prev => ...) 触发)
            const next = typeof value === 'function' ? (value as (prev: T) => T)(getSnapshot()) : value;

            if (next === undefined || next === null) {
                storage.delete(key);
                return;
            }

            const json = JSON.stringify(next);
            // JSON.stringify 对函数/Symbol 返回 undefined,塞给原生会抛
            // 类型错误且是致命级——宁可删键也不崩
            if (json === undefined) {
                storage.delete(key);
                return;
            }

            storage.set(key, json);
        },
        [key, getSnapshot]
    );

    return [currentValue, setValue];
}

// Utility functions for direct access
const getString = (key: string) => storage.getString(key);
const setString = (key: string, value: string) => storage.set(key, value);
const getInt = (key: string) => storage.getNumber(key);
const setInt = (key: string, value: number) => storage.set(key, value);
const getBool = (key: string) => storage.getBoolean(key);
const setBool = (key: string, value: boolean) => storage.set(key, value);
const getArray = (key: string) => {
    const value = storage.getString(key);
    if (value === undefined) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};
// stringify 可能返回 undefined(函数/Symbol/undefined),直塞原生是致命崩溃
const safeSet = (key: string, value: any) => {
    const json = JSON.stringify(value);
    if (json === undefined) {
        storage.delete(key);
        return;
    }
    storage.set(key, json);
};
const setArray = (key: string, value: any[]) => safeSet(key, value);

// Custom methods for setting, getting, removing, and clearing maps
const set = (key: string, value: any) => safeSet(key, value);
const get = (key: string) => {
    const value = storage.getString(key);
    if (value === undefined) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};
const remove = (key: string) => storage.delete(key);
const clear = () => storage.clearAll();

// Export the hook and individual utility functions
export { useStorage, getString, setString, getInt, setInt, getBool, setBool, getArray, setArray, set, get, remove, clear };

export default useStorage;
