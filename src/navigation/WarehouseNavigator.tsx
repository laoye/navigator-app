import React from 'react';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faGaugeHigh,
    faQrcode,
    faBoxesStacked,
    faUser,
} from '@fortawesome/free-solid-svg-icons';
import WarehouseDashboardScreen from '../screens/warehouse/WarehouseDashboardScreen';
import WarehouseScanScreen from '../screens/warehouse/WarehouseScanScreen';
import WarehouseInventoryScreen from '../screens/warehouse/WarehouseInventoryScreen';
import WarehouseAccountScreen from '../screens/warehouse/WarehouseAccountScreen';

/**
 * 仓库员工 Bottom Tab Navigator（4 Tab）。
 *
 * 与司机端 DriverNavigator 完全独立 —— 由 AppNavigator 顶层根据
 * activeRole 决定加载哪一个。
 */

const ICONS: Record<string, any> = {
    Dashboard: faGaugeHigh,
    Scan: faQrcode,
    Inventory: faBoxesStacked,
    Account: faUser,
};

const TabNavigator = createBottomTabNavigator({
    initialRouteName: 'Scan',
    screenOptions: ({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <FontAwesomeIcon icon={ICONS[route.name] ?? faGaugeHigh} color={color} size={size} />
        ),
    }),
    screens: {
        Dashboard: {
            screen: WarehouseDashboardScreen,
            options: { tabBarLabel: '概览' },
        },
        Scan: {
            screen: WarehouseScanScreen,
            options: { tabBarLabel: '扫码' },
        },
        Inventory: {
            screen: WarehouseInventoryScreen,
            options: { tabBarLabel: '在库' },
        },
        Account: {
            screen: WarehouseAccountScreen,
            options: { tabBarLabel: '账户' },
        },
    },
});

export default TabNavigator;
