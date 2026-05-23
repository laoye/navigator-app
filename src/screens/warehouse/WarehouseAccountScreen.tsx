import React from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack, Separator, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRightFromBracket, faUser, faGlobe, faPalette, faBroom, faChevronRight, faTruck } from '@fortawesome/free-solid-svg-icons';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import useAppTheme from '../../hooks/use-app-theme';
import useRoleSwitch from '../../hooks/use-role-switch';
import { showActionSheet } from '../../utils';
import storage from '../../utils/storage';

/**
 * 仓库员工账户 Tab：身份信息 + 设置 + 退出。
 *
 * 设计说明：
 * - 与司机端 DriverAccountScreen 对齐：语言/主题切换走 showActionSheet（底部弹出，
 *   而非系统 Alert），并补充清除缓存。共享 AccountScreen.* 的 i18n key 避免重复。
 * - "退出登录" 同时清掉 token + activeRole，下一次进入 App 直接回 RoleSelect。
 */
const LANGUAGE_LABELS: Record<string, string> = {
    en: 'English',
    zh: '简体中文',
};

// 清缓存时保留的 key（登录态、角色、语言、连接配置等），与 DriverAccountScreen 一致
const PRESERVED_KEYS = new Set([
    '_driver_token',
    'driver',
    '_warehouse_token',
    '_warehouse_staff',
    '_active_role',
    '_locale',
    '_instance_link_config',
    'organizations',
]);

