import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Button, Text, TextArea, XStack, YStack, Spinner, ScrollView } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation, faCamera, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Order } from '@fleetbase/sdk';
import { resizePhoto } from '../utils';
import { toast } from '../utils/toast';
import { reportOrderException } from '../utils/forboxApi';
import { useTempStore } from '../contexts/TempStoreContext';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useFleetbase from '../hooks/use-fleetbase';
import CameraCapture from '../components/CameraCapture';
import CustomHeader from '../components/CustomHeader';
import BackButton from '../components/BackButton';

const MAX_REASON_LENGTH = 500;

/**
 * 司机现场异常上报。
 *
 * 只采集"发生了什么"（原因 + 照片），不让司机选异常类型——类型决定费用和状态跳转
 * （拒收收退回费、改约回到 dispatched 等），选错就是错误账单，那是运营的判断。
 * 上报成功后由 OrderScreen 接着把活动推进成 exception。
 *
 * 注意 exception 在 OrderConfig 流程里是单向门：后继只有 canceled，推进后回不到
 * 正常配送流程，要运营在 ops 端定性后才能拉回，所以提交前明确告知司机。
 */
const OrderExceptionScreen = ({ route }) => {
    const navigation = useNavigation();
    const { adapter } = useFleetbase();
    const { setValue } = useTempStore();
    const { resolveConnectionConfig } = useConfig();
    const { authToken } = useAuth();
    const { t } = useLanguage();

    const params = route.params ?? {};
    const activity = params.activity;
    const order = new Order(params.order, adapter);

    const [reason, setReason] = useState('');
    const [photoProofUuids, setPhotoProofUuids] = useState<string[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePhotosCaptured = useCallback(
        async (photos = []) => {
            setShowCamera(false);
            if (photos.length === 0) {
                return;
            }
            setIsUploading(true);

            try {
                // 逐张压缩，单张失败跳过而不是让整批作废——现场重拍的成本比丢一张高
                const resized = [];
                for (const photo of photos) {
                    try {
                        resized.push({ uri: await resizePhoto(photo.uri) });
                    } catch (err) {
                        console.warn('Error resizing exception photo:', err);
                    }
                }
                if (resized.length === 0) {
                    return toast.error(t('OrderExceptionScreen.photoUploadFailed'));
                }

                const form = new FormData();
                resized.forEach((photo, index) => {
                    form.append(`photos[${index}]`, { uri: photo.uri, name: `exception-${index}.jpg`, type: 'image/jpeg' });
                });

                const proof = await adapter.post(`orders/${order.id}/capture-photo`, form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const proofId = proof?.uuid ?? proof?.id;
                if (proofId) {
                    setPhotoProofUuids((current) => [...current, proofId]);
                }
            } catch (err) {
                toast.error(err.message ?? t('OrderExceptionScreen.photoUploadFailed'));
                console.warn('Error uploading exception photos:', err);
            } finally {
                setIsUploading(false);
            }
        },
        [adapter, order.id, t]
    );

    const handleSubmit = useCallback(async () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            return toast.error(t('OrderExceptionScreen.reasonRequired'));
        }

        setIsSubmitting(true);

        try {
            // 先落异常记录再回去推进状态：上报失败时订单保持原状，
            // 否则会出现"状态已变异常、运营却查不到原因"的空档
            await reportOrderException(resolveConnectionConfig('FLEETBASE_HOST'), authToken, order.id, {
                reason: trimmedReason,
                photoProofUuids,
            });

            setValue('exceptionReport', { activity, order: order.id });
            navigation.goBack();
        } catch (err) {
            toast.error(err.message || t('OrderExceptionScreen.submitFailed'));
            console.warn('Error reporting order exception:', err);
        } finally {
            setIsSubmitting(false);
        }
    }, [reason, photoProofUuids, authToken, resolveConnectionConfig, order.id, activity, setValue, navigation, t]);

    if (showCamera) {
        return (
            <YStack bg='transparent' flex={1} position='relative'>
                <CustomHeader
                    headerTransparent={true}
                    headerShadowVisible={false}
                    headerLeft={<BackButton onPress={() => setShowCamera(false)} />}
                    headerLeftStyle={{ paddingLeft: 10 }}
                    headerStyle={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                />
                <CameraCapture onDone={handlePhotosCaptured} />
            </YStack>
        );
    }

    return (
        <YStack flex={1} bg='$background'>
            <CustomHeader headerShadowVisible={false} headerLeft={<BackButton />} headerLeftStyle={{ paddingLeft: 10 }} />
            <ScrollView flex={1} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps='handled'>
                <YStack space='$4'>
                    <XStack space='$3' alignItems='flex-start' bg='$warning' borderColor='$warningBorder' borderWidth={1} borderRadius='$4' p='$3'>
                        <FontAwesomeIcon icon={faTriangleExclamation} size={18} color='#b45309' />
                        <Text flex={1} color='$warningText' fontSize='$3' lineHeight={20}>
                            {t('OrderExceptionScreen.warning')}
                        </Text>
                    </XStack>

                    <YStack space='$2'>
                        <Text color='$textPrimary' fontWeight='bold' fontSize='$4'>
                            {t('OrderExceptionScreen.reasonLabel')}
                        </Text>
                        <TextArea
                            value={reason}
                            onChangeText={setReason}
                            placeholder={t('OrderExceptionScreen.reasonPlaceholder')}
                            maxLength={MAX_REASON_LENGTH}
                            minHeight={140}
                            borderWidth={1}
                            borderColor='$borderColor'
                            disabled={isSubmitting}
                        />
                        <Text color='$textSecondary' fontSize='$2' textAlign='right'>
                            {reason.length} / {MAX_REASON_LENGTH}
                        </Text>
                    </YStack>

                    <YStack space='$2'>
                        <Text color='$textPrimary' fontWeight='bold' fontSize='$4'>
                            {t('OrderExceptionScreen.photosLabel')}
                        </Text>
                        <Button
                            size='$4'
                            disabled={isUploading || isSubmitting}
                            onPress={() => setShowCamera(true)}
                            icon={isUploading ? <Spinner /> : <FontAwesomeIcon icon={faCamera} size={16} />}
                        >
                            <Button.Text>{t('OrderExceptionScreen.addPhotos')}</Button.Text>
                        </Button>
                        {photoProofUuids.length > 0 && (
                            <XStack space='$2' alignItems='center'>
                                <FontAwesomeIcon icon={faCheck} size={14} color='#16a34a' />
                                <Text color='$textSecondary' fontSize='$3'>
                                    {t('OrderExceptionScreen.photosAdded', { count: photoProofUuids.length })}
                                </Text>
                            </XStack>
                        )}
                    </YStack>

                    <Button
                        size='$5'
                        bg='$error'
                        disabled={isSubmitting || isUploading || reason.trim().length === 0}
                        opacity={reason.trim().length === 0 ? 0.5 : 1}
                        onPress={handleSubmit}
                        icon={isSubmitting ? <Spinner color='white' /> : undefined}
                    >
                        <Button.Text color='white'>{isSubmitting ? t('OrderExceptionScreen.submitting') : t('OrderExceptionScreen.submit')}</Button.Text>
                    </Button>
                </YStack>
            </ScrollView>
        </YStack>
    );
};

export default OrderExceptionScreen;
