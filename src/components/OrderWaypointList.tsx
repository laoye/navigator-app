import React, { useState } from 'react';
import { Linking } from 'react-native';
import { XStack, YStack, Text, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import Collapsible from 'react-native-collapsible';
import Badge from './Badge';
import { isArray, isEmpty } from '../utils';
import { lowercase } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 拨打站点电话。
 *
 * 是 WaypointItem 的固有行为而非调用方职责：onCall 此前是必填 prop，但
 * AdhocOrderCard / PastOrderCard / OrderActivitySelect 三处都没传，站点带
 * 电话时号码会渲染成按钮，司机一点就 "undefined is not a function" 整个
 * App 崩掉。给它一个默认实现，调用方仍可覆盖。
 */
export const callPhone = (phone?: string) => {
    if (phone) {
        Linking.openURL(`tel:${phone}`);
    }
};

export const COLLAPSE_POINT = 2;
export const CIRCLE_SIZE = 32;

interface WaypointCircleProps {
    number: number;
    backgroundColor: string;
}
export const WaypointCircle: React.FC<WaypointCircleProps> = ({
    icon,
    iconColor,
    iconSize,
    number,
    backgroundColor,
    fontColor = '$successText',
    circleSize = CIRCLE_SIZE,
    mr = '$3',
    ...props
}) => (
    <YStack mr={mr}>
        <YStack borderRadius={circleSize} backgroundColor={backgroundColor} width={circleSize} height={circleSize} alignItems='center' justifyContent='center' {...props}>
            {icon ? (
                <FontAwesomeIcon icon={icon} color={iconColor} size={iconSize} />
            ) : (
                <Text fontWeight='bold' color={fontColor}>
                    {number}
                </Text>
            )}
        </YStack>
    </YStack>
);

// 组件早就在解构这些 prop，接口却只声明了一小半，于是「必填的 onCall 三个调用点
// 都没传」这种错 TS 拦不住（报的是别的字段缺失，淹没在既有错误里）。补齐后同类
// 问题才会在编译期暴露。
interface WaypointItemProps {
    // 传了 icon 的调用方（卡片、活动弹窗）只显示一个图标圆圈，没有序号可言
    index?: number;
    waypoint: any;
    title?: any;
    titleStyle?: any;
    textStyle?: any;
    onCall?: (phone: string) => void;
    icon?: any;
    iconColor?: any;
    iconSize?: any;
    isLast?: boolean;
    circleBackgroundColor?: any;
    circleBorderColor?: any;
    circleFontColor?: any;
    children?: any;
}
export const WaypointItem: React.FC<WaypointItemProps> = ({
    index,
    waypoint,
    title,
    textStyle,
    titleStyle,
    onCall = callPhone,
    icon,
    iconColor,
    iconSize,
    isLast = false,
    circleBackgroundColor = '$success',
    circleBorderColor = '$successBorder',
    circleFontColor = '$successText',
    children,
}) => (
    <XStack alignItems='center' mb={isLast ? 0 : '$4'} width='100%'>
        <WaypointCircle
            number={index}
            icon={icon}
            iconSize={iconSize}
            iconColor={iconColor}
            backgroundColor={circleBackgroundColor}
            borderWidth={1}
            borderColor={circleBorderColor}
            fontColor={circleFontColor}
        />
        <YStack flex={1}>
            {title && (
                <Text fontSize='$2' color='$textPrimary' {...titleStyle}>
                    {title}
                </Text>
            )}
            <Text fontSize='$2' color={title ? '$textSecondary' : '$textPrimary'} textDecorationLine={waypoint.complete ? 'line-through' : 'none'} {...textStyle}>
                {waypoint.address}
            </Text>
            {waypoint.phone && (
                <Button onPress={() => onCall(waypoint.phone)} backgroundColor='transparent' padding={0}>
                    <Text fontSize='$2' color='gray' {...textStyle}>
                        {waypoint.phone}
                    </Text>
                </Button>
            )}
            {typeof children === 'function' && children({ waypoint, index })}
        </YStack>
    </XStack>
);

interface WaypointCollapseButtonProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    count: number;
    textStyle?: any;
}
const WaypointCollapseButton: React.FC<WaypointCollapseButtonProps> = ({ isCollapsed, toggleCollapse, count, textStyle }) => {
    const theme = useTheme();
    const { t } = useLanguage();

    return (
        <XStack alignItems='center' mb='$4' width='100%'>
            <Button onPress={toggleCollapse} width='100%' backgroundColor='transparent' padding={0}>
                <YStack paddingHorizontal='$3' paddingVertical='$2' width='100%' backgroundColor='$warning' borderWidth={1} borderColor='$warningBorder' borderRadius='$2' elevation={1}>
                    <XStack alignItems='center'>
                        <FontAwesomeIcon icon={faEye} style={{ marginRight: 8, color: theme['$warningText'].val }} />
                        <Text fontWeight='bold' color='$warningText' {...textStyle}>
                            {isCollapsed ? t('OrderWaypointList.tapToExpand') : t('OrderWaypointList.tapToCollapse')}
                        </Text>
                    </XStack>
                    <Text color='$warningText' {...textStyle}>
                        {t('OrderWaypointList.moreWaypoints', { count })}
                    </Text>
                </YStack>
            </Button>
        </XStack>
    );
};

