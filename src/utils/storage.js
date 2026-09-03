import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export function get(key) {
    const value = storage.getString(key);
    if (value === undefined) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

export function getString(key) {
    return storage.getString(key);
}

export function getInt(key) {
    return storage.getNumber(key);
}

export function getBool(key) {
    return storage.getBoolean(key);
}

export function getArray(key) {
    const value = storage.getString(key);
    if (value === undefined) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}

export function getMap(key) {
    return get(key);
}

export function set(key, value) {
    const json = JSON.stringify(value);
    // stringify 对函数/Symbol/undefined 返回 undefined,直塞原生 MMKV 是致命崩溃
    if (json === undefined) {
        storage.delete(key);
        return;
    }
    storage.set(key, json);
}

export function setString(key, value) {
    storage.set(key, value);
}

export function setInt(key, value) {
    storage.set(key, value);
}

export function setBool(key, value) {
    storage.set(key, value);
}

export function setArray(key, value) {
    set(key, value);
}

export function setMap(key, value) {
    set(key, value);
}

export function remove(key) {
    storage.delete(key);
}

export function clear() {
    storage.clearAll();
}

export default storage;
