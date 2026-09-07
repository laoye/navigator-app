import { useState, useEffect, useId } from 'react';
import { Switch, Label, XStack } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import useAppTheme from '../hooks/use-app-theme';

const DriverOnlineToggle = ({ showLabel = false, ...props }) => {
    const { isDarkMode } = useAppTheme();
    const { isOnline, toggleOnline, isUpdating } = useAuth();
    // isOnline 在未登录/driver 为空时是 undefined,不做归一化会把 Switch 的 checked
    // 打成 undefined —— Tamagui 的 useControllableState 在 prop === undefined 时
    // 会退回非受控模式,该 Tab 的开关从此不再跟随 context,和其它 Tab 显示不一致
    const [checked, setChecked] = useState(isOnline === true);
    // 用 useId 保证每个实例唯一；上游硬编码 'driverOnline' 会在 bottom-tab 切换瞬间
    // 旧/新 header 同时存在，触发 "duplicate ID for input" 警告
    const switchId = useId();

    const onCheckedChange = async (next) => {
        setChecked(next);

        try {
            const driver = await toggleOnline(next);
            // adapter 缺失时 toggleOnline 返回 undefined,保留乐观值等 isOnline 回灌
            if (driver) {
                setChecked(driver.isOnline === true);
            }
        } catch (err) {
            console.warn('Error attempting to change driver online status:', err);
            // 失败必须回滚:isOnline 没变,下面的 useEffect 不会触发,
            // 不回滚的话本 Tab 会一直停在乐观值上,和其它 Tab 的开关对不上
            setChecked(isOnline === true);
        }
    };

    useEffect(() => {
        setChecked(isOnline === true);
    }, [isOnline]);

    return (
        <XStack alignItems='center' gap='$2'>
            <Switch
                id={switchId}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={isUpdating}
                opacity={isUpdating ? 0.75 : 1}
                bg={checked ? '$green-600' : '$gray-500'}
                borderWidth={1}
                borderColor={isDarkMode ? '$gray-700' : '$white'}
            >
                <Switch.Thumb animation='quick' bg={isDarkMode ? '$gray-200' : '$white'} borderColor={isDarkMode ? '$gray-700' : '$gray-500'} borderWidth={1} />
            </Switch>
            {showLabel === true && (
                <Label htmlFor={switchId} color='$gray-500' size='$2' lineHeight='$4'>
                    {checked ? 'Online' : 'Offline'}
                </Label>
            )}
        </XStack>
    );
};

export default DriverOnlineToggle;
