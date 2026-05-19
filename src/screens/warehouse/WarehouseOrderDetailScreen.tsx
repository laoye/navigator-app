import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowLeft,
    faPhone,
    faLocationDot,
    faRoute,
    faBoxesStacked,
    faStore,
    faClock,
    faTimes,
    faHashtag,
    faTag,
    faWeightHanging,
    faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    fetchOrderDetail,
    type OrderDetail,
    type OrderDetailResponse,
} from '../../warehouse/warehouseApi';

type ParamList = {
    WarehouseOrderDetail: { id: string };
};

function unwrap(resp: unknown): OrderDetail | null {
    if (!resp || typeof resp !== 'object') return null;
    const r = resp as OrderDetailResponse;
    if (r.data && typeof r.data === 'object') return r.data;
    return resp as OrderDetail;
}

function trackingNumberOf(order: OrderDetail): string {
    const tn = order.tracking_number;
    if (tn && typeof tn === 'object') return tn.tracking_number ?? '';
    return tn ?? '';
}

function fmtDateTime(s?: string | null): string {
    if (!s) return '—';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function normStatus(s?: string): string {
    return (s ?? '').toLowerCase().replace(/\s+/g, '_');
}

function statusColor(status: string): string {
    const s = normStatus(status);
    if (s === 'delivered') return '#10b981';
    if (s.startsWith('exception') || s === 'canceled' || s === 'cancelled') return '#ef4444';
    if (s === 'out_for_delivery') return '#f59e0b';
    if (s.startsWith('warehouse')) return '#7c3aed';
    if (s === 'picked_up' || s === 'dispatched') return '#3b82f6';
    return '#6b7280';
}

const WarehouseOrderDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<ParamList, 'WarehouseOrderDetail'>>();
    const { resolveConnectionConfig } = useConfig();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const id = route.params?.id;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    const load = useCallback(async () => {
        const host = resolveConnectionConfig('FLEETBASE_HOST');
        if (!host || !id) {
            setError('missing host or id');
            return;
        }
        setLoading(true);
        try {
            const resp = await fetchOrderDetail(String(host), id);
            const data = unwrap(resp);
            if (!data) throw new Error('empty response');
            setOrder(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'load failed');
        } finally {
            setLoading(false);
        }
    }, [id, resolveConnectionConfig]);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const meta = (order?.meta ?? {}) as Record<string, unknown>;
    const dropoff = order?.payload?.dropoff;
    const entities = order?.payload?.entities ?? [];
    const tracking = order?.tracking_statuses ?? [];
    const pod = order?.pod ?? [];
    const driver = order?.pickup_driver;

    const photoItems = useMemo(
        () => pod.filter((p) => !!p.file_url && p.type !== 'signature'),
        [pod]
    );

    const callDriver = () => {
        const phone = driver?.phone;
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(() => undefined);
    };

    return (
        <YStack flex={1} bg='$background' pt={insets.top + 8}>
            <XStack alignItems='center' px='$3' mb='$2'>
                <Button
                    size='$3'
                    chromeless
                    onPress={() => navigation.goBack()}
                    icon={<FontAwesomeIcon icon={faArrowLeft} color='#888' size={16} />}
                />
                <YStack ml='$2' flex={1}>
                    <Text fontSize='$6' fontWeight='800' color='$textPrimary' numberOfLines={1}>
                        {order ? trackingNumberOf(order) || order.public_id : t('WarehouseOrderDetailScreen.loading')}
                    </Text>
                    {order && trackingNumberOf(order) && (
                        <Text fontSize='$2' color='$textSecondary' numberOfLines={1}>
                            {order.public_id}
                        </Text>
                    )}
                </YStack>
                {order && (
                    <YStack
                        bg={statusColor(order.status) + '22'}
                        borderColor={statusColor(order.status)}
                        borderWidth={1}
                        borderRadius='$3'
                        px='$2'
                        py='$1'
                    >
                        <Text fontSize='$2' fontWeight='600' color={statusColor(order.status)}>
                            {t(`orderStatus.${normStatus(order.status)}`, { defaultValue: order.status })}
                        </Text>
                    </YStack>
                )}
            </XStack>

            {loading && !order ? (
                <YStack flex={1} alignItems='center' justifyContent='center'>
                    <Spinner />
                </YStack>
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {error && (
                        <YStack p='$3' bg='$red-100' borderRadius='$3' mb='$3'>
                            <Text color='$red-700'>{error}</Text>
                        </YStack>
                    )}

                    {order && (
                        <YStack space='$3'>
                            {/* 基本信息 */}
                            <SectionCard title={t('WarehouseOrderDetailScreen.sectionInfo')}>
                                <InfoRow
                                    icon={faClock}
                                    label={t('WarehouseOrderDetailScreen.createdAt')}
                                    value={fmtDateTime(order.created_at)}
                                />
                                {order.facilitator_name && (
                                    <InfoRow
                                        icon={faStore}
                                        label={t('WarehouseOrderDetailScreen.merchant')}
                                        value={order.facilitator_name}
                                    />
                                )}
                                {typeof meta.merchant_order_no === 'string' && (
                                    <InfoRow
                                        icon={faHashtag}
                                        label={t('WarehouseOrderDetailScreen.merchantNo')}
                                        value={meta.merchant_order_no}
                                    />
                                )}
                                {typeof meta.route_code === 'string' && (
                                    <InfoRow
                                        icon={faRoute}
                                        label={t('WarehouseOrderDetailScreen.routeCode')}
                                        value={meta.route_code}
                                    />
                                )}
                                {meta.package_count != null && (
                                    <InfoRow
                                        icon={faBoxesStacked}
                                        label={t('WarehouseOrderDetailScreen.packages')}
                                        value={t('WarehouseOrderDetailScreen.pieces', { count: meta.package_count as number })}
                                    />
                                )}
                                {meta.estimated_weight_lbs != null && (
                                    <InfoRow
                                        icon={faWeightHanging}
                                        label={t('WarehouseOrderDetailScreen.weight')}
                                        value={t('WarehouseOrderDetailScreen.weightLbs', { weight: meta.estimated_weight_lbs as number })}
                                    />
                                )}
                                {typeof meta.item_category === 'string' && (
                                    <InfoRow
                                        icon={faTag}
                                        label={t('WarehouseOrderDetailScreen.category')}
                                        value={meta.item_category}
                                    />
                                )}
                                {typeof meta.special_instructions === 'string' && (
                                    <InfoRow
                                        icon={faCircleInfo}
                                        label={t('WarehouseOrderDetailScreen.special')}
                                        value={meta.special_instructions}
                                    />
                                )}
                            </SectionCard>

                            {/* 收件地址 */}
                            {dropoff && (
                                <SectionCard title={t('WarehouseOrderDetailScreen.sectionDropoff')}>
                                    <YStack space='$1'>
                                        {dropoff.name && (
                                            <Text fontSize='$4' fontWeight='700' color='$textPrimary'>
                                                {dropoff.name}
                                            </Text>
                                        )}
                                        {dropoff.street1 && (
                                            <XStack alignItems='flex-start' space='$2'>
                                                <FontAwesomeIcon icon={faLocationDot} color='#999' size={12} />
                                                <Text fontSize='$3' color='$textSecondary' flex={1}>
                                                    {dropoff.street1}
                                                </Text>
                                            </XStack>
                                        )}
                                        <Text fontSize='$3' color='$textSecondary'>
                                            {[dropoff.city, dropoff.province, dropoff.postal_code].filter(Boolean).join(', ')}
                                        </Text>
                                        {dropoff.phone && (
                                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${dropoff.phone}`).catch(() => undefined)}>
                                                <XStack alignItems='center' space='$2' mt='$1'>
                                                    <FontAwesomeIcon icon={faPhone} color='#3b82f6' size={12} />
                                                    <Text fontSize='$3' color='#3b82f6'>
                                                        {dropoff.phone}
                                                    </Text>
                                                </XStack>
                                            </TouchableOpacity>
                                        )}
                                    </YStack>
                                </SectionCard>
                            )}

                            {/* 取货司机 */}
                            {driver && (driver.name || driver.phone) && (
                                <SectionCard title={t('WarehouseOrderDetailScreen.sectionPickupDriver')}>
                                    <XStack alignItems='center' justifyContent='space-between'>
                                        <YStack flex={1}>
                                            {driver.name && (
                                                <Text fontSize='$4' fontWeight='600' color='$textPrimary'>
                                                    {driver.name}
                                                </Text>
                                            )}
                                            {driver.phone && (
                                                <Text fontSize='$3' color='$textSecondary'>
                                                    {driver.phone}
                                                </Text>
                                            )}
                                        </YStack>
                                        {driver.phone && (
                                            <Button
                                                size='$3'
                                                bg='$blue-600'
                                                onPress={callDriver}
                                                icon={<FontAwesomeIcon icon={faPhone} color='white' size={12} />}
                                            >
                                                <Text color='white' fontWeight='600'>
                                                    {t('WarehouseOrderDetailScreen.callDriver')}
                                                </Text>
                                            </Button>
                                        )}
                                    </XStack>
                                </SectionCard>
                            )}

                            {/* 货物明细 */}
                            {entities.length > 0 && (
                                <SectionCard title={t('WarehouseOrderDetailScreen.sectionCargo')}>
                                    <YStack space='$1'>
                                        {entities.map((e, idx) => (
                                            <XStack
                                                key={e.uuid ?? idx}
                                                alignItems='center'
                                                justifyContent='space-between'
                                                py='$1.5'
                                                borderBottomWidth={idx < entities.length - 1 ? 1 : 0}
                                                borderColor='$borderColor'
                                            >
                                                <Text fontSize='$3' color='$textPrimary' flex={1} numberOfLines={1}>
                                                    {e.name || e.type || `#${idx + 1}`}
                                                </Text>
                                                {e.weight != null && (
                                                    <Text fontSize='$2' color='$textSecondary'>
                                                        {t('WarehouseOrderDetailScreen.weightLbs', { weight: e.weight })}
                                                    </Text>
                                                )}
                                            </XStack>
                                        ))}
                                    </YStack>
                                </SectionCard>
                            )}

                            {/* POD 取货照片 */}
                            {photoItems.length > 0 && (
                                <SectionCard title={t('WarehouseOrderDetailScreen.sectionPod')}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <XStack space='$2'>
                                            {photoItems.map((p, idx) => (
                                                <TouchableOpacity
                                                    key={p.uuid}
                                                    onPress={() => setPreviewIndex(idx)}
                                                    style={styles.thumbWrap}
                                                >
                                                    <Image source={{ uri: p.file_url ?? '' }} style={styles.thumb} />
                                                </TouchableOpacity>
                                            ))}
                                        </XStack>
                                    </ScrollView>
                                    <Text mt='$2' fontSize='$2' color='$textSecondary'>
                                        {fmtDateTime(photoItems[0]?.created_at)}
                                    </Text>
                                </SectionCard>
                            )}

                            {/* 物流轨迹 */}
                            {tracking.length > 0 && (
                                <SectionCard title={t('WarehouseOrderDetailScreen.sectionTimeline')}>
                                    <Timeline items={tracking} t={t} />
                                </SectionCard>
                            )}
                        </YStack>
                    )}
                </ScrollView>
            )}

            {/* 全屏照片预览 */}
            <Modal
                visible={previewIndex != null}
                transparent
                animationType='fade'
                onRequestClose={() => setPreviewIndex(null)}
            >
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewIndex(null)}>
                        <FontAwesomeIcon icon={faTimes} color='#fff' size={22} />
                    </TouchableOpacity>
                    {previewIndex != null && photoItems[previewIndex] && (
                        <Pressable style={styles.modalPress} onPress={() => setPreviewIndex(null)}>
                            <Image
                                source={{ uri: photoItems[previewIndex].file_url ?? '' }}
                                style={styles.modalImage}
                                resizeMode='contain'
                            />
                        </Pressable>
                    )}
                </View>
            </Modal>
        </YStack>
    );
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <YStack
            bg='$backgroundStrong'
            borderRadius='$4'
            borderWidth={1}
            borderColor='$borderColor'
            p='$3'
        >
            <Text fontSize='$3' fontWeight='600' color='$textSecondary' mb='$2'>
                {title}
            </Text>
            {children}
        </YStack>
    );
}

