import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faTimes, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { toast } from '@backpackapp-io/react-native-toast';
import { useConfig } from '../../contexts/ConfigContext';
import { useLanguage } from '../../contexts/LanguageContext';
import BarcodeScanner from '../../components/BarcodeScanner';
import {
    enqueuePendingScan,
    loadPendingScans,
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
    const { t } = useLanguage();
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

    const submitCode = useCallback(
        async (value: string, scanMode: ScanMode) => {
            const trimmed = value.trim();
            if (!trimmed) return;
            setSubmitting(true);
            try {
                const res = await submitScan(scanMode, trimmed);
                const ok = res.status === 'ok';
                const code = res.data?.tracking_number ?? trimmed;
                const msg = ok
                    ? t(scanMode === 'scan-in' ? 'WarehouseScanScreen.successInbound' : 'WarehouseScanScreen.successOutbound', { code })
                    : res.message ?? t('WarehouseScanScreen.failed');

                setRecents((prev) =>
                    [
                        {
                            id: `${Date.now()}`,
                            code: trimmed,
                            mode: scanMode,
                            success: ok,
                            message: msg,
                            at: new Date().toLocaleTimeString(undefined, { hour12: false }),
                        },
                        ...prev,
                    ].slice(0, 5)
                );
                if (ok) {
                    toast.success(msg);
                    setCode('');
                } else {
                    toast.error(msg);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : t('WarehouseScanScreen.failed');
                const pendingItem: PendingScan = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    mode: scanMode,
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
                            mode: scanMode,
                            success: false,
                            message: `${msg}${t('WarehouseScanScreen.queuedSuffix')}`,
                            at: new Date().toLocaleTimeString(undefined, { hour12: false }),
                        },
                        ...prev,
                    ].slice(0, 5)
                );
                toast.error(msg);
            } finally {
                setSubmitting(false);
            }
        },
        [submitScan, t]
    );

    const handleSubmit = () => submitCode(code, mode);

    const handleScanned = useCallback(
        (value: string) => {
            if (submitting) return;
            setCode(value);
            submitCode(value, mode);
        },
        [mode, submitCode, submitting]
    );

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
        toast.success(t('WarehouseScanScreen.retryDone', { success, remaining: remaining.length }));
    };

    const handleClearPending = () => {
        Alert.alert(
            t('WarehouseScanScreen.confirmClear'),
            t('WarehouseScanScreen.confirmClearMessage', { count: pending.length }),
            [
                { text: t('WarehouseScanScreen.cancel'), style: 'cancel' },
                {
                    text: t('WarehouseScanScreen.clear'),
                    style: 'destructive',
                    onPress: () => {
                        savePendingScans([]);
                        setPending([]);
                    },
                },
            ]
        );
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
                    bg={mode === 'scan-in' ? '$blue-600' : '$backgroundStrong'}
                    borderColor='$borderColor'
                    borderWidth={1}
                    onPress={() => setMode('scan-in')}
                >
                    <Text color={mode === 'scan-in' ? 'white' : '$textPrimary'} fontWeight='700'>
                        {t('WarehouseScanScreen.scanIn')}
                    </Text>
                </Button>
                <Button
                    flex={1}
                    size='$4'
                    bg={mode === 'scan-out' ? '$orange-500' : '$backgroundStrong'}
                    borderColor='$borderColor'
                    borderWidth={1}
                    onPress={() => setMode('scan-out')}
                >
                    <Text color={mode === 'scan-out' ? 'white' : '$textPrimary'} fontWeight='700'>
                        {t('WarehouseScanScreen.scanOut')}
                    </Text>
                </Button>
            </XStack>

            {/* 摄像头扫码 */}
            <YStack mb='$4'>
                <BarcodeScanner height={220} enabled={!submitting} onScanned={handleScanned} />
            </YStack>

            {/* 手动输入 + 提交 */}
            <YStack space='$2' mb='$4'>
                <Text fontSize='$3' color='$textSecondary'>
                    {t('WarehouseScanScreen.trackingNumber')}
                </Text>
                <Input
                    size='$4'
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize='characters'
                    autoCorrect={false}
                    placeholder={t('WarehouseScanScreen.trackingPlaceholder')}
                    editable={!submitting}
                />
                <Button
                    size='$4'
                    onPress={handleSubmit}
                    disabled={submitting || !code.trim()}
                    bg={mode === 'scan-in' ? '$blue-600' : '$orange-500'}
                    pressStyle={{ opacity: 0.9 }}
                >
                    <Text color='white' fontWeight='700'>
                        {submitting
                            ? t('WarehouseScanScreen.submitting')
                            : mode === 'scan-in'
                                ? t('WarehouseScanScreen.confirmScanIn')
                                : t('WarehouseScanScreen.confirmScanOut')}
                    </Text>
                </Button>
            </YStack>

            {/* 最近 5 次 */}
            {recents.length > 0 && (
                <YStack mb='$4'>
                    <Text mb='$2' fontSize='$3' fontWeight='600' color='$textSecondary'>
                        {t('WarehouseScanScreen.recentOperations')}
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
                                        {r.mode === 'scan-in' ? t('WarehouseScanScreen.inbound') : t('WarehouseScanScreen.outbound')} · {r.at} · {r.message}
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
                    bg='$orange-100'
                    borderRadius='$3'
                    borderWidth={1}
                    borderColor='$orange-300'
                    space='$2'
                >
                    <Text color='$orange-700' fontWeight='700'>
                        {t('WarehouseScanScreen.pendingCount', { count: pending.length })}
                    </Text>
                    {pending.slice(0, 5).map((p) => (
                        <Text key={p.id} fontSize='$2' color='$textSecondary'>
                            {t('WarehouseScanScreen.queueAttempts', {
                                code: p.code,
                                mode: p.mode === 'scan-in' ? t('WarehouseScanScreen.inbound') : t('WarehouseScanScreen.outbound'),
                                attempts: p.attempts,
                            })}
                        </Text>
                    ))}
                    <XStack space='$2' mt='$1'>
                        <Button
                            size='$3'
                            flex={1}
                            bg='$orange-500'
                            onPress={handleRetryPending}
                            icon={<FontAwesomeIcon icon={faRotateRight} color='white' size={12} />}
                        >
                            <Text color='white' fontWeight='600'>
                                {t('WarehouseScanScreen.retryAll')}
                            </Text>
                        </Button>
                        <Button size='$3' flex={1} bg='$backgroundStrong' onPress={handleClearPending}>
                            <Text color='$textPrimary'>{t('WarehouseScanScreen.clear')}</Text>
                        </Button>
                    </XStack>
                </YStack>
            )}
        </ScrollView>
    );
};

export default WarehouseScanScreen;
