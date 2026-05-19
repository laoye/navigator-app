import React, { useMemo } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRightFromBracket, faUser, faGlobe, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 仓库员工账户 Tab：身份信息 + 设置 + 退出。
 *
 * 设计说明：
 * - "退出登录" 同时清掉 token + activeRole，下一次进入 App 直接回 RoleSelect。
 *   原 "切换身份" 与 "退出登录" 区别极小，合并为单一按钮。
 * - 设置：目前只有一项 "语言"，未来扩展（主题 / 关于）也放在这里。
 */
const LANGUAGE_LABELS: Record<string, string> = {
    en: 'English',
    zh: '简体中文',
};

const WarehouseAccountScreen = () => {
    const insets = useSafeAreaInsets();
    const { staff, logoutWarehouse, setActiveRole } = useWarehouseAuth();
    const { locale, setLocale, languages, t } = useLanguage();

    const availableLanguages = useMemo(
        () => (languages?.length ? languages : [{ code: 'en' }, { code: 'zh' }]),
        [languages]
    );

    const handleLogout = () => {
        Alert.alert(t('WarehouseAccountScreen.signOut'), t('WarehouseAccountScreen.confirmSignOut'), [
            { text: t('WarehouseAccountScreen.cancel'), style: 'cancel' },
            {
                text: t('WarehouseAccountScreen.signOutConfirm'),
                style: 'destructive',
                onPress: () => {
                    logoutWarehouse();
                    setActiveRole(null);
                },
            },
        ]);
    };

    const handlePickLanguage = () => {
        const buttons = availableLanguages.map((lng: { code: string }) => ({
            text: LANGUAGE_LABELS[lng.code] ?? lng.code,
            onPress: () => setLocale(lng.code),
        }));
        Alert.alert(t('WarehouseAccountScreen.languageSelectTitle'), t('WarehouseAccountScreen.languageSelectMessage'), [
            ...buttons,
            { text: t('WarehouseAccountScreen.cancel'), style: 'cancel' as const },
        ]);
    };

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}
        >
            {/* 身份卡片 */}
            <YStack alignItems='center' mt='$4' mb='$6'>
                <YStack
                    width={72}
                    height={72}
                    borderRadius={36}
                    alignItems='center'
                    justifyContent='center'
                    bg='$green-200'
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
                    <Text mt='$1' color='$green-700' fontSize='$2'>
                        {staff.role === 'admin' ? t('WarehouseAccountScreen.roleAdmin') : t('WarehouseAccountScreen.roleWarehouse')}
                    </Text>
                )}
            </YStack>

            {/* 设置 */}
            <Text fontSize='$2' color='$textSecondary' mb='$2' ml='$2'>
                {t('WarehouseAccountScreen.settings')}
            </Text>
            <YStack
                bg='$backgroundStrong'
                borderRadius='$4'
                borderWidth={1}
                borderColor='$borderColor'
                mb='$5'
            >
                <Button
                    size='$4'
                    bg='transparent'
                    onPress={handlePickLanguage}
                    icon={<FontAwesomeIcon icon={faGlobe} color='#6b7280' size={14} />}
                >
                    <XStack flex={1} alignItems='center' justifyContent='space-between'>
                        <Text color='$textPrimary' fontSize='$4'>
                            {t('WarehouseAccountScreen.language')}
                        </Text>
                        <XStack alignItems='center' space='$2'>
                            <Text color='$textSecondary' fontSize='$3'>
                                {LANGUAGE_LABELS[locale] ?? locale}
                            </Text>
                        </XStack>
                    </XStack>
                </Button>
            </YStack>

            {/* 退出 */}
            <Button
                size='$4'
                onPress={handleLogout}
                bg='$red-100'
                borderColor='$red-300'
                borderWidth={1}
                icon={<FontAwesomeIcon icon={faRightFromBracket} color='#dc2626' size={14} />}
            >
                <XStack flex={1} justifyContent='space-between' alignItems='center'>
                    <Text color='$red-700' fontSize='$4'>
                        {t('WarehouseAccountScreen.signOut')}
                    </Text>
                </XStack>
            </Button>
        </ScrollView>
    );
};

export default WarehouseAccountScreen;
