import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { getLangNameFromCode } from 'language-name-map';
import { navigatorConfig } from '../utils';
import { getAvailableLocales, getSystemPreferredLocale } from '../utils/localize';
import localeEmoji from 'locale-emoji';
import useStorage from '../hooks/use-storage';
import I18n from 'react-native-i18n';
import moment from 'moment';
import 'moment/locale/zh-cn';

I18n.fallbacks = true;
I18n.translations = {
    ...getAvailableLocales(),
};

interface LanguageContextProps {
    locale: string;
    setLocale: (locale: string) => void;
    t: (key: string, options?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextProps>({
    locale: 'en',
    setLocale: () => {},
    t: () => '',
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    // 首次启动按系统语言决定；用户在 Account 切换后写入 MMKV，下次启动优先沿用。
    const [locale, setLocaleState] = useStorage<string>('_locale', getSystemPreferredLocale());

    const languages = Object.keys(I18n.translations).map((code) => {
        return { code, ...getLangNameFromCode(code), emoji: localeEmoji(code) };
    });

    const language = useMemo(() => {
        return { code: locale, ...getLangNameFromCode(locale), emoji: localeEmoji(locale) };
    }, [locale]);

    // 把 i18n locale 映射成 moment locale（驱动 react-native-calendar-strip 等 moment 消费方）
    const applyMomentLocale = (l: string) => {
        moment.locale(l === 'zh' ? 'zh-cn' : 'en');
    };

    const setLocale = (newLocale: string) => {
        I18n.locale = newLocale;
        applyMomentLocale(newLocale);
        setLocaleState(newLocale);
    };

    useEffect(() => {
        I18n.locale = locale;
        applyMomentLocale(locale);
    }, []);

    const t = (key: string, options?: Record<string, any>) => I18n.t(key, options);

    return <LanguageContext.Provider value={{ locale, setLocale, t, current: language, language, languages }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    return useContext(LanguageContext);
};
