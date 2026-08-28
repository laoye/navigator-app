import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { Notifications } from 'react-native-notifications';
import useStorage from '../hooks/use-storage';

const requestAndroidNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

        return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
};

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useStorage('_push_notifications', []);
    const [lastNotification, setLastNotification] = useStorage('_last_push_notification');
    const [deviceToken, setDeviceToken] = useStorage('_device_token');
    const notificationListeners = useRef([]);
    // 监听者注册前就已发生的 opened 事件(冷启动点通知、导航层未挂载)先暂存，
    // 等第一个监听者(DriverLayout)注册后补发，否则跳转会静默丢失
    const pendingOpenedRef = useRef<any[]>([]);

    const dispatchToListeners = (notification: any, action: string) => {
        if (action === 'opened' && notificationListeners.current.length === 0) {
            pendingOpenedRef.current.push(notification);
            return;
        }
        notificationListeners.current.forEach((listener) => listener(notification, action));
    };

    // Function to add a listener
    const addNotificationListener = (callback) => {
        notificationListeners.current.push(callback);

        if (pendingOpenedRef.current.length > 0) {
            const pending = pendingOpenedRef.current;
            pendingOpenedRef.current = [];
            pending.forEach((notification) => callback(notification, 'opened'));
        }
    };

    // Function to remove a listener
    const removeNotificationListener = (callback) => {
        notificationListeners.current = notificationListeners.current.filter((listener) => listener !== callback);
    };

    useEffect(() => {
        const registerRemoteNotifications = async () => {
            await requestAndroidNotificationPermission();
            Notifications.registerRemoteNotifications();
        };

        registerRemoteNotifications();

        // App 被系统杀死后点推送启动：opened 事件发生在 JS 注册监听之前，
        // 只能靠 getInitialNotification 拿到，否则冷启动点通知只会停在首页
        Notifications.getInitialNotification()
            .then((notification) => {
                if (notification) {
                    setLastNotification(notification);
                    dispatchToListeners(notification, 'opened');
                }
            })
            .catch((err) => console.warn('Error getting initial notification:', err));

        // 服务端 payload 带 badge 时数字会一直挂在图标上；进入前台即清零
        const clearBadge = () => {
            if (Platform.OS === 'ios') {
                Notifications.ios.setBadgeCount(0);
            }
        };
        clearBadge();
        const appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                clearBadge();
            }
        });

        // Foreground notification handler
        const notificationDisplayedListener = Notifications.events().registerNotificationReceivedForeground((notification, completion) => {
            console.log('Notification received in foreground:', notification);
            setLastNotification(notification);
            // 只留最近 50 条，避免持久化存储无限增长
            setNotifications((prev) => [...prev, notification].slice(-50));

            // Notify all listeners
            dispatchToListeners(notification, 'received');

            completion({ alert: true, sound: true, badge: false });
        });

        // Notification opened handler
        const notificationOpenedListener = Notifications.events().registerNotificationOpened((notification, completion, action) => {
            console.log('Notification opened:', notification);
            setLastNotification(notification);

            dispatchToListeners(notification, 'opened');

            completion();
        });

        // Remote notifications registered successfully
        const registeredListener = Notifications.events().registerRemoteNotificationsRegistered((event) => {
            setDeviceToken(event.deviceToken);
            console.log('Device registered for remote notifications:', event.deviceToken);
        });

        // Failed to register for remote notifications
        const registrationFailedListener = Notifications.events().registerRemoteNotificationsRegistrationFailed((error) => {
            console.warn('Failed to register for remote notifications:', error);
        });

        // Clean up listeners on unmount
        return () => {
            appStateSubscription.remove();
            notificationDisplayedListener.remove();
            notificationOpenedListener.remove();
            registeredListener.remove();
            registrationFailedListener.remove();
        };
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, lastNotification, deviceToken, addNotificationListener, removeNotificationListener }}>{children}</NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
