import { MMKV } from 'react-native-mmkv';
import { useCallback, useSyncExternalStore } from 'react';

// Initialize MMKV storage once, ensuring it's a singleton
export const storage = new MMKV();

// Main `useStorage` hook function using useSyncExternalStore for React 19 compatibility
function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
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
        const value = storage.getString(key);
        if (value === undefined) return defaultValue;
        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    }, [key, defaultValue]);

    const currentValue = useSyncExternalStore(subscribe, getSnapshot);

    const setValue = useCallback(
        (value: T) => {
            if (value === undefined || value === null) {
                storage.delete(key);
            } else {
                storage.set(key, JSON.stringify(value));
            }
        },
        [key]
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
const setArray = (key: string, value: any[]) => storage.set(key, JSON.stringify(value));

// Custom methods for setting, getting, removing, and clearing maps
const set = (key: string, value: any) => storage.set(key, JSON.stringify(value));
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
