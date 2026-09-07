import React from 'react';
import { Linking } from 'react-native';
import { Modal } from 'react-native';
import { YStack, XStack, Text, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import WaypointList from './WaypointList';
import { useLanguage } from '../contexts/LanguageContext';

interface DestinationChangedAlertProps {
    visible: boolean;
    previousDestination: { getAttribute: (key: string) => string };
    currentDestination: { getAttribute: (key: string) => string };
    waypoints: any[];
    onClose: () => void;
}

const DestinationChangedAlert: React.FC<DestinationChangedAlertProps> = ({ visible, previousDestination, currentDestination, onClose }) => {
    const theme = useTheme();
    const { t } = useLanguage();
    const prevAddress = previousDestination?.getAttribute('address');
    const currAddress = currentDestination?.getAttribute('address');

    return (
        <Modal transparent visible={visible} animationType='fade'>
            <YStack fullscreen backgroundColor='rgba(0,0,0,0.5)' alignItems='center' justifyContent='center'>
                <YStack width='90%' maxWidth={400} borderRadius='$4' borderWidth={1} borderColor='$infoBorder' backgroundColor='$background'>
                    {/* 标题栏给一层 $surface，与卡片主体拉开层次；$textPrimary 在两套主题下
                        对 $surface 都是高对比 */}
                    <XStack
                        space='$2'
                        px='$4'
                        py='$4'
                        alignItems='center'
                        bg='$surface'
                        borderTopLeftRadius='$4'
                        borderTopRightRadius='$4'
                        borderBottomWidth={1}
                        borderColor='$borderColorWithShadow'
                    >
                        <FontAwesomeIcon icon={faCheck} color={theme['$green-500'].val} />
                        <Text fontSize='$6' fontWeight='bold' color='$textPrimary'>
                            {t('DestinationChangedAlert.waypointCompleted')}
                        </Text>
                    </XStack>
                    <YStack py='$2'>
                        <YStack mt='$3' space='$3' px='$4'>
                            <YStack space='$1'>
                                <Text fontSize='$3' color='$textSecondary'>
                                    {t('DestinationChangedAlert.completedStop')}
                                </Text>
                                <Text fontSize='$4' fontWeight='bold' color='$textPrimary'>
                                    {prevAddress || t('DestinationChangedAlert.unknownAddress')}
                                </Text>
                            </YStack>
                            <YStack space='$1'>
                                <Text fontSize='$3' color='$textSecondary'>
                                    {t('DestinationChangedAlert.newDestination')}
                                </Text>
                                {/* 两个地址原先都用 $infoText(blue-100)：那是配 $info 深底的字色，
                                    放到 $background(浅色模式 gray-50)上几乎不可见。
                                    这里不改用任何强调色 —— $primaryText 在浅色主题里被
                                    createTheme 覆盖成了 'white'，$primary 在 orange 主题下
                                    对浅底也不够对比。App 支持 5 套配色且可被 CUSTOM_COLORS
                                    覆盖，只有 $textPrimary 能保证每套主题都读得清；
                                    主次靠上面的标签和字重区分。 */}
                                <Text fontSize='$4' fontWeight='bold' color='$textPrimary'>
                                    {currAddress || t('DestinationChangedAlert.unknownAddress')}
                                </Text>
                            </YStack>
                        </YStack>
                        <YStack mt='$5' px='$4'>
                            <WaypointList waypoints={[previousDestination, currentDestination].filter(Boolean)} highlight={2} onCall={(phone) => Linking.openURL(`tel:${phone}`)} />
                        </YStack>
                    </YStack>

                    <YStack mt='$4' borderTopWidth={1} borderColor='$borderColorWithShadow' alignItems='center' justifyContent='center'>
                        {/* 原先没给按钮任何配色，Tamagui 默认背景与卡片同为 $background，
                            按钮整个融在卡片里看不出是可点的 */}
                        <Button onPress={onClose} width='100%' height='$5' bg='$info' borderColor='$infoBorder' borderWidth={1} borderTopLeftRadius={0} borderTopRightRadius={0}>
                            <Button.Text fontSize='$5' fontWeight='bold' color='$infoText'>
                                {t('DestinationChangedAlert.continue')}
                            </Button.Text>
                        </Button>
                    </YStack>
                </YStack>
            </YStack>
        </Modal>
    );
};

export default DestinationChangedAlert;
