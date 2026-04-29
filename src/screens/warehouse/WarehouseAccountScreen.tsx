import React from 'react';
import { Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRightFromBracket, faRotate, faUser } from '@fortawesome/free-solid-svg-icons';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';

/**
 * 仓库员工账户 Tab：身份信息 + 切换身份 / 登出。
 */
const WarehouseAccountScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { staff, logoutWarehouse, setActiveRole } = useWarehouseAuth();

    const handleLogout = () => {
        Alert.alert('退出登录', '确认退出当前账户？', [
            { text: '取消', style: 'cancel' },
            {
                text: '退出',
                style: 'destructive',
                onPress: () => {
                    logoutWarehouse();
                },
            },
        ]);
    };

    const handleSwitchRole = () => {
        Alert.alert('切换身份', '将退出仓库员工账户并返回身份选择', [
            { text: '取消', style: 'cancel' },
            {
                text: '继续',
                onPress: () => {
                    logoutWarehouse();
                    setActiveRole(null);
                    // AppNavigator 检测 activeRole=null 后会回到 RoleSelect
                },
            },
        ]);
    };

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}
        >
            <YStack alignItems='center' mt='$4' mb='$6'>
                <YStack
                    width={72}
                    height={72}
                    borderRadius={36}
                    alignItems='center'
                    justifyContent='center'
                    bg='$green4'
                    mb='$3'
                >
                    <FontAwesomeIcon icon={faUser} color='#10b981' size={28} />
                </YStack>
                <Text fontSize='$7' fontWeight='800' color='$textPrimary'>
                    {staff?.name ?? '—'}
                </Text>
                <Text mt='$1' color='$textSecondary' fontSize='$3'>
                    {staff?.email ?? ''}
                </Text>
                {staff?.role && (
                    <Text mt='$1' color='$green11' fontSize='$2'>
                        {staff.role === 'admin' ? '管理员' : '仓库员工'}
                    </Text>
                )}
            </YStack>

            <YStack space='$2'>
                <Button
                    size='$4'
                    onPress={handleSwitchRole}
                    bg='$backgroundStrong'
                    borderColor='$borderColor'
                    borderWidth={1}
                    icon={<FontAwesomeIcon icon={faRotate} color='#888' size={14} />}
                >
                    <XStack flex={1} justifyContent='space-between' alignItems='center'>
                        <Text color='$textPrimary' fontSize='$4'>
                            切换身份
                        </Text>
                    </XStack>
                </Button>

                <Button
                    size='$4'
                    onPress={handleLogout}
                    bg='$red3'
                    borderColor='$red7'
                    borderWidth={1}
                    icon={<FontAwesomeIcon icon={faRightFromBracket} color='#dc2626' size={14} />}
                >
                    <XStack flex={1} justifyContent='space-between' alignItems='center'>
                        <Text color='$red11' fontSize='$4'>
                            退出登录
                        </Text>
                    </XStack>
                </Button>
            </YStack>
        </ScrollView>
    );
};

export default WarehouseAccountScreen;
