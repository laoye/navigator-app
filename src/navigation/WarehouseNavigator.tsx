import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Text } from 'tamagui';
import {
    faGaugeHigh,
    faQrcode,
    faUser,
} from '@fortawesome/free-solid-svg-icons';
import WarehouseDashboardScreen from '../screens/warehouse/WarehouseDashboardScreen';
import WarehouseScanScreen from '../screens/warehouse/WarehouseScanScreen';
import WarehouseAccountScreen from '../screens/warehouse/WarehouseAccountScreen';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 仓库员工 Bottom Tab Navigator（3 Tab）。
 *
 * "在库" 不再是独立 Tab；通过 Dashboard 的 stat 卡 push 到顶层 WarehouseList。
 * 与司机端 DriverNavigator 完全独立 —— 由 AppNavigator 顶层根据
 * activeRole 决定加载哪一个。
 *
 * tabBarLabel 通过自定义函数渲染，以便随 LanguageContext 自动重渲染。
 */

const ICONS: Record<string, any> = {
    Dashboard: faGaugeHigh,
    Scan: faQrcode,
    Account: faUser,
};

const I18N_KEYS: Record<string, string> = {
    Dashboard: 'WarehouseNavigator.dashboard',
    Scan: 'WarehouseNavigator.scan',
    Account: 'WarehouseNavigator.account',
};

function TabBarLabel({ routeName, color }: { routeName: string; color: string }) {
    const { t } = useLanguage();
    return (
        <Text color={color} fontSize='$1' fontWeight='600'>
            {t(I18N_KEYS[routeName] ?? routeName)}
        </Text>
    );
}

const TabNavigator = createBottomTabNavigator({
    initialRouteName: 'Scan',
    screenOptions: ({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <FontAwesomeIcon icon={ICONS[route.name] ?? faGaugeHigh} color={color} size={size} />
        ),
        tabBarLabel: ({ color }: { color: string }) => (
            <TabBarLabel routeName={route.name} color={color} />
        ),
    }),
    screens: {
        Dashboard: { screen: WarehouseDashboardScreen },
        Scan: { screen: WarehouseScanScreen },
        Account: { screen: WarehouseAccountScreen },
    },
});

export default TabNavigator;
