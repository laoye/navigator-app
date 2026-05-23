import LoginScreen from '../../screens/LoginScreen';
import PhoneLoginScreen from '../../screens/PhoneLoginScreen';
import PhoneLoginVerifyScreen from '../../screens/PhoneLoginVerifyScreen';
import EmailLoginScreen from '../../screens/EmailLoginScreen';
import CreateAccountScreen from '../../screens/CreateAccountScreen';
import CreateAccountVerifyScreen from '../../screens/CreateAccountVerifyScreen';
import RoleSelectScreen from '../../screens/RoleSelectScreen';
import WarehouseLoginScreen from '../../screens/WarehouseLoginScreen';
import { useShouldShowRoleSelect, useShouldShowWarehouseLogin, useShouldShowDriverEntry } from '../guards';

/**
 * 顶层入口（守卫定义见 navigation/guards.ts，与 Boot 入口决议共用同一真相源）：
 *   - 未登录 driver 且未选择角色 → RoleSelect
 *   - 选了 driver 之后进入 PhoneLogin（沿用原有 driver flow）
 *   - 选了 warehouse 但还未登录进入 WarehouseLogin
 *   - 任意一方登录成功 → AppNavigator 切到对应 Navigator
 */

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

export const EmailLogin = {
    if: useShouldShowDriverEntry,
    screen: EmailLoginScreen,
    options: {
        headerShown: false,
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
    EmailLogin,
    CreateAccount,
    CreateAccountVerify,
};
