import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Image, Spinner, XStack, YStack } from 'tamagui';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'react-native-linear-gradient';
import { config, toArray, isArray, later } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useResolvedRootRoute } from '../navigation/guards';
import useFleetbase from '../hooks/use-fleetbase';
import BootSplash from 'react-native-bootsplash';
import SetupWarningScreen from './SetupWarningScreen';

const BootScreen = ({ route }) => {
    const params = route.params ?? {};
    const navigation = useNavigation();
    const { hasFleetbaseConfig } = useFleetbase();
    // 启动后该进哪个屏幕由 guards 统一决议（与 AppNavigator / AuthStack 的 `if` 守卫同源）
    const target = useResolvedRootRoute();
    const { t } = useLanguage();
    const [error, setError] = useState<Error | null>(null);
    const backgroundColor = toArray(config('BOOTSCREEN_BACKGROUND_COLOR', '$background'));
    const isGradientBackground = isArray(backgroundColor) && backgroundColor.length > 1;
    const locationEnabled = params.locationEnabled;

    useFocusEffect(
        useCallback(() => {
            const checkLocationPermission = async () => {
                const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

                const result = await check(permission);
                if (result === RESULTS.GRANTED) {
                    initializeNavigator();
                } else {
                    later(() => BootSplash.hide(), 300);
                    // If the locationEnabled flag is set meaning not null or undefined then initialize navigator
                    if (locationEnabled !== undefined && locationEnabled !== null) {
                        initializeNavigator();
                    } else {
                        navigation.navigate('LocationPermission');
                    }
                }
            };

            const initializeNavigator = async () => {
                if (!hasFleetbaseConfig()) {
                    return setError(new Error(t('BootScreen.missingRequiredConfigurationKeys')));
                }

                try {
                    later(() => {
                        try {
                            // 入口屏幕由 useResolvedRootRoute() 统一决议（与 AppNavigator /
                            // AuthStack 的 `if` 守卫共用 navigation/guards 里的同一组谓词），
                            // 因此 target 对应屏幕的 `if` 必为 true，不会再出现
                            // "NAVIGATE ... was not handled by any navigator" 而卡在 Boot。
                            navigation.navigate(target);
                        } catch (err) {
                            console.warn('Failed to navigate to screen:', err);
                        }
                    }, 0);
                } catch (initializationError) {
                    setError(initializationError);
                } finally {
                    later(() => BootSplash.hide(), 300);
                }
            };

            checkLocationPermission();
        }, [navigation, target])
    );

    if (error) {
        return <SetupWarningScreen error={error} />;
    }

    return (
        <YStack flex={1} bg={backgroundColor[0]} alignItems='center' justifyContent='center' width='100%' height='100%'>
            {isGradientBackground && (
                <LinearGradient
                    colors={backgroundColor}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        height: '100%',
                        width: '100%',
                    }}
                />
            )}
            <YStack alignItems='center' justifyContent='center'>
                <Image source={require('../../assets/splash-screen.png')} width={100} height={100} borderRadius='$4' mb='$1' />
                <XStack mt='$2' alignItems='center' justifyContent='center' space='$3'>
                    <Spinner size='small' color='$textPrimary' />
                </XStack>
            </YStack>
        </YStack>
    );
};

export default BootScreen;
