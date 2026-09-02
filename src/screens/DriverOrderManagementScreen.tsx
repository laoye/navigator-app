import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, RefreshControl, Platform } from 'react-native';
import { Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faInfoCircle, faClipboardList, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { endOfYear, format, startOfYear, subDays } from 'date-fns';
import { formatLocalized } from '../utils/dateFns';
import { formatDuration, formatMeters } from '../utils/format';
import { isInactiveOrderStatus } from '../utils/orderStatus';
import { useOrderManager } from '../contexts/OrderManagerContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import InsetShadow from 'react-native-inset-shadow';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import useAppTheme from '../hooks/use-app-theme';
import CalendarStrip from 'react-native-calendar-strip';
import OrderCard from '../components/OrderCard';
import PastOrderCard from '../components/PastOrderCard';
import AdhocOrderCard from '../components/AdhocOrderCard';
import Spacer from '../components/Spacer';
import useStorage from '../hooks/use-storage';

const isAndroid = Platform.OS === 'android';

const countStops = (orders = []) =>
    orders.reduce((total, order) => {
        const { pickup, dropoff, waypoints = [] } = order.getAttribute('payload') || {};
        const stops = [pickup, dropoff, ...waypoints].filter(Boolean);
        return total + stops.length;
    }, 0);

const sumDuration = (orders = []) =>
    orders.reduce((total, order) => {
        return total + order.getAttribute('time');
    }, 0);

const sumDistance = (orders = []) =>
    orders.reduce((total, order) => {
        return total + order.getAttribute('distance');
    }, 0);

const REFRESH_NEARBY_ORDERS_MS = 6000 * 5; // 5 mins
const REFRESH_ORDERS_MS = 6000 * 15; // 15 mins
const DriverOrderManagementScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const calendar = useRef(null);
    const listenerRef = useRef(null);
    const { isDarkMode } = useAppTheme();
    const { driver } = useAuth();
    const { t } = useLanguage();
    const {
        allActiveOrders,
        currentOrders,
        setCurrentDate,
        currentDate,
        reloadCurrentOrders,
        reloadActiveOrders,
        isFetchingCurrentOrders,
        activeOrderMarkedDates,
        nearbyOrders,
        isFetchingNearbyOrders,
        reloadNearbyOrders,
        dismissedOrders,
        setDimissedOrders,
        ordersLoadError,
    } = useOrderManager();
    const { listen } = useSocketClusterClient();
    const { addNotificationListener, removeNotificationListener } = useNotification();
    const startingDate = subDays(new Date(currentDate), 2);
    const datesWhitelist = [new Date(), { start: startOfYear(new Date()), end: endOfYear(new Date()) }];
    const todayString = formatLocalized(new Date(currentDate), 'EEEE');
    const activeCurrentOrders = currentOrders.filter((order) => !isInactiveOrderStatus(order.getAttribute('status')));
    const stops = countStops(activeCurrentOrders);
    const distance = sumDistance(activeCurrentOrders);
    const duration = sumDuration(activeCurrentOrders);

    // 下拉刷新/重试要覆盖列表实际渲染的三份数据（当日单 + 附近单 + 活跃单），
    // 只刷 currentOrders 会让附近单和空态里的活跃单停留在旧数据。
    const reloadAllOrders = useCallback(() => {
        reloadCurrentOrders();
        reloadNearbyOrders();
        reloadActiveOrders();
    }, [reloadCurrentOrders, reloadNearbyOrders, reloadActiveOrders]);

    useEffect(() => {
        const handlePushNotification = async (notification, action) => {
            const { payload } = notification;
            const id = payload.id;
            const type = payload.type;

            // If any order related push notification comes just reload current orders
            if (typeof id === 'string' && id.startsWith('order_')) {
                reloadCurrentOrders();
            }
        };

        addNotificationListener(handlePushNotification);

        return () => {
            removeNotificationListener(handlePushNotification);
        };
    }, [addNotificationListener, removeNotificationListener]);

    useFocusEffect(
        useCallback(() => {
            const handleReloadNearbyOrders = () => {
                reloadNearbyOrders({}, { setLoadingFlag: false });
            };

            const interval = setInterval(handleReloadNearbyOrders, REFRESH_NEARBY_ORDERS_MS);
            return () => clearInterval(interval);
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            const handleReloadCurrentOrders = () => {
                reloadCurrentOrders({}, { setLoadingFlag: false });
            };
            reloadActiveOrders();
            handleReloadCurrentOrders();

            const interval = setInterval(handleReloadCurrentOrders, REFRESH_ORDERS_MS);
            return () => clearInterval(interval);
        }, [currentDate])
    );

    useFocusEffect(
        useCallback(() => {
            const listenForOrderUpdates = async () => {
                const listener = await listen(`driver.${driver.id}`, ({ event }) => {
                    if (typeof event === 'string' && event === 'order.ready') {
                        reloadCurrentOrders();
                    }
                    if (typeof event === 'string' && event === 'order.ping') {
                        reloadNearbyOrders();
                    }
                });
                if (listener) {
                    listenerRef.current = listener;
                }
            };

            listenForOrderUpdates();

            return () => {
                if (listenerRef.current) {
                    listenerRef.current.stop();
                }
            };
        }, [listen, driver.id])
    );

    const pickupSummary = useMemo(() => {
        const TARGET_STATUSES = new Set(['dispatched', 'started']);
        const locationIds = new Set<string>();
        let orderCount = 0;
        for (const order of allActiveOrders ?? []) {
            const status = order.getAttribute('status');
            if (!TARGET_STATUSES.has(status)) continue;
            const meta = order.getAttribute('meta') ?? {};
            if (meta.inbound_method === 'merchant_dropoff') continue;
            const pickup = order.getAttribute('payload.pickup');
            if (!pickup) continue;
            const id = pickup.id ?? pickup.uuid ?? pickup.street1 ?? 'no-pickup';
            locationIds.add(id);
            orderCount++;
        }
        return { orders: orderCount, locations: locationIds.size };
    }, [allActiveOrders]);

    const handleOpenPickupChecklist = useCallback(() => {
        navigation.navigate('PickupChecklist');
    }, [navigation]);

    const handleAdhocDismissal = useCallback(
        (order) => {
            setDimissedOrders((prevDismissedOrders) => [...prevDismissedOrders, order.id]);
        },
        [setDimissedOrders]
    );

    const handleAdhocAccept = useCallback(() => {
        reloadNearbyOrders();
        reloadCurrentOrders();
    }, [reloadNearbyOrders, reloadCurrentOrders]);

    const renderOrder = ({ item: order }) => {
        const isAdhocOrder = order.getAttribute('adhoc') === true && order.getAttribute('driver_assigned') === null;
        if (isAdhocOrder) {
            if (dismissedOrders.includes(order.id)) return;
            return (
                <YStack px='$2' py='$4'>
                    <AdhocOrderCard
                        order={order}
                        onPress={() => navigation.navigate('OrderModal', { order: order.serialize() })}
                        onDismiss={handleAdhocDismissal}
                        onAccept={handleAdhocAccept}
                    />
                </YStack>
            );
        }

        return (
            <YStack px='$2' py='$4'>
                <OrderCard order={order} onPress={() => navigation.navigate('Order', { order: order.serialize() })} />
            </YStack>
        );
    };

    const ActiveOrders = () => {
        if (!allActiveOrders.length) return;

        return (
            <YStack>
                <YStack px='$1'>
                    <Text color='$textPrimary' fontSize={18} fontWeight='bold'>
                        {t('DriverOrderManagementScreen.activeOrdersCount', { count: allActiveOrders.length })}
                    </Text>
                </YStack>
                <YStack>
                    <FlatList
                        data={allActiveOrders}
                        keyExtractor={(order) => order.id.toString()}
                        renderItem={({ item: order }) => (
                            <YStack py='$3'>
                                <PastOrderCard order={order} onPress={() => navigation.navigate('Order', { order: order.serialize() })} />
                            </YStack>
                        )}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                    />
                </YStack>
            </YStack>
        );
    };

    const PickupChecklistEntry = () => {
        if (pickupSummary.orders === 0) return null;
        return (
            <YStack px='$3' pt='$3'>
                <Pressable onPress={handleOpenPickupChecklist}>
                    <XStack
                        alignItems='center'
                        bg='$background'
                        borderWidth={1}
                        borderColor={isDarkMode ? '$borderColor' : '$borderColorWithShadow'}
                        borderRadius='$4'
                        px='$3'
                        py='$3'
                        space='$3'
                    >
                        <XStack
                            width={40}
                            height={40}
                            borderRadius='$3'
                            bg={isDarkMode ? '$info' : '$blue-600'}
                            alignItems='center'
                            justifyContent='center'
                        >
                            <FontAwesomeIcon
                                icon={faClipboardList}
                                color={isDarkMode ? theme.textPrimary.val : theme.surface.val}
                                size={18}
                            />
                        </XStack>
                        <YStack flex={1}>
                            <Text color='$textPrimary' fontSize={15} fontWeight='700'>
                                {t('PickupChecklistScreen.entryTitle')}
                            </Text>
                            <Text color='$textSecondary' fontSize={12} mt='$1'>
                                {t('PickupChecklistScreen.entrySubtitle', {
                                    orders: pickupSummary.orders,
                                    locations: pickupSummary.locations,
                                })}
                            </Text>
                        </YStack>
                        <FontAwesomeIcon icon={faChevronRight} color={theme['$textSecondary'].val} size={14} />
                    </XStack>
                </Pressable>
            </YStack>
        );
    };

    const NoOrders = () => {
        return (
            <YStack py='$5' px='$3' space='$6' flex={1} height='100%'>
                <YStack alignItems='center'>
                    <XStack alignItems='center' bg='$info' borderWidth={1} borderColor='$infoBorder' space='$2' px='$3' py='$2' borderRadius='$5' width='100%' flexWrap='wrap'>
                        <FontAwesomeIcon icon={faInfoCircle} color={theme['$infoText'].val} />
                        <Text color='$infoText' fontSize={16}>
                            {t('DriverOrderManagementScreen.noCurrentOrders', { date: format(new Date(currentDate), 'yyyy-MM-dd') })}
                        </Text>
                    </XStack>
                </YStack>
                <ActiveOrders />
            </YStack>
        );
    };

    return (
        <YStack flex={1} bg='$surface'>
            <YStack
                bg='$background'
                pb='$2'
                elevation={10}
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                }}
                borderBottomWidth={1}
                borderColor={isDarkMode ? 'transparent' : '$borderColorWithShadow'}
            >
                <CalendarStrip
                    scrollable
                    ref={calendar}
                    datesWhitelist={datesWhitelist}
                    style={{ height: 100, paddingTop: 10, paddingBottom: 15 }}
                    calendarColor={'transparent'}
                    calendarHeaderStyle={{ color: isDarkMode ? theme['$gray-300'].val : theme['$gray-600'].val, fontSize: 14 }}
                    calendarHeaderContainerStyle={{ marginBottom: 20 }}
                    dateNumberStyle={{ color: theme['$gray-500'].val, fontSize: 12 }}
                    dateNameStyle={{ color: theme['$gray-500'].val, fontSize: 12 }}
                    dayContainerStyle={{ padding: 0, height: isAndroid ? 55 : 60 }}
                    highlightDateNameStyle={{ color: theme['$gray-100'].val, fontSize: 12 }}
                    highlightDateNumberStyle={{ color: theme['$gray-100'].val, fontSize: 12 }}
                    highlightDateContainerStyle={{ backgroundColor: theme['$blue-500'].val, borderRadius: 6 }}
                    iconContainer={{ flex: 0.1 }}
                    numDaysInWeek={5}
                    markedDates={activeOrderMarkedDates}
                    startingDate={startingDate}
                    selectedDate={new Date(currentDate)}
                    onDateSelected={(selectedDate) => setCurrentDate(format(new Date(selectedDate), 'yyyy-MM-dd HH:mm:ssXXX'))}
                    iconLeft={require('../../assets/nv-arrow-left.png')}
                    iconRight={require('../../assets/nv-arrow-right.png')}
                />
            </YStack>
            <YStack bg='$surface' px='$3' py='$4' borderBottomWidth={1} borderTopWidth={0} borderColor={isDarkMode ? '$borderColor' : '$borderColorWithShadow'}>
                <Text color='$textPrimary' fontSize='$8' fontWeight='bold' mb='$1'>
                    {t('DriverOrderManagementScreen.dayOrders', { day: todayString })}
                </Text>
                <XStack space='$2' alignItems='center'>
                    <Text color='$textSecondary' fontSize='$5'>
                        {t('DriverOrderManagementScreen.ordersCount', { count: currentOrders.length })}
                    </Text>
                    <Text color='$textSecondary' fontSize='$5'>
                        •
                    </Text>
                    <Text color='$textSecondary' fontSize='$5'>
                        {t('DriverOrderManagementScreen.stopsLeft', { count: stops })}
                    </Text>
                    <Text color='$textSecondary' fontSize='$5'>
                        •
                    </Text>
                    <Text color='$textSecondary' fontSize='$5'>
                        {formatDuration(duration)}
                    </Text>
                    <Text color='$textSecondary' fontSize='$5'>
                        •
                    </Text>
                    <Text color='$textSecondary' fontSize='$5'>
                        {formatMeters(distance)}
                    </Text>
                </XStack>
            </YStack>
            {ordersLoadError && (
                <Pressable onPress={reloadAllOrders}>
                    <XStack bg='$warning' borderBottomWidth={1} borderColor='$warningBorder' alignItems='center' px='$3' py='$2' space='$2'>
                        <FontAwesomeIcon icon={faInfoCircle} color={theme['$warningText']?.val} size={14} />
                        <Text color='$warningText' fontSize={13} flex={1}>
                            {t('DriverOrderManagementScreen.loadFailedStale')}
                        </Text>
                        <Text color='$warningText' fontSize={13} fontWeight='700'>
                            {t('common.retry')}
                        </Text>
                    </XStack>
                </Pressable>
            )}
            <FlatList
                data={[...nearbyOrders, ...currentOrders]}
                keyExtractor={(order, index) => order.id.toString() + '_' + index}
                renderItem={renderOrder}
                refreshControl={<RefreshControl refreshing={isFetchingCurrentOrders} onRefresh={reloadAllOrders} tintColor={theme['$blue-500'].val} />}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                ListHeaderComponent={<PickupChecklistEntry />}
                ListFooterComponent={<Spacer height={200} />}
                ListEmptyComponent={<NoOrders />}
            />
        </YStack>
    );
};

export default DriverOrderManagementScreen;
