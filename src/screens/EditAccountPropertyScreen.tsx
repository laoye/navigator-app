import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, Pressable, Keyboard, StyleSheet, Alert } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { useAuth } from '../contexts/AuthContext';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import BackButton from '../components/BackButton';
import PhoneInput from '../components/PhoneInput';
import Input from '../components/Input';
import { useLanguage } from '../contexts/LanguageContext';

const RenderAccountProperty = ({ property, value, onChange }) => {
    const { t } = useLanguage();
    return (
        <YStack flex={1} width='100%'>
            {property.component === 'phone-input' ? (
                <PhoneInput value={value} onChange={onChange} wrapperProps={{ flex: 1 }} />
            ) : (
                <Input value={value} onChangeText={onChange} size='$5' placeholder={t('EditAccountPropertyScreen.' + property.key)} />
            )}
        </YStack>
    );
};

const EditAccountPropertyScreen = ({ route }) => {
    const { t } = useLanguage();
    const property = route.params.property;
    const theme = useTheme();
    const navigation = useNavigation();
    const { driver, setDriver } = useAuth();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [value, setValue] = useState(driver?.getAttribute(property.key) ?? '');
    const mutated = value !== (driver?.getAttribute(property.key) ?? '');

    const handleUpdateProperty = useCallback(async () => {
        if (!driver) return;
        try {
            const updatedDriver = await runWithLoading(driver.update({ [property.key]: value }));
            setDriver(updatedDriver);
            toast.success(t('EditAccountPropertyScreen.' + property.key) + ' changes saved.');
            navigation.goBack();
        } catch (error) {
            toast.error(error.message);
        }
    }, [driver, runWithLoading, setDriver, value, property.name]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$5'>
                <XStack space='$3' alignItems='center' mb='$5'>
                    <BackButton size={40} />
                    <Text color='$textPrimary' fontWeight='bold' fontSize='$8' numberOfLines={1}>
                        {t('EditAccountPropertyScreen.' + property.key)}
                    </Text>
                </XStack>
                <XStack width='100%'>
                    <RenderAccountProperty property={property} value={value} onChange={setValue} />
                </XStack>
                <YStack flex={1} position='relative' width='100%'>
                    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} pointerEvents='box-only' />
                </YStack>
                <XStack position='absolute' bottom={0} left={0} right={0} padding='$5'>
                    <Button onPress={handleUpdateProperty} size='$5' bg='$primary' flex={1} opacity={mutated ? 1 : 0.75} disabled={!mutated}>
                        <Button.Icon>{isLoading() && <Spinner color='$textPrimary' />}</Button.Icon>
                        <Button.Text color='$textPrimary' fontWeight='bold' fontSize='$5'>
                            {t('common.save')}
                        </Button.Text>
                    </Button>
                </XStack>
            </YStack>
        </SafeAreaView>
    );
};

export default EditAccountPropertyScreen;