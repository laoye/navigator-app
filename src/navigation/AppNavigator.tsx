import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Boot, LocationPermission, InstanceLink } from './stacks/CoreStack';
import AuthStack from './stacks/AuthStack';
import DriverNavigator from './DriverNavigator';
import WarehouseNavigator from './WarehouseNavigator';
import { useIsAuthenticated } from '../contexts/AuthContext';
import { useIsWarehouseAuthenticated, useActiveRole } from '../contexts/WarehouseAuthContext';
import AppLayout from '../layouts/AppLayout';

/**
 * 顶层渲染分流：
 *   - driver 已登录 → DriverNavigator
 *   - 仓库员工已登录 OR activeRole=warehouse → WarehouseNavigator
 *   - 都未登录 + 未选角色 → AuthStack 内 RoleSelect（见 AuthStack 决议 hook）
 *   - 都未登录 + 已选 driver → AuthStack 内 PhoneLogin
 *   - 都未登录 + 已选 warehouse → AuthStack 内 WarehouseLogin
 */

const useShouldShowDriverApp = () => {
    const isDriverAuth = useIsAuthenticated();
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    // 司机登录优先；如果两边都登录了（极端情况），按 activeRole 决定，否则 driver
    const role = useActiveRole();
    if (isWarehouseAuth && role === 'warehouse') return false;
    return isDriverAuth;
};

const useShouldShowWarehouseApp = () => {
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    const role = useActiveRole();
    return isWarehouseAuth && role !== 'driver';
};

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
    },
});

const AppNavigator = createStaticNavigation(RootStack);
export default AppNavigator;
