import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTruck, faWarehouse, faPlug } from '@fortawesome/free-solid-svg-icons';
import DeviceInfo from 'react-native-device-info';
import { useWarehouseAuth } from '../contexts/WarehouseAuthContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 启动后第一个屏幕：让用户选择"司机"还是"仓库员工"。
 *
 * - 选司机    → 设 activeRole=driver，跳转既有 PhoneLogin（沿用 driver-token 流）
 * - 选仓库员工 → 设 activeRole=warehouse，跳转 WarehouseLogin（邮箱 + 密码）
 *
 * 选择会持久化到 MMKV `_active_role`，下次启动直接进对应登录入口；
 * 用户可在登录页底部 "切换身份" 按钮回到本页清除选择。
 */
const RoleSelectScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const windowHeight = Dimensions.get('window').height;
    const { setActiveRole } = useWarehouseAuth();
    const { t } = useLanguage();

    const handlePickDriver = () => {
        setActiveRole('driver');
        navigation.navigate('PhoneLogin');
    };

    const handlePickWarehouse = () => {
        setActiveRole('warehouse');
        navigation.navigate('WarehouseLogin');
    };

    const handleOpenInstanceLink = () => {
        navigation.navigate('InstanceLink');
    };

    return (
        <YStack flex={1} bg='$background' position='relative'>
            <YStack justifyContent='center' alignItems='center' paddingTop={insets.top} marginTop={windowHeight / 5}>
                <Image source={require('../../assets/navigator-icon-transparent.png')} style={{ width: 80, height: 80 }} />
                <Text mt='$4' fontSize='$8' fontWeight='800' color='$textPrimary'>
                    {t('RoleSelectScreen.title')}
                </Text>
                <Text mt='$2' fontSize='$3' color='$textSecondary'>
                    {t('RoleSelectScreen.subtitle')}
                </Text>
            </YStack>

            <SafeAreaView style={{ flex: 1 }}>
                <YStack flex={1} justifyContent='flex-end' alignItems='stretch' space='$3' px='$5' pb='$6'>
                    <Button
                        size='$5'
                        onPress={handlePickDriver}
                        bg='$blue-600'
                        pressStyle={{ bg: '$blue-700' }}
                        icon={<FontAwesomeIcon icon={faTruck} color='white' size={18} />}
                    >
                        <Text color='white' fontSize='$5' fontWeight='700'>
                            {t('RoleSelectScreen.pickDriver')}
                        </Text>
                    </Button>

                    <Button
                        size='$5'
                        onPress={handlePickWarehouse}
                        bg='$green-600'
                        pressStyle={{ bg: '$green-700' }}
                        icon={<FontAwesomeIcon icon={faWarehouse} color='white' size={18} />}
                    >
                        <Text color='white' fontSize='$5' fontWeight='700'>
                            {t('RoleSelectScreen.pickWarehouse')}
                        </Text>
                    </Button>

                    <Text mt='$3' textAlign='center' color='$textSecondary' fontSize='$2'>
                        v{DeviceInfo.getVersion()} #{DeviceInfo.getBuildNumber()}
                    </Text>
                </YStack>
            </SafeAreaView>

            <YStack position='absolute' top={0} right={0} pt={insets.top}>
                <Button onPress={handleOpenInstanceLink} bg='transparent'>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faPlug} color='#888' />
                    </Button.Icon>
                </Button>
            </YStack>
        </YStack>
    );
};

export default RoleSelectScreen;
