import LoginScreen from '../../screens/LoginScreen';
import PhoneLoginScreen from '../../screens/PhoneLoginScreen';
import PhoneLoginVerifyScreen from '../../screens/PhoneLoginVerifyScreen';
import CreateAccountScreen from '../../screens/CreateAccountScreen';
import CreateAccountVerifyScreen from '../../screens/CreateAccountVerifyScreen';
import RoleSelectScreen from '../../screens/RoleSelectScreen';
import WarehouseLoginScreen from '../../screens/WarehouseLoginScreen';
import { useIsNotAuthenticated, useIsAuthenticated } from '../../contexts/AuthContext';
import { useActiveRole, useIsWarehouseAuthenticated } from '../../contexts/WarehouseAuthContext';

/**
 * 顶层入口：未登录 driver 且未选择角色 → 显示 RoleSelect。
 *
 * 选了 driver 之后会进入 PhoneLogin（沿用原有 driver flow）；
 * 选了 warehouse 但还未登录会进入 WarehouseLogin；
 * 任意一方登录成功 → AppNavigator 切到对应 Navigator。
 */
const useShouldShowRoleSelect = () => {
    const isDriverAuth = useIsAuthenticated();
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    const role = useActiveRole();
    return !isDriverAuth && !isWarehouseAuth && role === null;
};

const useShouldShowWarehouseLogin = () => {
    const isWarehouseAuth = useIsWarehouseAuthenticated();
    const role = useActiveRole();
    return !isWarehouseAuth && role === 'warehouse';
};

const useShouldShowDriverEntry = () => {
    const isDriverAuth = useIsAuthenticated();
    const role = useActiveRole();
    return !isDriverAuth && role === 'driver';
};

export const RoleSelect = {
    if: useShouldShowRoleSelect,
    screen: RoleSelectScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
    },
};

export const WarehouseLogin = {
    if: useShouldShowWarehouseLogin,
    screen: WarehouseLoginScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
    },
};

export const Login = {
    if: useShouldShowDriverEntry,
    screen: LoginScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
    },
};

export const PhoneLogin = {
    if: useShouldShowDriverEntry,
    screen: PhoneLoginScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
    },
};

export const PhoneLoginVerify = {
    if: useShouldShowDriverEntry,
    screen: PhoneLoginVerifyScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
    },
};

export const CreateAccount = {
    if: useShouldShowDriverEntry,
    screen: CreateAccountScreen,
    options: {
        headerShown: false,
    },
};

export const CreateAccountVerify = {
    if: useShouldShowDriverEntry,
    screen: CreateAccountVerifyScreen,
    options: {
        headerShown: false,
    },
};

export default {
    RoleSelect,
    WarehouseLogin,
    Login,
    PhoneLogin,
    PhoneLoginVerify,
    CreateAccount,
    CreateAccountVerify,
};
