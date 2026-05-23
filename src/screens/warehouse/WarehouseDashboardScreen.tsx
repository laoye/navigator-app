import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowDown,
    faArrowUp,
    faBoxesStacked,
    faClock,
    faRoute,
    faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import useAppTheme from '../../hooks/use-app-theme';
import {
    fetchOperationsStats,
    type WarehouseListMode,
    type WarehouseStats,
} from '../../warehouse/warehouseApi';

interface BentoPalette {
    color: string;
    bg: string;
}

interface BentoSpec {
    key: 'pending_inbound' | 'in_warehouse' | 'pending_outbound';
    labelKey: string;
    icon: any;
    /** 亮色：浅彩底 + 深彩字。暗色：半透明彩色玻璃底 + 亮彩字，保留色相语义。 */
    light: BentoPalette;
    dark: BentoPalette;
    mode: WarehouseListMode;
}

const BENTO: BentoSpec[] = [
    { key: 'pending_inbound', labelKey: 'WarehouseDashboardScreen.pendingInbound', icon: faArrowDown, light: { color: '#1d4ed8', bg: '#dbeafe' }, dark: { color: '#60a5fa', bg: '#3b82f622' }, mode: 'pending_inbound' },
    { key: 'in_warehouse', labelKey: 'WarehouseDashboardScreen.inWarehouse', icon: faBoxesStacked, light: { color: '#6d28d9', bg: '#ede9fe' }, dark: { color: '#a78bfa', bg: '#8b5cf622' }, mode: 'in_warehouse' },
    { key: 'pending_outbound', labelKey: 'WarehouseDashboardScreen.pendingOutbound', icon: faArrowUp, light: { color: '#c2410c', bg: '#ffedd5' }, dark: { color: '#fb923c', bg: '#f9731622' }, mode: 'pending_outbound' },
];

/** 紫色强调（平均仓留 / 路线在库）。暗色用更亮的紫以保证对比度。 */
const accentPurple = (isDark: boolean) => (isDark ? '#a78bfa' : '#6d28d9');

