import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCheck, faBoxesStacked, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Order } from '@fleetbase/sdk';
import { toast } from '../utils/toast';
import { useOrderManager } from '../contexts/OrderManagerContext';
import { useLanguage } from '../contexts/LanguageContext';
import useFleetbase from '../hooks/use-fleetbase';
import useAppTheme from '../hooks/use-app-theme';
import BarcodeScanner from '../components/BarcodeScanner';

/**
 * 司机端"取货清单"页（§8.4.3）
 *
 * 司机到达某仓库后，按 payload.pickup 聚合本人活跃订单，逐件扫码（capture-qr）
 * 标记已确认；全部完成后批量推进至下一活动（通常是 picked_up）。
 *
 * MVP 切片：
 * - 摄像头扫码占位 + 手动输入运单号
 * - 仅显示当前用户的 allActiveOrders 中处于 dispatched / started 状态的单
 * - 方式 B（meta.inbound_method=merchant_dropoff）订单不在此清单中（这些订单由商家送仓）
 *
 * 顶层 RootStack 注册名：'PickupChecklist'。
 */

interface PickupGroup {
    pickupKey: string;
    pickupName: string;
    pickupStreet: string;
    pickupCityState: string;
    orders: Order[];
}

const TARGET_STATUSES = new Set(['dispatched', 'started']);

const PickupChecklistScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { isDarkMode } = useAppTheme();
    const { adapter } = useFleetbase();
    const { allActiveOrders, reloadActiveOrders, isFetchingActiveOrders } = useOrderManager();
    const { t } = useLanguage();

    const [selectedPickupKey, setSelectedPickupKey] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [scannedOrderIds, setScannedOrderIds] = useState<Set<string>>(new Set());
    const [advancing, setAdvancing] = useState(false);

    useEffect(() => {
        reloadActiveOrders?.();
    }, [reloadActiveOrders]);

    const groups = useMemo<PickupGroup[]>(() => {
        const map = new Map<string, PickupGroup>();
        for (const order of allActiveOrders ?? []) {
            const status = order.getAttribute('status');
            const meta = order.getAttribute('meta') ?? {};
            if (!TARGET_STATUSES.has(status)) continue;
            if (meta.inbound_method === 'merchant_dropoff') continue; // 方式 B 由商家送仓

            const pickup = order.getAttribute('payload.pickup');
            // 与 DriverOrderManagementScreen 入口卡过滤保持一致：没有 pickup 地点的孤儿订单不进批量清单
            // （这类订单业务上是异常数据，司机无法判断去哪取货）
            if (!pickup) continue;

            const key = pickup.id ?? pickup.uuid ?? pickup.street1 ?? 'no-pickup';
            const name = pickup.name ?? pickup.street1 ?? t('PickupChecklistScreen.noPickupSpecified');
            // 拆 2 行：第一行街道，第二行 city, state zip — 提升可读性
            const street = pickup.street1 ?? '';
            const cityState = [pickup.city, pickup.province, pickup.postal_code].filter(Boolean).join(', ');

            if (!map.has(key)) {
                map.set(key, { pickupKey: key, pickupName: name, pickupStreet: street, pickupCityState: cityState, orders: [] });
            }
            map.get(key)!.orders.push(order);
        }
        return Array.from(map.values()).sort((a, b) => b.orders.length - a.orders.length);
    }, [allActiveOrders]);

    const totalOrdersAcrossGroups = useMemo(
        () => groups.reduce((sum, g) => sum + g.orders.length, 0),
        [groups]
    );

    const selectedGroup = useMemo(
        () => groups.find((g) => g.pickupKey === selectedPickupKey) ?? null,
        [groups, selectedPickupKey]
    );

    const matchOrderByCode = useCallback(
        (raw: string) => {
            if (!selectedGroup) return null;
            const trimmed = raw.trim().toUpperCase();
            if (!trimmed) return null;
            return (
                selectedGroup.orders.find((o) => {
                    const tn = (o.getAttribute('tracking_number')?.tracking_number ?? '').toUpperCase();
                    const pid = (o.getAttribute('public_id') ?? '').toUpperCase();
                    return tn === trimmed || pid === trimmed;
                }) ?? null
            );
        },
        [selectedGroup]
    );

    const submitScan = useCallback(
        async (raw: string) => {
            if (!adapter) return;
            if (!selectedGroup) return;
            const trimmed = raw.trim();
            if (!trimmed) return;

            const matched = matchOrderByCode(trimmed);
            if (!matched) {
                toast.error(t('PickupChecklistScreen.notInChecklist'));
                return;
            }
            if (scannedOrderIds.has(matched.id)) {
                toast.error(t('PickupChecklistScreen.alreadyScanned'));
                return;
            }

            setSubmitting(true);
            try {
                await adapter.post(`orders/${matched.id}/capture-qr`, { raw_data: trimmed });
                setScannedOrderIds((prev) => new Set(prev).add(matched.id));
                setCode('');
                toast.success(t('PickupChecklistScreen.confirmed', { code: trimmed }));
            } catch (err) {
                const msg = err instanceof Error ? err.message : t('WarehouseScanScreen.failed');
                toast.error(msg);
            } finally {
                setSubmitting(false);
            }
        },
        [adapter, selectedGroup, matchOrderByCode, scannedOrderIds]
    );

    const handleSubmitScan = () => submitScan(code);

    const handleScanned = useCallback(
        (value: string) => {
            if (submitting) return;
            setCode(value);
            submitScan(value);
        },
        [submitScan, submitting]
    );

    const handleAdvanceAll = async () => {
        if (!selectedGroup) return;
        if (scannedOrderIds.size === 0) {
            toast.error(t('PickupChecklistScreen.scanFirst'));
            return;
        }

        const targets = selectedGroup.orders.filter((o) => scannedOrderIds.has(o.id));
        const remaining = selectedGroup.orders.length - targets.length;

        const confirmAdvance = async () => {
            setAdvancing(true);
            let success = 0;
            let failure = 0;
            for (const order of targets) {
                try {
                    const next = await order.getNextActivity();
                    await order.updateActivity({ activity: next });
                    success++;
                } catch (err) {
                    failure++;
                    console.warn('[PickupChecklist] advance failed:', err);
                }
            }
            setAdvancing(false);
            if (failure === 0) {
                toast.success(t('PickupChecklistScreen.advanceDone', { count: success }));
                setScannedOrderIds(new Set());
                setSelectedPickupKey(null);
                reloadActiveOrders?.();
                navigation.goBack();
            } else {
                toast.error(t('PickupChecklistScreen.advanceMixed', { success, failure }));
                reloadActiveOrders?.();
            }
        };

        if (remaining > 0) {
            Alert.alert(
                t('PickupChecklistScreen.partialTitle'),
                t('PickupChecklistScreen.partialMessage', { remaining, scanned: targets.length }),
                [
                    { text: t('PickupChecklistScreen.cancel'), style: 'cancel' },
                    { text: t('PickupChecklistScreen.continue'), onPress: confirmAdvance },
                ]
            );
        } else {
            confirmAdvance();
        }
    };

    if (!selectedGroup) {
        return (
            <YStack flex={1} pt={insets.top + 12} bg='$surface'>
                <XStack alignItems='center' px='$3' mb='$2'>
                    <Button
                        onPress={() => navigation.goBack()}
                        bg='transparent'
                        size='$3'
                        icon={<FontAwesomeIcon icon={faArrowLeft} color='#888' size={16} />}
                    />
                    <Text fontSize='$6' fontWeight='800' color='$textPrimary' ml='$2'>
                        {t('PickupChecklistScreen.title')}
                    </Text>
                </XStack>

                {/* 顶部总览：总仓库数 + 总待取单数 */}
                {groups.length > 0 ? (
                    <XStack mx='$3' mb='$3' p='$3' bg='$background' borderRadius='$4' borderWidth={1} borderColor='$borderColor' alignItems='center' gap='$3'>
                        <XStack
                            width={40}
                            height={40}
                            borderRadius='$3'
                            bg={isDarkMode ? '$info' : '$blue-600'}
                            alignItems='center'
                            justifyContent='center'
                        >
                            <FontAwesomeIcon icon={faBoxesStacked} color={isDarkMode ? theme.textPrimary.val : theme.surface.val} size={18} />
                        </XStack>
                        <YStack flex={1}>
                            <Text fontSize='$4' fontWeight='700' color='$textPrimary'>
                                {t('PickupChecklistScreen.summaryTitle', { orders: totalOrdersAcrossGroups })}
                            </Text>
                            <Text fontSize='$2' color='$textSecondary'>
                                {t('PickupChecklistScreen.summarySubtitle', { locations: groups.length })}
                            </Text>
                        </YStack>
                    </XStack>
                ) : (
                    <Text px='$4' color='$textSecondary' fontSize='$3' mb='$3'>
                        {t('PickupChecklistScreen.subtitle')}
                    </Text>
                )}

                <FlatList
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32 }}
                    ItemSeparatorComponent={() => <YStack height={10} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={!!isFetchingActiveOrders}
                            onRefresh={() => reloadActiveOrders?.()}
                        />
                    }
                    data={groups}
                    keyExtractor={(g) => g.pickupKey}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => {
                                setSelectedPickupKey(item.pickupKey);
                                setScannedOrderIds(new Set());
                            }}
                        >
                            <XStack
                                p='$3'
                                bg='$background'
                                borderRadius='$4'
                                borderWidth={1}
                                borderColor='$borderColor'
                                alignItems='center'
                                gap='$3'
                            >
                                {/* 左侧仓库图标 */}
                                <XStack
                                    width={44}
                                    height={44}
                                    borderRadius='$3'
                                    bg={isDarkMode ? '$info' : '$blue-600'}
                                    alignItems='center'
                                    justifyContent='center'
                                >
                                    <FontAwesomeIcon icon={faBoxesStacked} color={isDarkMode ? theme.textPrimary.val : theme.surface.val} size={18} />
                                </XStack>

                                {/* 中间仓库信息 */}
                                <YStack flex={1} gap='$1'>
                                    <Text fontSize='$4' fontWeight='700' color='$textPrimary' numberOfLines={1}>
                                        {item.pickupName}
                                    </Text>
                                    {item.pickupStreet ? (
                                        <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                                            {item.pickupStreet}
                                        </Text>
                                    ) : null}
                                    {item.pickupCityState ? (
                                        <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                                            {item.pickupCityState}
                                        </Text>
                                    ) : null}
                                </YStack>

                                {/* 右侧数量徽标 + chevron */}
                                <XStack alignItems='center' gap='$2'>
                                    <YStack alignItems='center' justifyContent='center' minWidth={48}>
                                        <Text fontSize='$7' fontWeight='800' color={isDarkMode ? '$blue-400' : '$blue-600'} lineHeight={28}>
                                            {item.orders.length}
                                        </Text>
                                        <Text fontSize={10} color='$textSecondary'>
                                            {t('PickupChecklistScreen.toPickUpUnit')}
                                        </Text>
                                    </YStack>
                                    <FontAwesomeIcon icon={faChevronRight} color={theme['$textSecondary'].val} size={14} />
                                </XStack>
                            </XStack>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <Text textAlign='center' color='$textSecondary' mt='$8'>
                            {t('PickupChecklistScreen.noPickups')}
                        </Text>
                    }
                />
            </YStack>
        );
    }

    // 选择某 pickup 后的扫码界面
    const scannedCount = scannedOrderIds.size;
    const totalCount = selectedGroup.orders.length;
    return (
        <YStack flex={1} pt={insets.top + 12} bg='$surface'>
            {/* 顶部 header：返回 + 仓库名 + 计数 */}
            <XStack alignItems='center' px='$3' mb='$3'>
                <Button
                    onPress={() => {
                        setSelectedPickupKey(null);
                        setScannedOrderIds(new Set());
                        setCode('');
                    }}
                    bg='transparent'
                    size='$3'
                    icon={<FontAwesomeIcon icon={faArrowLeft} color='#888' size={16} />}
                />
                <YStack ml='$2' flex={1}>
                    <Text fontSize='$5' fontWeight='800' color='$textPrimary' numberOfLines={1}>
                        {selectedGroup.pickupName}
                    </Text>
                    <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                        {t('PickupChecklistScreen.countSummary', { total: totalCount, scanned: scannedCount })}
                    </Text>
                </YStack>
            </XStack>

            {/* 卡片 1：扫码 + 手动输入 */}
            <YStack
                mx='$3'
                mb='$3'
                bg='$background'
                borderRadius='$4'
                borderWidth={1}
                borderColor='$borderColor'
                p='$3'
                gap='$3'
            >
                <BarcodeScanner height={200} enabled={!submitting} onScanned={handleScanned} />
                <XStack gap='$2'>
                    <Input
                        flex={1}
                        size='$4'
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize='characters'
                        autoCorrect={false}
                        placeholder={t('PickupChecklistScreen.trackingPlaceholder')}
                        editable={!submitting}
                        onSubmitEditing={handleSubmitScan}
                        returnKeyType='done'
                    />
                    <Button
                        size='$4'
                        onPress={handleSubmitScan}
                        disabled={submitting || !code.trim()}
                        bg='$blue-600'
                        pressStyle={{ opacity: 0.9 }}
                        width={64}
                    >
                        {submitting ? (
                            <Spinner color='white' />
                        ) : (
                            <FontAwesomeIcon icon={faCheck} color='white' size={16} />
                        )}
                    </Button>
                </XStack>
            </YStack>

            {/* 卡片 2：待取货清单 */}
            <YStack flex={1} mx='$3' mb={insets.bottom + 72}>
                <Text fontSize='$2' fontWeight='700' color='$textSecondary' mb='$2' ml='$1'>
                    {t('PickupChecklistScreen.listLabel', { scanned: scannedCount, total: totalCount })}
                </Text>
                <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    data={selectedGroup.orders}
                    keyExtractor={(o) => o.id}
                    ItemSeparatorComponent={() => <YStack height={8} />}
                    renderItem={({ item }) => {
                        const tn = item.getAttribute('tracking_number')?.tracking_number ?? item.getAttribute('public_id');
                        const meta = item.getAttribute('meta') ?? {};
                        const dropoff = item.getAttribute('payload.dropoff');
                        const scanned = scannedOrderIds.has(item.id);
                        const dropoffLine = [dropoff?.name, dropoff?.city].filter(Boolean).join(' · ') || '—';
                        return (
                            <XStack
                                px='$3'
                                py='$3'
                                bg={scanned ? '$green-100' : '$background'}
                                borderRadius='$3'
                                borderWidth={1}
                                borderColor={scanned ? '$green-400' : '$borderColor'}
                                alignItems='center'
                                gap='$3'
                            >
                                <YStack
                                    width={32}
                                    height={32}
                                    borderRadius={16}
                                    alignItems='center'
                                    justifyContent='center'
                                    bg={scanned ? '$green-600' : '$backgroundStrong'}
                                    borderWidth={scanned ? 0 : 1}
                                    borderColor='$borderColor'
                                >
                                    {scanned && <FontAwesomeIcon icon={faCheck} color='white' size={16} />}
                                </YStack>
                                <YStack flex={1} gap='$1'>
                                    <Text fontSize='$4' fontWeight='700' color='$textPrimary' numberOfLines={1}>
                                        {tn}
                                    </Text>
                                    <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                                        {dropoffLine}
                                    </Text>
                                    {meta.package_count ? (
                                        <Text fontSize='$2' color='$textSecondary'>
                                            {t('PickupChecklistScreen.pieces', { count: meta.package_count, weight: meta.estimated_weight_lbs ?? '—' })}
                                        </Text>
                                    ) : null}
                                </YStack>
                            </XStack>
                        );
                    }}
                />
            </YStack>

            {/* 底部固定批量推进按钮（唯一推进入口） */}
            <YStack position='absolute' left={0} right={0} bottom={0} px='$3' pb={insets.bottom + 12} pt='$3' bg='$surface' borderTopWidth={1} borderColor='$borderColor'>
                <Button
                    size='$5'
                    onPress={handleAdvanceAll}
                    disabled={advancing || scannedCount === 0}
                    bg={scannedCount > 0 ? '$green-600' : '$backgroundStrong'}
                >
                    {advancing ? (
                        <Spinner color='white' />
                    ) : (
                        <Text color={scannedCount > 0 ? 'white' : '$textSecondary'} fontWeight='700'>
                            {t('PickupChecklistScreen.advanceBatch', { scanned: scannedCount, total: totalCount })}
                        </Text>
                    )}
                </Button>
            </YStack>
        </YStack>
    );
};

export default PickupChecklistScreen;