const WarehouseAccountScreen = () => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { staff } = useWarehouseAuth();
    const { locale, setLocale, languages, t } = useLanguage();
    const { userColorScheme, changeScheme, schemes, isDarkMode } = useAppTheme();
    const { switchToDriver, signOutWarehouse } = useRoleSwitch();

    const handleLogout = () => {
        Alert.alert(t('WarehouseAccountScreen.signOut'), t('WarehouseAccountScreen.confirmSignOut'), [
            { text: t('WarehouseAccountScreen.cancel'), style: 'cancel' },
            {
                text: t('WarehouseAccountScreen.signOutConfirm'),
                style: 'destructive',
                // 仅退仓库端：若司机端仍登录则自动切过去，否则回 RoleSelect（见 useRoleSwitch）
                onPress: () => signOutWarehouse(),
            },
        ]);
    };

    const handlePickLanguage = () => {
        const list = languages?.length ? languages : [{ code: 'en', native: 'English' }, { code: 'zh', native: '简体中文' }];
        const options = [...list.map((lang: any) => lang.native ?? LANGUAGE_LABELS[lang.code] ?? lang.code), t('common.cancel')];
        showActionSheet({
            options,
            cancelButtonIndex: options.length - 1,
            onSelect: (buttonIndex) => {
                if (buttonIndex !== options.length - 1) {
                    const selected = list[buttonIndex];
                    setLocale(selected.code);
                    toast.success(t('AccountScreen.languageChanged', { selectedLanguage: selected.native ?? selected.code }), {
                        position: ToastPosition.BOTTOM,
                    });
                }
            },
        });
    };

    const handleSelectScheme = () => {
        const options = [...schemes.map((scheme) => t(`AccountScreen.themeOptions.${scheme}`)), t('common.cancel')];
        showActionSheet({
            options,
            cancelButtonIndex: options.length - 1,
            onSelect: (buttonIndex) => {
                if (buttonIndex !== options.length - 1) {
                    const selectedScheme = schemes[buttonIndex];
                    changeScheme(selectedScheme);
                    toast.success(t('AccountScreen.schemeChanged', { selectedScheme: t(`AccountScreen.themeOptions.${selectedScheme}`) }), {
                        position: ToastPosition.BOTTOM,
                    });
                }
            },
        });
    };

    const handleClearCache = () => {
        for (const key of storage.getAllKeys()) {
            if (!PRESERVED_KEYS.has(key) && !key.startsWith('_instance_link')) {
                storage.delete(key);
            }
        }
        toast.success(t('AccountScreen.cacheCleared'), { position: ToastPosition.BOTTOM });
    };

    const settingRows = [
        {
            key: 'language',
            icon: faGlobe,
            label: t('WarehouseAccountScreen.language'),
            value: LANGUAGE_LABELS[locale] ?? locale,
            onPress: handlePickLanguage,
        },
        {
            key: 'theme',
            icon: faPalette,
            label: t('AccountScreen.theme'),
            value: t(`AccountScreen.themeOptions.${userColorScheme}`),
            onPress: handleSelectScheme,
        },
        {
            key: 'clearCache',
            icon: faBroom,
            label: t('AccountScreen.clearCache'),
            value: null,
            onPress: handleClearCache,
        },
    ];

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.background.val }}
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
                    bg={isDarkMode ? '$green-900' : '$green-200'}
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
                    <Text mt='$1' color={isDarkMode ? '$green-400' : '$green-700'} fontSize='$2'>
                        {staff.role === 'admin' ? t('WarehouseAccountScreen.roleAdmin') : t('WarehouseAccountScreen.roleWarehouse')}
                    </Text>
                )}
            </YStack>

            {/* 设置 */}
            <Text fontSize='$2' color='$textSecondary' mb='$2' ml='$2'>
                {t('WarehouseAccountScreen.settings')}
            </Text>
            <YStack
                bg='$surface'
                borderRadius='$4'
                borderWidth={1}
                borderColor='$borderColor'
                mb='$5'
                overflow='hidden'
            >
                {settingRows.map((row, index) => (
                    <React.Fragment key={row.key}>
                        {index > 0 && <Separator borderColor='$borderColor' />}
                        <Pressable
                            onPress={row.onPress}
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? theme.background.val : 'transparent',
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            })}
                        >
                            <XStack alignItems='center' space='$3' flex={1}>
                                <FontAwesomeIcon icon={row.icon} color={theme.textSecondary.val} size={14} />
                                <Text color='$textPrimary' fontSize='$4'>
                                    {row.label}
                                </Text>
                            </XStack>
                            <XStack alignItems='center' space='$2'>
                                {row.value ? (
                                    <Text color='$textSecondary' fontSize='$3'>
                                        {row.value}
                                    </Text>
                                ) : null}
                                <FontAwesomeIcon icon={faChevronRight} color={theme.textSecondary.val} size={12} />
                            </XStack>
                        </Pressable>
                    </React.Fragment>
                ))}
            </YStack>

            {/* 切换到司机端：司机端已登录则直接切，未登录则自动落到司机登录入口 */}
            <XStack
                onPress={() => switchToDriver()}
                bg='$surface'
                borderColor='$borderColor'
                borderWidth={1}
                borderRadius='$4'
                paddingVertical='$3'
                paddingHorizontal='$4'
                alignItems='center'
                space='$3'
                mb='$3'
                pressStyle={{ opacity: 0.85 }}
            >
                <FontAwesomeIcon icon={faTruck} color={theme.textSecondary.val} size={14} />
                <Text color='$textPrimary' fontSize='$4' fontWeight='600'>
                    {t('WarehouseAccountScreen.switchToDriver')}
                </Text>
            </XStack>

            {/* 退出 */}
            <XStack
                onPress={handleLogout}
                bg={isDarkMode ? '$red-900' : '$red-100'}
                borderColor={isDarkMode ? '$red-700' : '$red-300'}
                borderWidth={1}
                borderRadius='$4'
                paddingVertical='$3'
                paddingHorizontal='$4'
                alignItems='center'
                space='$3'
                pressStyle={{ bg: isDarkMode ? '$red-800' : '$red-200' }}
            >
                <FontAwesomeIcon icon={faRightFromBracket} color={isDarkMode ? '#fca5a5' : '#dc2626'} size={14} />
                <Text color={isDarkMode ? '$red-200' : '$red-700'} fontSize='$4' fontWeight='600'>
                    {t('WarehouseAccountScreen.signOut')}
                </Text>
            </XStack>
        </ScrollView>
    );
};

export default WarehouseAccountScreen;
