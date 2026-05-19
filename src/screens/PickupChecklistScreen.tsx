import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Order } from '@fleetbase/sdk';
import { toast } from '../utils/toast';
import { useOrderManager } from '../contexts/OrderManagerContext';
import { useLanguage } from '../contexts/LanguageContext';
import useFleetbase from '../hooks/use-fleetbase';
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
    pickupAddress: string;
    orders: Order[];
}

const TARGET_STATUSES = new Set(['dispatched', 'started']);

const PickupChecklistScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
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
            const key = pickup?.id ?? pickup?.uuid ?? 'no-pickup';
            const name = pickup?.name ?? pickup?.street1 ?? t('PickupChecklistScreen.noPickupSpecified');
            const address = [pickup?.street1, pickup?.city, pickup?.province, pickup?.postal_code]
                .filter(Boolean)
                .join(', ');

            if (!map.has(key)) {
                map.set(key, { pickupKey: key, pickupName: name, pickupAddress: address, orders: [] });
            }
            map.get(key)!.orders.push(order);
        }
        return Array.from(map.values()).sort((a, b) => b.orders.length - a.orders.length);
    }, [allActiveOrders]);

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
            <YStack flex={1} pt={insets.top + 12} bg='$background'>
                <XStack alignItems='center' px='$3' mb='$3'>
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
                <Text px='$4' color='$textSecondary' fontSize='$3' mb='$3'>
                    {t('PickupChecklistScreen.subtitle')}
                </Text>
                <FlatList
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={!!isFetchingActiveOrders}
                            onRefresh={() => reloadActiveOrders?.()}
                        />
                    }
                    data={groups}
                    keyExtractor={(g) => g.pickupKey}
                    renderItem={({ item }) => (
                        <Button
                            mb='$2'
                            size='$5'
                            bg='$backgroundStrong'
                            borderColor='$borderColor'
                            borderWidth={1}
                            onPress={() => {
                                setSelectedPickupKey(item.pickupKey);
                                setScannedOrderIds(new Set());
                            }}
                        >
                            <YStack flex={1} alignItems='flex-start'>
                                <Text fontSize='$4' fontWeight='700' color='$textPrimary'>
                                    {item.pickupName}
                                </Text>
                                <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                                    {item.pickupAddress || '—'}
                                </Text>
                                <Text fontSize='$2' color='$textSecondary' mt='$1'>
                                    {t('PickupChecklistScreen.pickupCount', { count: item.orders.length })}
                                </Text>
                            </YStack>
                        </Button>
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
    return (
        <YStack flex={1} pt={insets.top + 12} bg='$background'>
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
                        {t('PickupChecklistScreen.countSummary', { total: selectedGroup.orders.length, scanned: scannedOrderIds.size })}
                    </Text>
                </YStack>
            </XStack>

            {/* 摄像头扫码 */}
            <YStack mx='$4' mb='$3'>
                <BarcodeScanner height={180} enabled={!submitting} onScanned={handleScanned} />
            </YStack>

            {/* 手动输入 + 提交 */}
            <YStack px='$4' space='$2' mb='$3'>
                <Input
                    size='$4'
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize='characters'
                    autoCorrect={false}
                    placeholder={t('PickupChecklistScreen.trackingPlaceholder')}
                    editable={!submitting}
                />
                <Button
                    size='$4'
                    onPress={handleSubmitScan}
                    disabled={submitting || !code.trim()}
                    bg='$blue-600'
                    pressStyle={{ opacity: 0.9 }}
                >
                    {submitting ? (
                        <Spinner color='white' />
                    ) : (
                        <Text color='white' fontWeight='700'>
                            {t('PickupChecklistScreen.confirmPickedUp')}
                        </Text>
                    )}
                </Button>
            </YStack>

            {/* 单据列表 */}
            <FlatList
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
                data={selectedGroup.orders}
                keyExtractor={(o) => o.id}
                renderItem={({ item }) => {
                    const tn = item.getAttribute('tracking_number')?.tracking_number ?? item.getAttribute('public_id');
                    const meta = item.getAttribute('meta') ?? {};
                    const dropoff = item.getAttribute('payload.dropoff');
                    const scanned = scannedOrderIds.has(item.id);
                    return (
                        <XStack
                            mb='$2'
                            px='$3'
                            py='$3'
                            bg={scanned ? '$green-100' : '$backgroundStrong'}
                            borderRadius='$3'
                            borderWidth={1}
                            borderColor={scanned ? '$green-300' : '$borderColor'}
                            alignItems='center'
                            space='$3'
                        >
                            <YStack
                                width={28}
                                height={28}
                                borderRadius={14}
                                alignItems='center'
                                justifyContent='center'
                                bg={scanned ? '$green-600' : '$backgroundStrong'}
                                borderWidth={scanned ? 0 : 1}
                                borderColor='$borderColor'
                            >
                                {scanned && <FontAwesomeIcon icon={faCheck} color='white' size={14} />}
                            </YStack>
                            <YStack flex={1}>
                                <Text fontSize='$3' fontWeight='700' color='$textPrimary' numberOfLines={1}>
                                    {tn}
                                </Text>
                                <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                                    {dropoff?.name ?? '—'} · {dropoff?.city ?? ''}
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

            {/* 底部固定批量推进按钮 */}
            <YStack position='absolute' left={0} right={0} bottom={0} px='$4' pb={insets.bottom + 12} pt='$3' bg='$background'>
                <Button
                    size='$5'
                    onPress={handleAdvanceAll}
                    disabled={advancing || scannedOrderIds.size === 0}
                    bg={scannedOrderIds.size > 0 ? '$green-600' : '$backgroundStrong'}
                >
                    {advancing ? (
                        <Spinner color='white' />
                    ) : (
                        <Text color={scannedOrderIds.size > 0 ? 'white' : '$textSecondary'} fontWeight='700'>
                            {t('PickupChecklistScreen.advanceBatch', { scanned: scannedOrderIds.size, total: selectedGroup.orders.length })}
                        </Text>
                    )}
                </Button>
            </YStack>
        </YStack>
    );
};

export default PickupChecklistScreen;