function InfoRow({
    label,
    value,
    icon,
}: {
    label: string;
    value: string | number | null | undefined;
    icon: any;
}) {
    if (value == null || value === '') return null;
    return (
        <XStack py='$1.5' alignItems='center'>
            <View style={{ width: 20, alignItems: 'center', marginRight: 8 }}>
                <FontAwesomeIcon icon={icon} color='#9ca3af' size={12} />
            </View>
            <Text fontSize='$3' color='$textSecondary' width={84}>
                {label}
            </Text>
            <Text fontSize='$3' color='$textPrimary' flex={1} numberOfLines={2}>
                {String(value)}
            </Text>
        </XStack>
    );
}

function Timeline({
    items,
    t,
}: {
    items: { uuid: string; status: string; details?: string | null; created_at: string }[];
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return (
        <YStack space='$2'>
            {sorted.map((s, i) => (
                <XStack key={s.uuid} space='$2' alignItems='flex-start'>
                    <View
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: i === 0 ? statusColor(s.status) : '#d1d5db',
                            marginTop: 6,
                        }}
                    />
                    <YStack flex={1}>
                        <Text fontSize='$3' fontWeight='600' color='$textPrimary'>
                            {t(`orderStatus.${normStatus(s.status)}`, { defaultValue: s.status })}
                        </Text>
                        {s.details && (
                            <Text fontSize='$2' color='$textSecondary' mt={2}>
                                {s.details}
                            </Text>
                        )}
                        <XStack alignItems='center' space='$1' mt={2}>
                            <FontAwesomeIcon icon={faClock} color='#999' size={10} />
                            <Text fontSize='$2' color='$textSecondary'>
                                {fmtDateTime(s.created_at)}
                            </Text>
                        </XStack>
                    </YStack>
                </XStack>
            ))}
        </YStack>
    );
}

const styles = StyleSheet.create({
    thumbWrap: {
        width: 96,
        height: 96,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 10,
        zIndex: 10,
    },
    modalPress: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalImage: {
        width: '95%',
        height: '85%',
    },
});

export default WarehouseOrderDetailScreen;
