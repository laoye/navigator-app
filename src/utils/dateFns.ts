import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import I18n from 'react-native-i18n';

/**
 * 把 i18n locale 映射成 date-fns Locale 对象。
 * react-native-i18n 的 locale 是 'en' / 'zh'；date-fns 用 enUS / zhCN。
 */
export function getDateFnsLocale(): Locale {
    const lc = (I18n.locale ?? 'en').toLowerCase();
    if (lc.startsWith('zh')) return zhCN;
    return enUS;
}

/** 跟随当前 i18n locale 的 date-fns format 包装。 */
export function formatLocalized(date: Date | string | number, fmt: string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateFnsFormat(d, fmt, { locale: getDateFnsLocale() });
}

/** 跟随当前 i18n locale 的 formatDistanceToNow 包装。 */
export function formatDistanceToNowLocalized(date: Date | string | number, options?: { addSuffix?: boolean }): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateFnsFormatDistanceToNow(d, { ...(options ?? {}), locale: getDateFnsLocale() });
}
