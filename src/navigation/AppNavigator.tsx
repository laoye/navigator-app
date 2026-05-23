import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Boot, LocationPermission, InstanceLink } from './stacks/CoreStack';
import AuthStack from './stacks/AuthStack';
import DriverNavigator from './DriverNavigator';
import WarehouseNavigator from './WarehouseNavigator';
import PickupChecklistScreen from '../screens/PickupChecklistScreen';
import WarehouseListScreen from '../screens/warehouse/WarehouseListScreen';
import WarehouseOrderDetailScreen from '../screens/warehouse/WarehouseOrderDetailScreen';
import { useShouldShowDriverApp, useShouldShowWarehouseApp } from './guards';
import AppLayout from '../layouts/AppLayout';

/**
 * 顶层渲染分流（守卫定义见 navigation/guards.ts，与 Boot 入口决议共用同一真相源）：
 *   - driver 已登录 → DriverNavigator
 *   - 仓库员工已登录 OR activeRole=warehouse → WarehouseNavigator
 *   - 都未登录 + 未选角色 → AuthStack 内 RoleSelect
 *   - 都未登录 + 已选 driver → AuthStack 内 PhoneLogin
 *   - 都未登录 + 已选 warehouse → AuthStack 内 WarehouseLogin
 */

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    layout: AppLayout,
    screens: {
        Boot,
        LocationPermission,
        InstanceLink,
        ...AuthStack,
        DriverNavigator: {
            if: useShouldShowDriverApp,
            screen: DriverNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
        WarehouseNavigator: {
            if: useShouldShowWarehouseApp,
            screen: WarehouseNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
        // 司机端取货清单（仅 driver 登录后可达；通过 navigation.navigate('PickupChecklist') 触发）
        PickupChecklist: {
            if: useShouldShowDriverApp,
            screen: PickupChecklistScreen,
            options: { headerShown: false, presentation: 'modal' },
        },
        // 仓库员工的多状态库存列表（Dashboard 的 stat 卡 push 进来；待入库/在库/待出库 共用）
        WarehouseList: {
            if: useShouldShowWarehouseApp,
            screen: WarehouseListScreen,
            options: { headerShown: false, presentation: 'card' },
        },
        // 仓库员工的订单详情（从 WarehouseList 卡片 push 进来）
        WarehouseOrderDetail: {
            if: useShouldShowWarehouseApp,
            screen: WarehouseOrderDetailScreen,
            options: { headerShown: false, presentation: 'card' },
        },
    },
});

const AppNavigator = createStaticNavigation(RootStack);
export default AppNavigator;
