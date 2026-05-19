import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner, type CodeType } from 'react-native-vision-camera';
import { Button, Text, YStack } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt, faCamera, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../contexts/LanguageContext';

export interface BarcodeScannerProps {
    onScanned: (code: string) => void;
    enabled?: boolean;
    height?: number;
    /** Min ms between two identical-code emissions (default 1500). */
    cooldownMs?: number;
    /** Code symbologies to recognize. Defaults to QR + Code128 + Code39 + EAN13. */
    codeTypes?: CodeType[];
    /** Show torch toggle when the device supports it (default true). */
    enableTorchControl?: boolean;
    /** Show a centered scan reticle overlay (default true). */
    showReticle?: boolean;
}

const DEFAULT_CODE_TYPES: CodeType[] = ['qr', 'code-128', 'code-39', 'ean-13'];

/**
 * 共享条码扫描视图：内置权限请求 / 设备探测 / 命中节流 / 闪光灯 / 扫描蒙版。
 *
 * 命中后只透传识别到的字符串给上层，提交逻辑由调用方决定（组件无业务耦合）。
 */
const BarcodeScanner = ({
    onScanned,
    enabled = true,
    height = 200,
    cooldownMs = 1500,
    codeTypes = DEFAULT_CODE_TYPES,
    enableTorchControl = true,
    showReticle = true,
}: BarcodeScannerProps) => {
    const { t } = useLanguage();
    const device = useCameraDevice('back');
    const [permission, setPermission] = useState<'pending' | 'granted' | 'denied' | 'blocked'>('pending');
    const [torch, setTorch] = useState<'on' | 'off'>('off');
    const lastEmittedRef = useRef<{ code: string; at: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const status = await Camera.getCameraPermissionStatus();
            if (cancelled) return;
            if (status === 'granted') {
                setPermission('granted');
                return;
            }
            const next = await Camera.requestCameraPermission();
            if (cancelled) return;
            if (next === 'granted') setPermission('granted');
            else if (next === 'denied') setPermission('denied');
            else setPermission('blocked');
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const codeScanner = useCodeScanner({
        codeTypes,
        onCodeScanned: (codes) => {
            if (!enabled) return;
            const value = codes.find((c) => typeof c.value === 'string' && c.value.length > 0)?.value;
            if (!value) return;
            const last = lastEmittedRef.current;
            const now = Date.now();
            if (last && last.code === value && now - last.at < cooldownMs) return;
            lastEmittedRef.current = { code: value, at: now };
            onScanned(value);
        },
    });

    const placeholderShell = (children: React.ReactNode) => (
        <YStack
            height={height}
            bg='$backgroundStrong'
            borderRadius='$4'
            borderWidth={1}
            borderColor='$borderColor'
            alignItems='center'
            justifyContent='center'
            px='$4'
            space='$2'
        >
            {children}
        </YStack>
    );

    if (permission === 'pending') {
        return placeholderShell(
            <Text color='$textSecondary' fontSize='$2'>
                {t('BarcodeScanner.requestingPermission')}
            </Text>
        );
    }

    if (permission !== 'granted') {
        return placeholderShell(
            <>
                <FontAwesomeIcon icon={faCamera} color='#999' size={28} />
                <Text color='$textSecondary' fontSize='$2' textAlign='center'>
                    {permission === 'blocked' ? t('BarcodeScanner.permissionBlocked') : t('BarcodeScanner.permissionNeeded')}
                </Text>
                <Button
                    size='$3'
                    onPress={() => {
                        if (permission === 'blocked') {
                            Linking.openSettings().catch(() => undefined);
                        } else {
                            Camera.requestCameraPermission().then((next) => {
                                if (next === 'granted') setPermission('granted');
                                else if (next === 'denied') setPermission('denied');
                                else setPermission('blocked');
                            });
                        }
                    }}
                >
                    <Text>{permission === 'blocked' ? t('BarcodeScanner.openSettings') : t('BarcodeScanner.grant')}</Text>
                </Button>
            </>
        );
    }

    if (!device) {
        return placeholderShell(
            <>
                <FontAwesomeIcon icon={faQrcode} color='#999' size={28} />
                <Text mt='$2' color='$textSecondary' fontSize='$2'>
                    {t('BarcodeScanner.noBackCamera')}
                </Text>
            </>
        );
    }

    const torchActive = torch === 'on';
    const supportsTorch = device.hasTorch;

    return (
        <YStack
            height={height}
            borderRadius={16}
            overflow='hidden'
            borderWidth={1}
            borderColor='$borderColor'
            position='relative'
        >
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={enabled}
                codeScanner={codeScanner}
                torch={supportsTorch ? torch : 'off'}
            />

            {showReticle && (
                <View pointerEvents='none' style={styles.reticleWrap}>
                    <View style={styles.reticle} />
                </View>
            )}

            {enableTorchControl && supportsTorch && (
                <View style={styles.torchWrap}>
                    <Button
                        circular
                        size='$3'
                        bg={torchActive ? '$orange-500' : 'rgba(0,0,0,0.55)'}
                        onPress={() => setTorch((t) => (t === 'on' ? 'off' : 'on'))}
                        icon={
                            <FontAwesomeIcon icon={faBolt} color={torchActive ? '#1a1a1a' : '#fff'} size={14} />
                        }
                    />
                </View>
            )}
        </YStack>
    );
};

const styles = StyleSheet.create({
    reticleWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reticle: {
        width: '70%',
        aspectRatio: 1.6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.85)',
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    torchWrap: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
});

export default BarcodeScanner;
