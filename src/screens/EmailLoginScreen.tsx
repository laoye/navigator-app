import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, YStack } from 'tamagui';
import { toast } from '@backpackapp-io/react-native-toast';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { navigatorConfig } from '../utils';

/**
 * 司机邮箱密码登录（次路径）。
 *
 * 主路径仍是 PhoneLogin (SMS)，此屏由 PhoneLogin 底部入口 push 进来。
 * 调 ForBox `/forbox/int/v1/forbox/driver/auth/login`，成功后调用
 * AuthContext.loginByEmail，复用 createDriverSession 写 `_driver_token`
 * 与 driver MMKV，进而触发 AppNavigator 切到 DriverNavigator。
 */
const EmailLoginScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const windowHeight = Dimensions.get('window').height;
    const { loginByEmail, isVerifyingCode } = useAuth();
    const { t } = useLanguage();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim() || !password) return;
        setSubmitting(true);
        try {
            await loginByEmail(email.trim(), password);
        } catch (err) {
            const msg = err instanceof Error ? err.message : t('EmailLoginScreen.invalidEmailOrPassword');
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => navigation.goBack();

    const busy = submitting || isVerifyingCode;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: navigatorConfig('colors.loginBackground') }}>
            <LinearGradient
                colors={['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <YStack flex={1}>
                    <YStack justifyContent='center' alignItems='center' paddingTop={insets.top} marginTop={windowHeight / 10}>
                        <Image source={require('../../assets/navigator-icon-transparent.png')} style={{ width: 60, height: 60 }} />
                        <Text mt='$3' fontSize='$7' fontWeight='800' color='$gray-200'>
                            {t('EmailLoginScreen.title')}
                        </Text>
                    </YStack>

                    <YStack flex={1} px='$5' pt='$6' space='$3'>
                        <YStack space='$1.5'>
                            <Text fontSize='$2' color='$gray-400'>
                                {t('EmailLoginScreen.email')}
                            </Text>
                            <Input
                                size='$4'
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize='none'
                                keyboardType='email-address'
                                placeholder={t('EmailLoginScreen.emailPlaceholder')}
                                editable={!busy}
                                color='white'
                                bg='rgba(255,255,255,0.08)'
                                borderColor='rgba(255,255,255,0.18)'
                                placeholderTextColor='rgba(255,255,255,0.4)'
                            />
                        </YStack>

                        <YStack space='$1.5'>
                            <Text fontSize='$2' color='$gray-400'>
                                {t('EmailLoginScreen.password')}
                            </Text>
                            <Input
                                size='$4'
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                placeholder={t('EmailLoginScreen.passwordPlaceholder')}
                                editable={!busy}
                                color='white'
                                bg='rgba(255,255,255,0.08)'
                                borderColor='rgba(255,255,255,0.18)'
                                placeholderTextColor='rgba(255,255,255,0.4)'
                            />
                        </YStack>

                        <Button
                            size='$5'
                            onPress={handleSubmit}
                            disabled={busy || !email.trim() || !password}
                            bg='$primary'
                            mt='$3'
                            rounded
                        >
                            {busy ? (
                                <Spinner color='white' />
                            ) : (
                                <Text color='white' fontSize='$5' fontWeight='700'>
                                    {t('EmailLoginScreen.submit')}
                                </Text>
                            )}
                        </Button>

                        <Button size='$3' onPress={handleBack} bg='transparent' disabled={busy}>
                            <Text color='$gray-400' fontSize='$3'>
                                {t('EmailLoginScreen.backToSms')}
                            </Text>
                        </Button>
                    </YStack>
                </YStack>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default EmailLoginScreen;
