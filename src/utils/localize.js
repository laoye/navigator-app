import { getLangNameFromCode } from 'language-name-map';
import * as RNLocalize from 'react-native-localize';
import { getString } from '../utils/storage';
import { get, navigatorConfig } from '../utils';
import en from '../locales/en.js';
import zh from '../locales/zh.js';
import I18n from 'react-native-i18n';

export const translations = {
    en,
    zh,
};

export function getAvailableLocales() {
    const availableLocales = navigatorConfig('availableLocales', ['en']);
    return Object.fromEntries(Object.entries(translations).filter(([locale]) => availableLocales.includes(locale)));
}

/**
 * 系统首选语言（在可用 locales 内做 best match）→ 没匹配则用配置的 defaultLocale。
 * 注意：仅在用户未显式选过语言时使用；用户手动切换后 `_locale` 已存 MMKV，优先级最高。
 */
export function getSystemPreferredLocale() {
    const available = Object.keys(getAvailableLocales());
    if (available.length === 0) return navigatorConfig('defaultLocale', 'en');
    // react-native-localize v3 改名 findBestLanguageTag
    const fn = RNLocalize.findBestLanguageTag ?? RNLocalize.findBestAvailableLanguage;
    if (typeof fn !== 'function') {
        return navigatorConfig('defaultLocale', 'en');
    }
    const best = fn(available);
    return best?.languageTag ?? navigatorConfig('defaultLocale', 'en');
}

export function getLocale() {
    return getString('_locale') ?? getSystemPreferredLocale();
}

export function getLanguage() {
    const locale = getLocale();
    return { code: locale, ...getLangNameFromCode(locale) };
}

export function translate(key, options) {
    return I18n.t(key, options);
}
