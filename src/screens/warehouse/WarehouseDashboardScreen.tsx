import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowDown, faBoxesStacked, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { useConfig } from '../../contexts/ConfigContext';
import {
    fetchInventory,
    fetchPendingInbound,
    fetchPendingOutbound,
} from '../../warehouse/warehouseApi';

/**
 * 仓库概览 Tab：今日待入库 / 在库 / 待出库 数字面板。
 *
 * MVP 仅做 3 个数字 + 下拉刷新；后续可叠加近 7 日趋势 / 路线分组等。
 */
const WarehouseDashboardScreen = () => {
    const { resolveConnectionConfig } = useConfig();
    const insets = useSafeAreaInsets();

    const [pendingInbound, setPendingInbound] = useState<number | null>(null);
    const [inventory, setInventory] = useState<number | null>(null);
    const [pendingOutbound, setPendingOutbound] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const host = resolveConnectionConfig('FLEETBASE_HOST');
        if (!host) {
            setError('Fleetbase host not configured');
            return;
        }
        try {
            const [pi, inv, po] = await Promise.all([
                fetchPendingInbound(String(host)),
                fetchInventory(String(host), 1, 1),
                fetchPendingOutbound(String(host)),
            ]);

            setPendingInbound(extractTotal(pi));
            setInventory(extractTotal(inv));
            setPendingOutbound(extractTotal(po));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'load failed');
        }
    }, [resolveConnectionConfig]);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text fontSize='$8' fontWeight='800' color='$textPrimary'>
                ForBox 仓库
            </Text>
            <Text mt='$1' color='$textSecondary' fontSize='$3'>
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </Text>

            {error && (
                <YStack mt='$4' p='$3' bg='$red3' borderRadius='$3'>
                    <Text color='$red11' fontSize='$3'>
                        {error}
                    </Text>
                </YStack>
            )}

            <YStack mt='$5' space='$3'>
                <StatCard label='待入库' value={pendingInbound} icon={faArrowDown} color='#3b82f6' />
                <StatCard label='在库' value={inventory} icon={faBoxesStacked} color='#a855f7' />
                <StatCard label='待出库' value={pendingOutbound} icon={faArrowUp} color='#f59e0b' />
            </YStack>
        </ScrollView>
    );
};

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number | null;
    icon: any;
    color: string;
}) {
    return (
        <XStack
            alignItems='center'
            justifyContent='space-between'
            bg='$backgroundStrong'
            borderRadius='$4'
            borderWidth={1}
            borderColor='$borderColor'
            px='$4'
            py='$4'
        >
            <XStack alignItems='center' space='$3'>
                <YStack
                    width={42}
                    height={42}
                    borderRadius={21}
                    alignItems='center'
                    justifyContent='center'
                    style={{ backgroundColor: `${color}22` }}
                >
                    <FontAwesomeIcon icon={icon} color={color} size={18} />
                </YStack>
                <Text fontSize='$5' color='$textPrimary'>
                    {label}
                </Text>
            </XStack>
            <Text fontSize='$9' fontWeight='800' color='$textPrimary' tabularFigures>
                {value ?? '—'}
            </Text>
        </XStack>
    );
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

export default WarehouseDashboardScreen;
