import { useCallback, useMemo, useRef } from 'react';
import { RefreshControl, ScrollView, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBox, faChevronRight, faClipboardList, faLocationDot, faSatelliteDish, faCirclePause, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useOrderManager } from '../contexts/OrderManagerContext';
import { useLanguage } from '../contexts/LanguageContext';
import { countStops, sumDistance, sumDuration, buildPickupSummary, pickCurrentTask, getOrderDestination } from '../utils/order';
import { formattedAddressFromSerializedPlace } from '../utils/location';
import { formatDuration, formatMeters } from '../utils/format';
import OdometerNumber from '../components/OdometerNumber';
import Badge from '../components/Badge';
import Spacer from '../components/Spacer';
import useAppTheme from '../hooks/use-app-theme';

/** 按本地时间挑问候语的时段 key。 */
function greetingKey(hour: number): string {
    if (hour < 12) return 'greetingMorning';
    if (hour < 18) return 'greetingAfternoon';
    return 'greetingEvening';
}

const Card = ({ children, ...props }) => {
    const { isDarkMode } = useAppTheme();
    return (
        <YStack bg='$background' borderRadius='$4' borderWidth={1} borderColor={isDarkMode ? '$borderColor' : '$borderColorWithShadow'} {...props}>
            {children}
        </YStack>
    );
};

/** 图标 + 标题 + 副标题 + 右箭头的可点入口，取件清单/附近可接单共用。 */
const ActionRow = ({ icon, title, subtitle, onPress, tone = 'info' }) => {
    const theme = useTheme();

    return (
        <Pressable onPress={onPress}>
            <Card px='$3' py='$3'>
                <XStack alignItems='center' space='$3'>
                    <XStack width={40} height={40} borderRadius='$3' bg={'$' + tone} alignItems='center' justifyContent='center'>
                        <FontAwesomeIcon icon={icon} color={theme['$' + tone + 'Text'].val} size={18} />
                    </XStack>
                    <YStack flex={1}>
                        <Text color='$textPrimary' fontSize={15} fontWeight='700'>
                            {title}
                        </Text>
                        <Text color='$textSecondary' fontSize={12} mt='$1'>
                            {subtitle}
                        </Text>
                    </YStack>
                    <FontAwesomeIcon icon={faChevronRight} color={theme['$textSecondary'].val} size={14} />
                </XStack>
            </Card>
        </Pressable>
    );
};

/** 概览四宫格里的一格。 */
const StatTile = ({ label, children }) => (
    <Card flex={1} px='$3' py='$3' minHeight={78} justifyContent='center'>
        <Text color='$textSecondary' fontSize={12} mb='$1' numberOfLines={1}>
            {label}
        </Text>
        {children}
    </Card>
);

const StatValue = ({ children }) => (
    <Text color='$textPrimary' fontSize={20} fontWeight='bold' numberOfLines={1}>
        {children}
    </Text>
);

const DriverDashboardScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { driver, isOnline } = useAuth();
    const { isTracking } = useLocation();
    const { allActiveOrders, nearbyOrders, reloadActiveOrders, reloadNearbyOrders, isFetchingActiveOrders } = useOrderManager();

    // 概览统计以「进行中订单」为口径，而不是订单页的 currentOrders —— 后者跟着
    // 订单页日历选中的日期走，司机翻过日历后首页会跟着显示别的日期，很误导。
    const stats = useMemo(
        () => ({
            orders: allActiveOrders.length,
            stops: countStops(allActiveOrders),
            duration: sumDuration(allActiveOrders),
            distance: sumDistance(allActiveOrders),
        }),
        [allActiveOrders]
    );

    const pickupSummary = useMemo(() => buildPickupSummary(allActiveOrders), [allActiveOrders]);
    const currentTask = useMemo(() => pickCurrentTask(allActiveOrders), [allActiveOrders]);
    const destination = useMemo(() => (currentTask ? getOrderDestination(currentTask) : null), [currentTask]);

    const greeting = t('DriverDashboardScreen.' + greetingKey(new Date().getHours()), {
        name: driver?.getAttribute('name') ?? '',
    });

    const reloadAll = useCallback(() => {
        reloadActiveOrders();
        reloadNearbyOrders();
    }, [reloadActiveOrders, reloadNearbyOrders]);

    // 每次进入首页拉一次进行中订单。用 ref 持有最新的 reload，避免把它写进
    // useFocusEffect 的依赖 —— driver 一更新（例如切在线开关）它就会换引用，
    // 那样会在页面停留期间反复重拉。
    const reloadActiveOrdersRef = useRef(reloadActiveOrders);
    reloadActiveOrdersRef.current = reloadActiveOrders;

    useFocusEffect(
        useCallback(() => {
            reloadActiveOrdersRef.current();
        }, [])
    );

    const openTask = useCallback(
        (order) => {
            navigation.navigate('DriverTaskTab', { screen: 'Order', params: { order: order.serialize() } });
        },
        [navigation]
    );

    // 状态条:离线 > 定位未开 > 正常。只呈现司机能立刻处理的那一条。
    const status = isOnline
        ? isTracking
            ? { tone: 'success', icon: faSatelliteDish, title: t('DriverDashboardScreen.statusOnline'), hint: t('DriverDashboardScreen.statusOnlineHint') }
            : { tone: 'warning', icon: faLocationDot, title: t('DriverDashboardScreen.statusNoLocation'), hint: t('DriverDashboardScreen.statusNoLocationHint') }
        : { tone: 'warning', icon: faCirclePause, title: t('DriverDashboardScreen.statusOffline'), hint: t('DriverDashboardScreen.statusOfflineHint') };

    const statusBg = '$' + status.tone;
    const statusBorder = '$' + status.tone + 'Border';
    const statusText = '$' + status.tone + 'Text';

    return (
        <YStack flex={1} bg='$surface'>
            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 16 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetchingActiveOrders} onRefresh={reloadAll} tintColor={theme['$blue-500'].val} />}
            >
                <YStack>
                    <Text color='$textPrimary' fontSize='$8' fontWeight='bold' numberOfLines={1}>
                        {greeting}
                    </Text>
                </YStack>

                <XStack bg={statusBg} borderWidth={1} borderColor={statusBorder} borderRadius='$4' px='$3' py='$3' space='$3' alignItems='center'>
                    <FontAwesomeIcon icon={status.icon} color={theme[statusText].val} size={18} />
                    <YStack flex={1}>
                        <Text color={statusText} fontSize={15} fontWeight='700'>
                            {status.title}
                        </Text>
                        <Text color={statusText} fontSize={12} mt='$1' opacity={0.9}>
                            {status.hint}
                        </Text>
                    </YStack>
                </XStack>

                <YStack space='$2'>
                    <Text color='$textPrimary' fontSize={16} fontWeight='bold'>
                        {t('DriverDashboardScreen.currentTask')}
                    </Text>
                    {currentTask ? (
                        <Pressable onPress={() => openTask(currentTask)}>
                            <Card px='$3' py='$3' space='$3'>
                                <XStack alignItems='center' space='$2'>
                                    <XStack width={32} height={32} borderRadius='$3' bg='$info' alignItems='center' justifyContent='center'>
                                        <FontAwesomeIcon icon={faBox} color={theme['$infoText'].val} size={14} />
                                    </XStack>
                                    <Text flex={1} color='$textPrimary' fontSize={16} fontWeight='bold' numberOfLines={1}>
                                        {currentTask.getAttribute('tracking_number.tracking_number')}
                                    </Text>
                                    <Badge status={currentTask.getAttribute('status')} />
                                </XStack>
                                <YStack>
                                    <Text color='$textSecondary' fontSize={12} mb='$1'>
                                        {t('DriverDashboardScreen.nextStop')}
                                    </Text>
                                    <Text color='$textPrimary' fontSize={14} numberOfLines={2}>
                                        {formattedAddressFromSerializedPlace(destination) || destination?.name || t('DriverDashboardScreen.noStopAddress')}
                                    </Text>
                                </YStack>
                                <XStack alignItems='center' space='$2'>
                                    <Text flex={1} color='$textSecondary' fontSize={12}>
                                        {t('DriverDashboardScreen.openTask')}
                                    </Text>
                                    <FontAwesomeIcon icon={faChevronRight} color={theme['$textSecondary'].val} size={14} />
                                </XStack>
                            </Card>
                        </Pressable>
                    ) : (
                        <Card px='$3' py='$4' alignItems='center'>
                            <Text color='$textSecondary' fontSize={14} textAlign='center'>
                                {isOnline ? t('DriverDashboardScreen.noTaskOnline') : t('DriverDashboardScreen.noTaskOffline')}
                            </Text>
                        </Card>
                    )}
                </YStack>

                <YStack space='$2'>
                    <Text color='$textPrimary' fontSize={16} fontWeight='bold'>
                        {t('DriverDashboardScreen.workload')}
                    </Text>
                    <XStack space='$3'>
                        <StatTile label={t('DriverDashboardScreen.activeOrders')}>
                            <OdometerNumber value={stats.orders} digitStyle={{ color: theme['$textPrimary'].val }} digitHeight={24} />
                        </StatTile>
                        <StatTile label={t('DriverDashboardScreen.stops')}>
                            <StatValue>{stats.stops}</StatValue>
                        </StatTile>
                    </XStack>
                    <XStack space='$3'>
                        <StatTile label={t('DriverDashboardScreen.estimatedTime')}>
                            <StatValue>{formatDuration(stats.duration)}</StatValue>
                        </StatTile>
                        <StatTile label={t('DriverDashboardScreen.estimatedDistance')}>
                            <StatValue>{formatMeters(stats.distance)}</StatValue>
                        </StatTile>
                    </XStack>
                </YStack>

                {pickupSummary.orders > 0 && (
                    <ActionRow
                        icon={faClipboardList}
                        tone='info'
                        title={t('PickupChecklistScreen.entryTitle')}
                        subtitle={t('PickupChecklistScreen.entrySubtitle', { orders: pickupSummary.orders, locations: pickupSummary.locations })}
                        onPress={() => navigation.navigate('PickupChecklist')}
                    />
                )}

                {nearbyOrders.length > 0 && (
                    <ActionRow
                        icon={faBolt}
                        tone='success'
                        title={t('DriverDashboardScreen.nearbyTitle')}
                        subtitle={t('DriverDashboardScreen.nearbySubtitle', { count: nearbyOrders.length })}
                        onPress={() => navigation.navigate('DriverTaskTab', { screen: 'DriverOrderManagement' })}
                    />
                )}

                <Spacer height={40} />
            </ScrollView>
        </YStack>
    );
};

export default DriverDashboardScreen;
