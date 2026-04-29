import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, XStack, YStack } from 'tamagui';
import { useConfig } from '../../contexts/ConfigContext';
import { fetchInventory, type WarehouseOrderRow } from '../../warehouse/warehouseApi';

const PER_PAGE = 20;

/**
 * 在库列表 Tab：分页加载 + 本地搜索（按 tracking_number / recipient_name）。
 *
 * 后端响应可能是 paginate（{data:[], total, last_page}）或纯数组，
 * extractRows 兼容两种。
 */
const WarehouseInventoryScreen = () => {
    const { resolveConnectionConfig } = useConfig();
    const insets = useSafeAreaInsets();

    const [rows, setRows] = useState<WarehouseOrderRow[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (nextPage: number, replace = false) => {
            const host = resolveConnectionConfig('FLEETBASE_HOST');
            if (!host) {
                setError('Fleetbase host not configured');
                return;
            }
            setLoading(true);
            try {
                const resp = await fetchInventory(String(host), nextPage, PER_PAGE);
                const newRows = extractRows(resp);
                const total = extractTotal(resp);

                setRows((prev) => (replace ? newRows : [...prev, ...newRows]));
                const accumulated = (replace ? 0 : rows.length) + newRows.length;
                setHasMore(total > 0 ? accumulated < total : newRows.length === PER_PAGE);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'load failed');
            } finally {
                setLoading(false);
            }
        },
        [resolveConnectionConfig, rows.length]
    );

    useEffect(() => {
        load(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        await load(1, true);
        setRefreshing(false);
    }, [load]);

    const onEndReached = useCallback(async () => {
        if (loading || !hasMore) return;
        const next = page + 1;
        setPage(next);
        await load(next, false);
    }, [loading, hasMore, page, load]);

    const filtered = useMemo(() => {
        if (!query.trim()) return rows;
        const q = query.trim().toLowerCase();
        return rows.filter(
            (r) =>
                (r.tracking_number ?? '').toLowerCase().includes(q) ||
                (r.recipient_name ?? '').toLowerCase().includes(q) ||
                (r.public_id ?? '').toLowerCase().includes(q)
        );
    }, [rows, query]);

    return (
        <YStack flex={1} pt={insets.top + 12} px='$4'>
            <XStack alignItems='center' justifyContent='space-between' mb='$3'>
                <Text fontSize='$7' fontWeight='800' color='$textPrimary'>
                    在库 {rows.length}
                </Text>
            </XStack>

            <Input
                size='$4'
                value={query}
                onChangeText={setQuery}
                placeholder='搜索运单号 / 收件人'
                autoCapitalize='none'
                autoCorrect={false}
                mb='$3'
            />

            {error && (
                <YStack p='$3' bg='$red3' borderRadius='$3' mb='$3'>
                    <Text color='$red11'>{error}</Text>
                </YStack>
            )}

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.uuid}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.4}
                renderItem={({ item }) => (
                    <YStack
                        py='$3'
                        px='$3'
                        mb='$2'
                        bg='$backgroundStrong'
                        borderRadius='$3'
                        borderWidth={1}
                        borderColor='$borderColor'
                    >
                        <Text fontSize='$4' fontWeight='700' color='$textPrimary'>
                            {item.tracking_number ?? item.public_id}
                        </Text>
                        <Text fontSize='$2' color='$textSecondary' mt='$1'>
                            {item.recipient_name ?? '—'} · {item.dest_city ?? '—'}
                        </Text>
                        <Text fontSize='$2' color='$textSecondary'>
                            {item.route_code ? `Route ${item.route_code}` : ''}
                            {item.package_count ? ` · ${item.package_count} 件` : ''}
                            {item.days_in_warehouse != null ? ` · 入库 ${item.days_in_warehouse} 天` : ''}
                        </Text>
                    </YStack>
                )}
                ListEmptyComponent={
                    !loading ? (
                        <Text color='$textSecondary' textAlign='center' mt='$6'>
                            {query ? '无匹配结果' : '暂无在库订单'}
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
    if (d && typeof d === 'object' && 'total' in (d as Record<string, unknown>)) {
        return Number((d as { total?: unknown }).total ?? 0);
    }
    return 0;
}

export default WarehouseInventoryScreen;