const WarehouseDashboardScreen = () => {
    const navigation = useNavigation<any>();
    const { resolveConnectionConfig } = useConfig();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { isDarkMode } = useAppTheme();
    const purple = accentPurple(isDarkMode);

    const [stats, setStats] = useState<WarehouseStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const load = useCallback(async () => {
        const host = resolveConnectionConfig('FLEETBASE_HOST');
        if (!host) {
            setError(t('common.errors.fleetbaseHostNotConfigured'));
            return;
        }
        setLoading(true);
        try {
            const resp = await fetchOperationsStats(String(host));
            setStats(resp.data ?? {});
            setLastRefresh(new Date());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('common.errors.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [resolveConnectionConfig]);

    useEffect(() => {
        load();
        const t = setInterval(load, 2 * 60 * 1000);
        return () => clearInterval(t);
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const openList = (mode?: WarehouseListMode) => {
        if (!mode) return;
        navigation.navigate('WarehouseList', { mode });
    };

    const routeInv = stats?.route_inventory ?? [];
    const dailyPickups = stats?.daily_pickups ?? [];

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.background.val }}
            contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 14, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <XStack alignItems='flex-start' justifyContent='space-between'>
                <YStack>
                    <Text fontSize='$8' fontWeight='800' color='$textPrimary'>
                        {t('WarehouseDashboardScreen.title')}
                    </Text>
                    <Text mt='$1' color='$textSecondary' fontSize='$2'>
                        {lastRefresh
                            ? t('WarehouseDashboardScreen.lastRefresh', {
                                  time: lastRefresh.toLocaleTimeString(undefined, { hour12: false }),
                              })
                            : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                </YStack>
                <Button
                    chromeless
                    size='$3'
                    onPress={load}
                    disabled={loading}
                    icon={<FontAwesomeIcon icon={faRotate} color={theme.textSecondary.val} size={14} />}
                />
            </XStack>

            {error && (
                <YStack mt='$3' p='$3' bg={isDarkMode ? '$red-900' : '$red-100'} borderRadius='$3'>
                    <Text color={isDarkMode ? '$red-200' : '$red-700'} fontSize='$3'>
                        {error}
                    </Text>
                </YStack>
            )}

            {/* 待入库 / 在库 / 待出库 三连卡（可点击进列表） */}
            <XStack mt='$4' space='$2'>
                {BENTO.map((s) => (
                    <BentoCard
                        key={s.key}
                        spec={s}
                        label={t(s.labelKey)}
                        value={stats?.[s.key] as number | undefined}
                        onPress={() => openList(s.mode)}
                    />
                ))}
            </XStack>

            {/* 平均仓留 + 近7日揽件 */}
            <XStack mt='$4' space='$2'>
                <YStack
                    flex={1}
                    bg='$surface'
                    borderRadius='$4'
                    borderWidth={1}
                    borderColor='$borderColor'
                    p='$3'
                >
                    <XStack alignItems='center' space='$2' mb='$2'>
                        <FontAwesomeIcon icon={faClock} color={purple} size={14} />
                        <Text fontSize='$2' color='$textSecondary'>
                            {t('WarehouseDashboardScreen.avgDwell')}
                        </Text>
                    </XStack>
                    <XStack alignItems='baseline' space='$1'>
                        <Text fontSize='$8' fontWeight='800' color={purple} tabularFigures>
                            {stats?.avg_dwell_hours ?? 0}
                        </Text>
                        <Text color='$textSecondary' fontSize='$3'>
                            {t('WarehouseDashboardScreen.avgDwellUnit')}
                        </Text>
                    </XStack>
                </YStack>

                <YStack
                    flex={1.4}
                    bg='$surface'
                    borderRadius='$4'
                    borderWidth={1}
                    borderColor='$borderColor'
                    p='$3'
                >
                    <Text fontSize='$2' color='$textSecondary' mb='$2'>
                        {t('WarehouseDashboardScreen.last7DaysPickups')}
                    </Text>
                    <Sparkline data={dailyPickups} />
                </YStack>
            </XStack>

            {/* 路线在库分布 */}
            <YStack mt='$4'>
                <XStack alignItems='center' space='$2' mb='$2'>
                    <FontAwesomeIcon icon={faRoute} color={theme.textSecondary.val} size={14} />
                    <Text fontSize='$3' fontWeight='600' color='$textSecondary'>
                        {t('WarehouseDashboardScreen.routeInventory')}
                    </Text>
                </XStack>
                {routeInv.length === 0 ? (
                    <YStack
                        bg='$surface'
                        borderRadius='$3'
                        borderWidth={1}
                        borderColor='$borderColor'
                        py='$4'
                        alignItems='center'
                    >
                        <Text color='$textSecondary' fontSize='$2'>
                            {t('WarehouseDashboardScreen.noInventory')}
                        </Text>
                    </YStack>
                ) : (
                    <YStack space='$1.5'>
                        {routeInv.slice(0, 10).map((r) => (
                            <XStack
                                key={r.route_code ?? 'no-route'}
                                bg='$surface'
                                borderRadius='$3'
                                borderWidth={1}
                                borderColor='$borderColor'
                                px='$3'
                                py='$2.5'
                                alignItems='center'
                                justifyContent='space-between'
                            >
                                <Text fontSize='$3' fontWeight='600' color='$textPrimary'>
                                    {r.route_code || t('WarehouseDashboardScreen.unassignedRoute')}
                                </Text>
                                <Text fontSize='$4' fontWeight='700' color={purple} tabularFigures>
                                    {t('WarehouseDashboardScreen.pieces', { count: r.count })}
                                </Text>
                            </XStack>
                        ))}
                    </YStack>
                )}
            </YStack>
        </ScrollView>
    );
};

function BentoCard({
    spec,
    label,
    value,
    onPress,
}: {
    spec: BentoSpec;
    label: string;
    value: number | undefined;
    onPress?: () => void;
}) {
    const { isDarkMode } = useAppTheme();
    const palette = isDarkMode ? spec.dark : spec.light;
    return (
        <Button
            flex={1}
            height={120}
            bg={palette.bg}
            borderColor={palette.color + (isDarkMode ? '55' : '33')}
            borderWidth={1}
            borderRadius='$4'
            onPress={onPress}
            pressStyle={{ opacity: 0.85 }}
            p='$3'
            unstyled={false}
        >
            <YStack flex={1} width='100%' justifyContent='space-between'>
                <XStack alignItems='center' justifyContent='space-between'>
                    <Text fontSize='$2' color={palette.color} fontWeight='600'>
                        {label}
                    </Text>
                    <FontAwesomeIcon icon={spec.icon} color={palette.color} size={14} />
                </XStack>
                <Text fontSize='$10' fontWeight='800' color={palette.color} tabularFigures lineHeight={44}>
                    {value ?? 0}
                </Text>
            </YStack>
        </Button>
    );
}

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
    const { isDarkMode } = useAppTheme();
    if (!data.length) {
        return (
            <Text color='$textSecondary' fontSize='$2'>
                —
            </Text>
        );
    }
    const barColor = isDarkMode ? '#a78bfa99' : '#7c3aed99';
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <XStack height={48} alignItems='flex-end' space={4}>
            {data.map((d) => {
                const h = Math.max(Math.round((d.count / max) * 100), 4);
                return (
                    <View
                        key={d.date}
                        style={{
                            flex: 1,
                            height: `${h}%`,
                            backgroundColor: barColor,
                            borderTopLeftRadius: 3,
                            borderTopRightRadius: 3,
                        }}
                    />
                );
            })}
        </XStack>
    );
}

export default WarehouseDashboardScreen;