interface OrderWaypointsProps {
    order: any;
    onPress?: () => void;
    wrapperStyle?: any;
    containerStyle?: any;
    textStyle?: any;
}

const OrderWaypointList: React.FC<OrderWaypointsProps> = ({ order, onPress, wrapperStyle, containerStyle, textStyle, children }) => {
    const [isWaypointsCollapsed, setIsWaypointsCollapsed] = useState(true);

    // Helper functions to extract waypoint data
    const getFirstWaypoint = (order) => {
        const payload = order.getAttribute('payload');
        if (!payload) return null;
        if (payload.pickup) return payload.pickup;
        const first = { ...(payload.waypoints[0] ?? payload.dropoff) };
        if (first) {
            first.completed = first.status_code === 'COMPLETED';
        }
        return first;
    };

    const getLastWaypoint = (order) => {
        const payload = order.getAttribute('payload');
        if (!payload) return null;
        if (payload.dropoff) return payload.dropoff;
        const lastWaypoint = payload.waypoints[payload.waypoints.length - 1];
        const last = lastWaypoint ? { ...lastWaypoint } : null;
        if (last) {
            last.completed = last.status_code === 'COMPLETED';
        }
        return last;
    };

    const getMiddleWaypoints = (order) => {
        const payload = order.getAttribute('payload');
        if (!payload) return [];
        const { waypoints, pickup, dropoff } = payload;
        if (!pickup && !dropoff && waypoints.length) {
            const middle = waypoints.slice(1, waypoints.length - 1);
            middle.map((wp) => {
                return {
                    ...wp,
                    completed: wp.status_code === 'COMPLETED',
                };
            });
            return middle;
        }
        return waypoints || [];
    };

    const toggleWaypointCollapse = () => {
        setIsWaypointsCollapsed((prev) => !prev);
    };

    const firstWaypoint = getFirstWaypoint(order);
    const lastWaypoint = getLastWaypoint(order);
    const middleWaypoints = getMiddleWaypoints(order);
    const payload = order.getAttribute('payload');

    return (
        <YStack overflow='hidden' {...wrapperStyle}>
            <YStack width='100%' {...containerStyle} onPress={onPress}>
                <YStack position='relative' zIndex={20}>
                    <YStack position='absolute' left={CIRCLE_SIZE / 2} top={CIRCLE_SIZE / 2} bottom={CIRCLE_SIZE / 2} borderLeftWidth={2} borderColor='$secondary' opacity={0.75} />
                    {payload && (
                        <YStack>
                            {firstWaypoint && (
                                <WaypointItem index={1} waypoint={firstWaypoint} textStyle={textStyle}>
                                    {typeof children === 'function' && children()}
                                </WaypointItem>
                            )}

                            {/* 中间站带上名称：ForBox 的中转仓夹在商家和客户之间，光有地址司机分不清那一行是什么 */}
                            {isArray(middleWaypoints) &&
                                middleWaypoints.length < COLLAPSE_POINT &&
                                middleWaypoints.map((wp, i) => (
                                    <WaypointItem key={i} index={i + 2} waypoint={wp} title={wp?.name} textStyle={textStyle}>
                                        {typeof children === 'function' && children()}
                                    </WaypointItem>
                                ))}

                            {isArray(middleWaypoints) && middleWaypoints.length >= COLLAPSE_POINT && (
                                <YStack>
                                    <WaypointCollapseButton isCollapsed={isWaypointsCollapsed} toggleCollapse={toggleWaypointCollapse} count={middleWaypoints.length} textStyle={textStyle} />
                                    <Collapsible collapsed={isWaypointsCollapsed}>
                                        {middleWaypoints.map((wp, i) => (
                                            <WaypointItem key={i} index={i + 2} waypoint={wp} textStyle={textStyle}>
                                                {typeof children === 'function' && children()}
                                            </WaypointItem>
                                        ))}
                                    </Collapsible>
                                </YStack>
                            )}

                            {lastWaypoint && (
                                <WaypointItem index={isArray(middleWaypoints) ? middleWaypoints.length + 2 : 2} waypoint={lastWaypoint} textStyle={textStyle} isLast>
                                    {typeof children === 'function' && children()}
                                </WaypointItem>
                            )}
                        </YStack>
                    )}
                </YStack>
            </YStack>
        </YStack>
    );
};

export default OrderWaypointList;
