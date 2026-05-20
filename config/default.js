import { mergeConfigs, config, toBoolean } from '../src/utils/config';
import { toArray } from '../src/utils';

export const DefaultConfig = {
    theme: config('APP_THEME', 'blue'),
    driverNavigator: {
        // ForBox 司机端只用 Dash / Orders / Account 三个 Tab；Reports（油费/工单）和 Chat 上游不开。
        // 如需启用可通过 env 覆盖，例如：DRIVER_NAVIGATOR_TABS=DriverDashboardTab,DriverTaskTab,DriverReportTab,DriverChatTab,DriverAccountTab
        tabs: toArray(config('DRIVER_NAVIGATOR_TABS', 'DriverDashboardTab,DriverTaskTab,DriverAccountTab')),
        defaultTab: toArray(config('DRIVER_NAVIGATOR_DEFAULT_TAB', 'DriverDashboardTab')),
    },
    defaultLocale: config('DEFAULT_LOCALE', 'en'),
    availableLocales: toArray(config('AVAILABLE_LOCALES', 'en,zh')),
    colors: {
        loginBackground: config('LOGIN_BG_COLOR', '#111827'),
    },
};

export function createNavigatorConfig(userConfig = {}) {
    return mergeConfigs(DefaultConfig, userConfig);
}
