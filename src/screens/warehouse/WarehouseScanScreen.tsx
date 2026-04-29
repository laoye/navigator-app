import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faTimes, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { toast } from '@backpackapp-io/react-native-toast';
import { useConfig } from '../../contexts/ConfigContext';
import {
    enqueuePendingScan,
    loadPendingScans,
    removePendingScan,
    savePendingScans,
    scanIn,
    scanOut,
    type PendingScan,
} from '../../warehouse/warehouseApi';

type ScanMode = 'scan-in' | 'scan-out';

interface RecentScan {
    id: string;
    code: string;
    mode: ScanMode;
    success: boolean;
    message: string;
    at: string;
}

/**
 * 仓库员工扫码 Tab。
 *
 * MVP：手动输入运单号 → 调 scan-in/out。摄像头扫码留接口位（后续接入
 * react-native-vision-camera + barcode-scanner）。
 *
 * 失败时入弱网重试队列（MMKV `_warehouse_pending_scans`），用户可一键重试。
 */
const WarehouseScanScreen = () => {
    const { resolveConnectionConfig } = useConfig();
    const insets = useSafeAreaInsets();

    const [mode, setMode] = useState<ScanMode>('scan-in');
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [recents, setRecents] = useState<RecentScan[]>([]);
    const [pending, setPending] = useState<PendingScan[]>([]);

    useEffect(() => {
        setPending(loadPendingScans());
    }, []);

    const submitScan = useCallback(
        async (mode: ScanMode, code: string) => {
            const host = resolveConnectionConfig('FLEETBASE_HOST');
            if (!host) {
                throw new Error('Fleetbase host not configured');
            }
            return mode === 'scan-in' ? scanIn(String(host), code) : scanOut(String(host), code);
        },
        [resolveConnectionConfig]
    );

    const handleSubmit = async () => {
        const trimmed = code.trim();
        if (!trimmed) return;
        setSubmitting(true);
        try {
            const res = await submitScan(mode, trimmed);
            const ok = res.status === 'ok';
            const msg = ok
                ? `${res.data?.tracking_number ?? trimmed} ${mode === 'scan-in' ? '已入库' : '已出库'}`
                : res.message ?? 'failed';

            setRecents((prev) =>
                [
                    {
                        id: `${Date.now()}`,
                        code: trimmed,
                        mode,
                        success: ok,
                        message: msg,
                        at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                    },
                    ...prev,
                ].slice(0, 5)
            );
            if (ok) {
                toast.success(msg);
                setCode(''); // 成功才清空
            } else {
                toast.error(msg);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'failed';
            // 入待重试队列
            const pendingItem: PendingScan = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                mode,
                code: trimmed,
                queued_at: new Date().toISOString(),
                last_error: msg,
                attempts: 0,
            };
            enqueuePendingScan(pendingItem);
            setPending(loadPendingScans());

            setRecents((prev) =>
                [
                    {
                        id: `${Date.now()}`,
                        code: trimmed,
                        mode,
                        success: false,
                        message: `${msg}（已加入待重试）`,
                        at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                    },
                    ...prev,
                ].slice(0, 5)
            );
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetryPending = async () => {
        const list = loadPendingScans();
        if (list.length === 0) return;
        let success = 0;
        const remaining: PendingScan[] = [];

        for (const item of list) {
            try {
                await submitScan(item.mode, item.code);
                success++;
            } catch (err) {
                remaining.push({
                    ...item,
                    attempts: item.attempts + 1,
                    last_error: err instanceof Error ? err.message : 'failed',
                });
            }
        }
        savePendingScans(remaining);
        setPending(remaining);
        toast.success(`重试完成：成功 ${success}，剩余 ${remaining.length}`);
    };

    const handleClearPending = () => {
        Alert.alert('确认清空', `将丢弃 ${pending.length} 条待重试记录`, [
            { text: '取消', style: 'cancel' },
            {
                text: '清空',
                style: 'destructive',
                onPress: () => {
                    savePendingScans([]);
                    setPending([]);
                },
            },
        ]);
    };

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps='handled'
        >
            {/* 入库 / 出库 切换 */}
            <XStack mb='$4' space='$2'>
                <Button
                    flex={1}
                    size='$4'
                    bg={mode === 'scan-in' ? '$blue9' : '$backgroundStrong'}
                    borderColor='$borderColor'
                    borderWidth={1}
                    onPress={() => setMode('scan-in')}
                >
                    <Text color={mode === 'scan-in' ? 'white' : '$textPrimary'} fontWeight='700'>
                        入库
                    </Text>
                </Button>
                <Button
                    flex={1}
                    size='$4'
                    bg={mode === 'scan-out' ? '$amber9' : '$backgroundStrong'}
                    borderColor='$borderColor'
                    borderWidth={1}
                    onPress={() => setMode('scan-out')}
                >
                    <Text color={mode === 'scan-out' ? 'white' : '$textPrimary'} fontWeight='700'>
                        出库
                    </Text>
                </Button>
            </XStack>

            {/* 摄像头预览占位（待接入 vision-camera） */}
            <YStack
                height={200}
                bg='$backgroundStrong'
                borderRadius='$4'
                borderWidth={1}
                borderColor='$borderColor'
                alignItems='center'
                justifyContent='center'
                mb='$4'
            >
                <Text color='$textSecondary' fontSize='$3'>
                    摄像头扫码（待接入）
                </Text>
                <Text color='$textSecondary' fontSize='$2' mt='$1'>
                    暂时请在下方手动输入运单号
                </Text>
            </YStack>

            {/* 手动输入 + 提交 */}
            <YStack space='$2' mb='$4'>
                <Text fontSize='$3' color='$textSecondary'>
                    运单号
                </Text>
                <Input
                    size='$4'
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize='characters'
                    autoCorrect={false}
                    placeholder='FB20260429001'
                    editable={!submitting}
                />
                <Button
                    size='$4'
                    onPress={handleSubmit}
                    disabled={submitting || !code.trim()}
                    bg={mode === 'scan-in' ? '$blue9' : '$amber9'}
                    pressStyle={{ opacity: 0.9 }}
                >
                    <Text color='white' fontWeight='700'>
                        {submitting ? '提交中…' : mode === 'scan-in' ? '确认入库' : '确认出库'}
                    </Text>
                </Button>
            </YStack>

            {/* 最近 5 次 */}
            {recents.length > 0 && (
                <YStack mb='$4'>
                    <Text mb='$2' fontSize='$3' fontWeight='600' color='$textSecondary'>
                        最近操作
                    </Text>
                    <YStack space='$2'>
                        {recents.map((r) => (
                            <XStack
                                key={r.id}
                                alignItems='center'
                                space='$3'
                                px='$3'
                                py='$2'
                                bg='$backgroundStrong'
                                borderRadius='$3'
                            >
                                <FontAwesomeIcon
                                    icon={r.success ? faCheck : faTimes}
                                    color={r.success ? '#10b981' : '#ef4444'}
                                    size={14}
                                />
                                <YStack flex={1}>
                                    <Text fontSize='$3' color='$textPrimary'>
                                        {r.code}
                                    </Text>
                                    <Text fontSize='$2' color='$textSecondary'>
                                        {r.mode === 'scan-in' ? '入库' : '出库'} · {r.at} · {r.message}
                                    </Text>
                                </YStack>
                            </XStack>
                        ))}
                    </YStack>
                </YStack>
            )}

            {/* 待重试队列 */}
            {pending.length > 0 && (
                <YStack
                    p='$3'
                    bg='$amber3'
                    borderRadius='$3'
                    borderWidth={1}
                    borderColor='$amber7'
                    space='$2'
                >
                    <Text color='$amber11' fontWeight='700'>
                        待重试 {pending.length} 条
                    </Text>
                    {pending.slice(0, 5).map((p) => (
                        <Text key={p.id} fontSize='$2' color='$textSecondary'>
                            {p.code}（{p.mode === 'scan-in' ? '入库' : '出库'}，已尝试 {p.attempts} 次）
                        </Text>
                    ))}
                    <XStack space='$2' mt='$1'>
                        <Button
                            size='$3'
                            flex={1}
                            bg='$amber9'
                            onPress={handleRetryPending}
                            icon={<FontAwesomeIcon icon={faRotateRight} color='white' size={12} />}
                        >
                            <Text color='white' fontWeight='600'>
                                重试全部
                            </Text>
                        </Button>
                        <Button size='$3' flex={1} bg='$backgroundStrong' onPress={handleClearPending}>
                            <Text color='$textPrimary'>清空</Text>
                        </Button>
                    </XStack>
                </YStack>
            )}
        </ScrollView>
    );
};

export default WarehouseScanScreen;
