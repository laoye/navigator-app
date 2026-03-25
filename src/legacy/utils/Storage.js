import { MMKV } from 'react-native-mmkv';
import { useCallback, useSyncExternalStore } from 'react';
import { Collection } from '@fleetbase/sdk';
import { isArray, isVoid } from './Helper';

const storage = new MMKV();

// Replacement for useMMKVStorage hook
function useMMKVStorage(key, _storage, defaultValue) {
    const subscribe = useCallback(
        (callback) => {
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
            return JSON.parse(value);
        } catch {
            return value;
        }
    }, [key, defaultValue]);

    const currentValue = useSyncExternalStore(subscribe, getSnapshot);

    const setValue = useCallback(
        (value) => {
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

// Replacement for create() hook factory
function useStorage(key, defaultValue) {
    return useMMKVStorage(key, storage, defaultValue);
}

const getString = (key) => storage.getString(key);
const setString = (key, value) => storage.set(key, value);
const getInt = (key) => storage.getNumber(key);
const setInt = (key, value) => storage.set(key, value);
const getBool = (key) => storage.getBoolean(key);
const setBool = (key, value) => storage.set(key, value);
const getArray = (key) => {
    const value = storage.getString(key);
    if (value === undefined) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};
const setArray = (key, value) => storage.set(key, JSON.stringify(value));

/**
 * Storage utility functions.
 *
 * @export
 * @class StorageUtil
 */
export default class StorageUtil {
    static instance() {
        return storage;
    }

    static useResourceStorage(key, ResourceType, adapter, defaultValue) {
        const [value, setValue] = useStorage(key, defaultValue);

        const setResource = (resource) => {
            if (isArray(resource) && typeof resource?.invoke === 'function') {
                setValue(resource.invoke('serialize'));
                return;
            }

            if (typeof resource?.serialize === 'function') {
                setValue(resource.serialize());
                return;
            }

            setValue(resource);
        };

        if (value && isArray(value)) {
            return [new Collection(value.map((attributes) => new ResourceType(attributes, adapter))), setResource];
        }

        if (value) {
            return [new ResourceType(value, adapter), setResource];
        }

        if (isVoid(value) && defaultValue !== undefined) {
            return [defaultValue, setResource];
        }

        return [value, setResource];
    }

    static useResourceCollection(key, resource, adapter, defaultValue = new Collection()) {
        const [value, setCollection] = useStorage(key, defaultValue);

        const toCollection = (arr, resource) => {
            if (typeof arr === 'string') {
                return toCollection(JSON.parse(arr));
            }

            if (isVoid(arr)) {
                return new Collection();
            }

            if (typeof arr === 'object' && !isArray(arr) && isArray(arr?.items)) {
                return toCollection(arr.items, resource);
            }

            if (isArray(arr) && typeof arr?.invoke === 'function') {
                return arr;
            }

            if (!isArray(arr)) {
                return new Collection();
            }

            return new Collection(arr?.map((attributes) => new resource(attributes, adapter)));
        };

        const setResource = (resource) => {
            if (typeof value === 'string') {
                storage.delete(key);
            }

            if (!isArray(resource)) {
                return setCollection({ items: [resource] });
            }

            if (typeof resource?.invoke !== 'function') {
                return setCollection({ items: resource });
            }

            return setCollection({ items: resource.invoke('serialize') });
        };

        if (value && isArray(value)) {
            return [toCollection(value, resource), setResource];
        }

        if (isVoid(value) || StorageUtil.isStorageObject(value)) {
            return [defaultValue, setResource];
        }

        return [toCollection(value, resource), setResource];
    }

    static isStorageObject(obj) {
        return typeof obj === 'object' && typeof obj?.instanceID === 'string' && typeof obj?.setMap === 'function';
    }

    static set(key, value) {
        storage.set(key, JSON.stringify(value));
    }

    static get(key) {
        const value = storage.getString(key);
        if (value === undefined) return undefined;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    static remove(key) {
        storage.delete(key);
    }

    static clear() {
        storage.clearAll();
    }
}

const set = StorageUtil.set;
const get = StorageUtil.get;
const remove = StorageUtil.remove;
const clear = StorageUtil.clear;
const useResourceStorage = StorageUtil.useResourceStorage;
const useResourceCollection = StorageUtil.useResourceCollection;

export {
    set,
    get,
    remove,
    clear,
    storage,
    useMMKVStorage,
    useStorage,
    useResourceStorage,
    useResourceCollection,
    getString,
    setString,
    getInt,
    setInt,
    getBool,
    setBool,
    getArray,
    setArray,
};
