import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, YStack } from 'tamagui';
import { toast } from '@backpackapp-io/react-native-toast';
import { useWarehouseAuth } from '../contexts/WarehouseAuthContext';

/**
 * 仓库员工登录页：邮箱 + 密码 → 调 ForBox `/int/v1/forbox/ops/auth/login`。
 *
 * 登录成功后 WarehouseAuthContext 会写 _warehouse_token + _warehouse_staff
 * 并把 _active_role 设为 warehouse；AppNavigator 顶层 hook 会自动切到
 * WarehouseNavigator。
 */
const WarehouseLoginScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const windowHeight = Dimensions.get('window').height;
    const { loginWarehouse, setActiveRole } = useWarehouseAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim() || !password) return;
        setSubmitting(true);
        try {
            await loginWarehouse(email.trim(), password);
            toast.success('登录成功');
        } catch (err) {
            const msg = err instanceof Error ? err.message : '登录失败';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBackToRoleSelect = () => {
        // 清掉持久化角色让用户重新选择
        setActiveRole(null);
        navigation.navigate('RoleSelect');
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <YStack flex={1} bg='$background'>
                <YStack justifyContent='center' alignItems='center' paddingTop={insets.top} marginTop={windowHeight / 8}>
                    <Image source={require('../../assets/navigator-icon-transparent.png')} style={{ width: 60, height: 60 }} />
                    <Text mt='$3' fontSize='$6' fontWeight='700' color='$textPrimary'>
                        仓库员工登录
                    </Text>
                </YStack>

                <SafeAreaView style={{ flex: 1 }}>
                    <YStack flex={1} px='$5' pt='$6' space='$3'>
                        <YStack space='$1.5'>
                            <Text fontSize='$2' color='$textSecondary'>
                                邮箱
                            </Text>
                            <Input
                                size='$4'
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize='none'
                                keyboardType='email-address'
                                placeholder='you@example.com'
                                editable={!submitting}
                            />
                        </YStack>

                        <YStack space='$1.5'>
                            <Text fontSize='$2' color='$textSecondary'>
                                密码
                            </Text>
                            <Input
                                size='$4'
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                placeholder='••••••••'
                                editable={!submitting}
                            />
                        </YStack>

                        <Button
                            size='$5'
                            onPress={handleSubmit}
                            disabled={submitting || !email.trim() || !password}
                            bg='$green9'
                            pressStyle={{ bg: '$green10' }}
                            mt='$3'
                        >
                            {submitting ? (
                                <Spinner color='white' />
                            ) : (
                                <Text color='white' fontSize='$5' fontWeight='700'>
                                    登录
                                </Text>
                            )}
                        </Button>

                        <Button size='$3' onPress={handleBackToRoleSelect} bg='transparent' disabled={submitting}>
                            <Text color='$textSecondary' fontSize='$3'>
                                切换身份
                            </Text>
                        </Button>
                    </YStack>
                </SafeAreaView>
            </YStack>
        </KeyboardAvoidingView>
    );
};

export default WarehouseLoginScreen;
