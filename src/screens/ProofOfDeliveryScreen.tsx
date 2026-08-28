import { useState, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Button, Image, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { Order, Place } from '@fleetbase/sdk';
import { titleize } from 'inflected';
import { SectionHeader, SectionInfoLine } from '../components/Content';
import { isNone, resizePhoto } from '../utils';
import { toast } from '../utils/toast';
import { useTempStore } from '../contexts/TempStoreContext';
import useDimensions from '../hooks/use-dimensions';
import useFleetbase from '../hooks/use-fleetbase';
import useAppTheme from '../hooks/use-app-theme';
import QrCodeScanner from '../components/QrCodeScanner';
import CameraCapture from '../components/CameraCapture';
import BackButton from '../components/BackButton';
import CustomHeader from '../components/CustomHeader';
import LoadingOverlay from '../components/LoadingOverlay';
import SignatureCanvas from 'react-native-signature-canvas';
import { useLanguage } from '../contexts/LanguageContext';

const ProofOfDeliveryScreen = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { adapter } = useFleetbase();
    const { setValue } = useTempStore();
    const { screenWidth, screenHeight } = useDimensions();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingOverlayMessage, setLoadingOverlayMessage] = useState(t('ProofOfDeliveryScreen.capturing'));
    // 活动未配置 pod_method 时（ForBox 强制 POD 拦截路径就不带这个字段），
    // 由司机在兜底页自选采集方式；此前这里会渲染一块无返回按钮的纯白屏。
    const [fallbackMethod, setFallbackMethod] = useState<'photo' | 'signature' | null>(null);
    const signatureScreenRef = useRef(null);
    const params = route.params ?? {};
    const activity = params.activity;
    const order = new Order(params.order, adapter);
    const waypoint = new Place(params.waypoint, adapter);
    const entity = params.entity;
    // 配置值必须是已知类型才采用——服务端可能给空串或未知值（?? 只挡 null/undefined），
    // 那种情况下选择页的按钮会点了不生效
    const VALID_POD_METHODS = ['scan', 'photo', 'signature'];
    const configuredMethod = activity?.pod_method;
    const method = VALID_POD_METHODS.includes(configuredMethod) ? configuredMethod : fallbackMethod;
    const isWaypointActivity = waypoint && typeof waypoint.getAttribute('tracking') === 'string' && waypoint.getAttribute('tracking').length;
    const subject = entity ?? (isWaypointActivity ? waypoint : order);

    const signatureWebStyle = `.m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { position: absolute; bottom: 0; left: 0; right: 0; min-height: 80px; padding-bottom: 2rem; padding-top: 1.75rem; border-top: 1px ${theme['$borderColor'].val} solid; background-color: ${theme['$surface'].val} }
              .m-signature-pad--footer > .button { background-color: 'transparent'; font-size: 0.75rem; color: ${theme['$textPrimary'].val}; }
              .m-signature-pad--footer > .description { font-size: 0.75rem; color: ${theme['$textSecondary'].val}; }
              body,html { width: ${screenWidth}px; height: ${screenHeight}px; }`;

    const handleQrCodeScan = useCallback(
        async (data) => {
            setIsLoading(true);

            try {
                const proof = await order.captureQrCode(subject, { code: data.value, data, waypoint: waypoint?.id });
                setValue('proof', { proof, activity, order: order.id, waypoint: waypoint?.id, entity: entity?.id });
                navigation.goBack();
            } catch (err) {
                toast.error(err.message ?? t('ProofOfDeliveryScreen.qrValidateFailed'));
                console.warn('Error capturing QR code as proof:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [navigation]
    );

    const handleSignatureCompleted = useCallback(
        async (signature) => {
            setIsLoading(true);

            try {
                const proof = await order.captureSignature(subject, { signature });
                setValue('proof', { proof, activity, order: order.id, waypoint: waypoint?.id, entity: entity?.id });
                navigation.goBack();
            } catch (err) {
                toast.error(err.message ?? t('ProofOfDeliveryScreen.signatureSaveFailed'));
                console.warn('Error capturing signature as proof:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [navigation]
    );

    const handlePhotosCaptured = useCallback(
        async (photos = []) => {
            setIsLoading(true);

            try {
                // 逐张压缩：单张失败（低存储/文件被清理等）跳过并提示，
                // 不能让一张坏图把全屏遮罩卡死到只能杀进程
                const resizedPhotos = [];
                let failedCount = 0;
                for (const p of photos) {
                    try {
                        const smallUri = await resizePhoto(p.uri);
                        resizedPhotos.push({ uri: smallUri });
                    } catch (err) {
                        failedCount++;
                        console.warn('Error resizing proof photo:', err);
                    }
                }

                if (failedCount > 0) {
                    toast.error(t('ProofOfDeliveryScreen.photosFailedToProcess', { count: failedCount }));
                }
                if (resizedPhotos.length === 0) {
                    return;
                }

                const form = new FormData();
                resizedPhotos.forEach((p, i) => {
                    form.append(`photos[${i}]`, {
                        uri: p.uri,
                        name: `photo-${i}.jpg`,
                        type: 'image/jpeg',
                    });
                });

                const proof = await adapter.post(`orders/${order.id}/capture-photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                setValue('proof', { proof, activity, order: order.id, waypoint: waypoint?.id, entity: entity?.id });
                navigation.goBack();
            } catch (err) {
                toast.error(err.message ?? t('ProofOfDeliveryScreen.photoUploadFailed'));
                console.warn('Error capturing photos as proof:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [adapter, navigation]
    );

    if (method === 'scan') {
        return (
            <YStack bg='transparent' flex={1}>
                <LoadingOverlay visible={isLoading} text={loadingOverlayMessage} textColor={isDarkMode ? '$textPrimary' : '$white'} />
                <CustomHeader headerTransparent={true} headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
                <QrCodeScanner onScan={handleQrCodeScan} />
            </YStack>
        );
    }

    if (method === 'photo') {
        return (
            <YStack bg='transparent' flex={1} position='relative'>
                <LoadingOverlay visible={isLoading} text={loadingOverlayMessage} textColor={isDarkMode ? '$textPrimary' : '$white'} />
                <CustomHeader
                    headerTransparent={true}
                    headerShadowVisible={false}
                    headerLeft={<BackButton />}
                    headerLeftStyle={{ paddingLeft: 10 }}
                    headerStyle={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                />
                <CameraCapture onDone={handlePhotosCaptured} />
            </YStack>
        );
    }

    if (method === 'signature') {
        return (
            <YStack bg='$white' flex={1}>
                <LoadingOverlay visible={isLoading} text={loadingOverlayMessage} textColor={isDarkMode ? '$textPrimary' : '$white'} />
                <CustomHeader headerTransparent={true} headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
                <SignatureCanvas
                    ref={signatureScreenRef}
                    onOK={handleSignatureCompleted}
                    backgroundColor={'white'}
                    style={{ backgroundColor: 'white', flex: 1, width: '100%', height: '100%' }}
                    webStyle={signatureWebStyle}
                />
            </YStack>
        );
    }

    // 兜底：pod_method 未配置或未知。渲染可返回的选择页，让司机自选采集方式，
    // 而不是一块连返回按钮都没有的白屏。
    return (
        <YStack bg='$background' flex={1}>
            <CustomHeader headerTransparent={true} headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
            <YStack flex={1} alignItems='center' justifyContent='center' px='$5' space='$4'>
                <Text color='$textPrimary' fontSize='$6' fontWeight='bold' textAlign='center'>
                    {t('ProofOfDeliveryScreen.chooseMethodTitle')}
                </Text>
                <Text color='$textSecondary' fontSize='$4' textAlign='center'>
                    {t('ProofOfDeliveryScreen.chooseMethodHint')}
                </Text>
                <YStack width='100%' space='$3' mt='$3'>
                    <Button size='$5' bg='$primary' onPress={() => setFallbackMethod('photo')}>
                        <Button.Text color='white'>{t('ProofOfDeliveryScreen.methodPhoto')}</Button.Text>
                    </Button>
                    <Button size='$5' onPress={() => setFallbackMethod('signature')}>
                        <Button.Text>{t('ProofOfDeliveryScreen.methodSignature')}</Button.Text>
                    </Button>
                </YStack>
            </YStack>
        </YStack>
    );
};

export default ProofOfDeliveryScreen;
