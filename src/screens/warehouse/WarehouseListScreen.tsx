import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowLeft,
    faLocationDot,
    faRoute,
    faBoxesStacked,
    faStore,
} from '@fortawesome/free-solid-svg-icons';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    fetchOrders,
    presentRow,
    type WarehouseListMode,
    type WarehouseOrderRow,
    type WarehouseListResponse,
} from '../../warehouse/warehouseApi';

const MODE_LABEL_KEYS: Record<WarehouseListMode, string> = {
    pending_inbound: 'WarehouseListScreen.pendingInbound',
    in_warehouse: 'WarehouseListScreen.inWarehouse',
    pending_outbound: 'WarehouseListScreen.pendingOutbound',
};

type ParamList = {
    WarehouseList: { mode: WarehouseListMode };
};

const PER_PAGE = 20;

/**
 * 仓库订单列表 —— 一个屏幕服三种模式（待入库 / 在库 / 待出库）。
 *
 * - 通过 navigation 参数 mode 切换
 * - 顶部分段按钮可在三种模式间快速跳转
 * - in_warehouse 模式支持分页，其余模式一次返回
 */
const WarehouseListScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<ParamList, 'WarehouseList'>>();
    const { resolveConnectionConfig } = useConfig();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    const mode = (route.params?.mode ?? 'in_warehouse') as WarehouseListMode;

    const [rows, setRows] = useState<WarehouseOrderRow[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const load = useCallback(
        async (targetPage: number, append: boolean) => {
            const host = resolveConnectionConfig('FLEETBASE_HOST');
            if (!host) {
                setError('Fleetbase host not configured');
                return;
            }
            setLoading(true);
            try {
                const resp: WarehouseListResponse = await fetchOrders(String(host), mode, targetPage, PER_PAGE);
                const fetched = extractRows(resp);
                setRows((prev) => (append ? [...prev, ...fetched] : fetched));
                setPage(targetPage);
                const total = extractTotal(resp);
                setHasMore(append ? rows.length + fetched.length < total : fetched.length < total);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'load failed');
            } finally {
                setLoading(false);
            }
        },
        [mode, resolveConnectionConfig, rows.length]
    );

    useEffect(() => {
        setRows([]);
        setPage(1);
        setHasMore(true);
        load(1, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load(1, false);
        setRefreshing(false);
    }, [load]);

    const onEndReached = useCallback(async () => {
        if (loading || !hasMore || mode !== 'in_warehouse') return;
        await load(page + 1, true);
    }, [loading, hasMore, page, mode, load]);

    const presented = useMemo(() => rows.map(presentRow), [rows]);
    const filtered = useMemo(() => {
        if (!query.trim()) return presented;
        const q = query.trim().toLowerCase();
        return presented.filter(
            (p) =>
                p.trackingNumber.toLowerCase().includes(q) ||
                p.merchantName.toLowerCase().includes(q) ||
                p.merchantOrderNo.toLowerCase().includes(q) ||
                p.destCity.toLowerCase().includes(q) ||
                p.publicId.toLowerCase().includes(q)
        );
    }, [presented, query]);

    const switchMode = (m: WarehouseListMode) => {
        if (m === mode) return;
        navigation.setParams({ mode: m });
    };

    return (
        <YStack flex={1} pt={insets.top + 8} px='$4' bg='$background'>
            <XStack alignItems='center' mb='$2'>
                <Button
                    size='$3'
                    chromeless
                    onPress={() => navigation.goBack()}
                    icon={<FontAwesomeIcon icon={faArrowLeft} color='#888' size={16} />}
                />
                <Text ml='$2' fontSize='$7' fontWeight='800' color='$textPrimary' flex={1}>
                    {t(MODE_LABEL_KEYS[mode])} {rows.length > 0 ? `· ${rows.length}` : ''}
                </Text>
            </XStack>

            <XStack mb='$3' space='$2'>
                {(['pending_inbound', 'in_warehouse', 'pending_outbound'] as WarehouseListMode[]).map((m) => {
                    const active = m === mode;
                    return (
                        <Button
                            key={m}
                            flex={1}
                            size='$3'
                            bg={active ? '$blue-600' : '$backgroundStrong'}
                            borderColor='$borderColor'
                            borderWidth={1}
                            onPress={() => switchMode(m)}
                        >
                            <Text color={active ? 'white' : '$textPrimary'} fontWeight='600' fontSize='$2'>
                                {t(MODE_LABEL_KEYS[m])}
                            </Text>
                        </Button>
                    );
                })}
            </XStack>

            <Input
                size='$4'
                value={query}
                onChangeText={setQuery}
                placeholder={t('WarehouseListScreen.searchPlaceholder')}
                autoCapitalize='none'
                autoCorrect={false}
                mb='$3'
            />

            {error && (
                <YStack p='$3' bg='$red-100' borderRadius='$3' mb='$3'>
                    <Text color='$red-700'>{error}</Text>
                </YStack>
            )}

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.uuid}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.4}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                            navigation.navigate('WarehouseOrderDetail', { id: item.publicId || item.uuid })
                        }
                    >
                    <YStack
                        py='$3'
                        px='$3'
                        mb='$2'
                        bg='$backgroundStrong'
                        borderRadius='$3'
                        borderWidth={1}
                        borderColor='$borderColor'
                        space='$1'
                    >
                        <XStack alignItems='center' justifyContent='space-between'>
                            <Text fontSize='$4' fontWeight='700' color='$textPrimary' flex={1} numberOfLines={1}>
                                {item.trackingNumber || item.publicId}
                            </Text>
                            {item.daysInWarehouse != null && mode === 'in_warehouse' && (
                                <Text fontSize='$2' color='$textSecondary' ml='$2'>
                                    {t('WarehouseListScreen.daysInWarehouse', { days: item.daysInWarehouse })}
                                </Text>
                            )}
                        </XStack>

                        {(item.merchantName || item.merchantOrderNo) && (
                            <XStack alignItems='center' space='$1.5'>
                                <FontAwesomeIcon icon={faStore} color='#999' size={11} />
                                <Text fontSize='$2' color='$textSecondary' flex={1} numberOfLines={1}>
                                    {item.merchantName || '—'}
                                    {item.merchantOrderNo ? ` · ${item.merchantOrderNo}` : ''}
                                </Text>
                            </XStack>
                        )}

                        {item.destCity && (
                            <XStack alignItems='center' space='$1.5'>
                                <FontAwesomeIcon icon={faLocationDot} color='#999' size={11} />
                                <Text fontSize='$2' color='$textSecondary' flex={1} numberOfLines={1}>
                                    {item.destCity}
                                </Text>
                            </XStack>
                        )}

                        <XStack alignItems='center' space='$3' flexWrap='wrap'>
                            {item.routeCode && (
                                <XStack alignItems='center' space='$1'>
                                    <FontAwesomeIcon icon={faRoute} color='#999' size={11} />
                                    <Text fontSize='$2' color='$textSecondary'>
                                        {item.routeCode}
                                    </Text>
                                </XStack>
                            )}
                            {(item.packageCount != null || item.weightLbs != null) && (
                                <XStack alignItems='center' space='$1'>
                                    <FontAwesomeIcon icon={faBoxesStacked} color='#999' size={11} />
                                    <Text fontSize='$2' color='$textSecondary'>
                                        {item.packageCount != null ? t('WarehouseListScreen.piecesShort', { count: item.packageCount }) : ''}
                                        {item.weightLbs != null ? ` · ${t('WarehouseListScreen.weightLbs', { weight: item.weightLbs })}` : ''}
                                    </Text>
                                </XStack>
                            )}
                            {item.itemCategory && (
                                <Text fontSize='$2' color='$textSecondary'>
                                    {item.itemCategory}
                                </Text>
                            )}
                        </XStack>
                    </YStack>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    !loading ? (
                        <Text color='$textSecondary' textAlign='center' mt='$6'>
                            {query
                                ? t('WarehouseListScreen.noResult')
                                : `${t('WarehouseListScreen.emptyPrefix')}${t(MODE_LABEL_KEYS[mode])}${t('WarehouseListScreen.emptySuffix')}`}
                        </Text>
                    ) : null
                }
            />
        </YStack>
    );
};

function extractRows(resp: { data?: unknown }): WarehouseOrderRow[] {
    const d = resp.data;
    if (Array.isArray(d)) return d as WarehouseOrderRow[];
    if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>)) {
        const inner = (d as { data?: unknown }).data;
        if (Array.isArray(inner)) return inner as WarehouseOrderRow[];
    }
    return [];
}

function extractTotal(resp: { data?: unknown }): number {
    const d = resp.data;
    if (Array.isArray(d)) return d.length;
    if (d && typeof d === 'object' && 'total' in (d as Record<string, unknown>)) {
        return Number((d as { total?: unknown }).total ?? 0);
    }
    if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>)) {
        const inner = (d as { data?: unknown }).data;
        if (Array.isArray(inner)) return inner.length;
    }
    return 0;
}

export default WarehouseListScreen;
