import { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { later } from '../utils';
import { toast } from '../utils/toast';
import { userFacingError } from '../utils/error';
import { useNotification } from '../contexts/NotificationContext';
import { useChat } from '../contexts/ChatContext';
import { useOrderManager } from '../contexts/OrderManagerContext';
import { useLanguage } from '../contexts/LanguageContext';
import useFleetbase from '../hooks/use-fleetbase';

const getCurrentScreen = (tabNavigation) => {
    const tabState = tabNavigation.getState?.();
    const currentTabRoute = tabState?.routes?.[tabState.index];
    const stackState = currentTabRoute?.state;
    const currentScreen = stackState?.routes?.[stackState.index];

    return {
        tabName: currentTabRoute?.name,
        screenName: currentScreen?.name,
        screenParams: currentScreen?.params,
    };
};

const DriverLayout = ({ children, state, descriptors, navigation: tabNavigation }) => {
    const navigation = useNavigation();
    const { fleetbase } = useFleetbase();
    const { getChannel } = useChat();
    const { addNotificationListener, removeNotificationListener, consumePendingOpened } = useNotification();
    const { reloadActiveOrders } = useOrderManager();
    const { t } = useLanguage();

    useEffect(() => {
        if (!fleetbase) {
            return;
        }

        const handlePushNotification = async (notification, action) => {
            console.log('[Notification]', notification);
            console.log('[Notification #action]', action);
            const { payload } = notification;
            const id = payload.id;
            const type = payload.type;

            if (type === 'chat_message_received' && action === 'opened') {
                try {
                    const chatChannelId = payload.channel;
                    const channel = await getChannel(chatChannelId);
                    const { tabName, screenName, screenParams } = getCurrentScreen(tabNavigation);

                    const isOnDriverChatTab = tabName === 'DriverChatTab';
                    const isOnSameChatChannel = screenName === 'ChatChannel' && screenParams?.channel?.uuid === chatChannelId;

                    if (!isOnDriverChatTab) {
                        tabNavigation.navigate('DriverChatTab', { screen: 'ChatList' });
                    }

                    if (!isOnSameChatChannel) {
                        later(() => {
                            tabNavigation.navigate('DriverChatTab', {
                                screen: 'ChatChannel',
                                params: { channel },
                            });
                        }, 100);
                    } else {
                        console.log('[Navigation] Chat channel already open for this message.');
                    }
                } catch (err) {
                    console.warn('Error trying to open chat channel:', err);
                    toast.error(userFacingError(err, t));
                }
            }

            if (typeof id === 'string' && id.startsWith('order_')) {
                // 前台收到(received)只静默刷新数据；仅司机点击了通知(opened)才允许
                // 跳转，否则会在司机操作中途强行切到 OrderModal 打断当前工作
                reloadActiveOrders();

                if (action !== 'opened') {
                    return;
                }

                try {
                    const order = await fleetbase.orders.findRecord(id);
                    const orderId = order.id;
                    const { tabName, screenName, screenParams } = getCurrentScreen(tabNavigation);

                    const isOnDriverTaskTab = tabName === 'DriverTaskTab';
                    const isOrderModalOpen = screenName === 'OrderModal' && screenParams?.order?.id === orderId;

                    if (!isOnDriverTaskTab) {
                        tabNavigation.navigate('DriverTaskTab', { screen: 'DriverOrderManagement' });
                    }

                    if (!isOrderModalOpen) {
                        later(() => {
                            tabNavigation.navigate('DriverTaskTab', {
                                screen: 'OrderModal',
                                params: { order: order.serialize() },
                            });
                        }, 100);
                    } else {
                        console.log('[Navigation] Order modal already open for this order.');
                    }
                } catch (err) {
                    console.warn('Error navigating to order:', err);
                    toast.error(userFacingError(err, t));
                }
            }
        };

        addNotificationListener(handlePushNotification);

        // 冷启动点通知：监听注册前暂存的 opened 事件由本导航层统一领取补跳
        consumePendingOpened().forEach((notification: any) => handlePushNotification(notification, 'opened'));

        return () => {
            removeNotificationListener(handlePushNotification);
        };
    }, [addNotificationListener, removeNotificationListener, consumePendingOpened, fleetbase, tabNavigation, navigation]);

    return <View style={{ width: '100%', height: '100%', flex: 1 }}>{children}</View>;
};

export default DriverLayout;
