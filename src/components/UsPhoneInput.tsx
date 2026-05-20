import React, { useState, useEffect, useRef } from 'react';
import { Text, XStack, YStack, Input } from 'tamagui';
import useAppTheme from '../hooks/use-app-theme';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * ForBox 美国市场专用电话输入。
 *
 * - 固定 `🇺🇸 +1` 前缀，无国家选择器
 * - 自动 mask：(XXX) XXX-XXXX
 * - 通过 onChange 回传 E.164 完整号 `+1XXXXXXXXXX` 及纯数字
 * - 验证：10 位数字
 *
 * 完整国际版仍在 components/PhoneInput.tsx 保留供别的市场用。
 */

function formatAsUs(digits: string): string {
    const d = digits.slice(0, 10);
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function digitsOnly(s: string): string {
    return (s ?? '').replace(/\D/g, '').slice(0, 10);
}

interface UsPhoneInputProps {
    value?: string | null;
    onChange?: (e164: string, localDigits: string) => void;
    size?: any;
    bg?: any;
    width?: any;
    wrapperProps?: Record<string, any>;
}

const UsPhoneInput = ({ value, onChange, size = '$5', bg, width = '100%', wrapperProps = {} }: UsPhoneInputProps) => {
    const { t } = useLanguage();
    const { isDarkMode } = useAppTheme();
    const initialDigits = value && typeof value === 'string' ? digitsOnly(value.replace(/^\+1/, '')) : '';
    const [digits, setDigits] = useState(initialDigits);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const backgroundColor = bg ? bg : isDarkMode ? '$surface' : '$gray-200';

    useEffect(() => {
        const e164 = digits.length === 10 ? `+1${digits}` : '';
        onChangeRef.current?.(e164, digits);
    }, [digits]);

    const handleChange = (text: string) => {
        setDigits(digitsOnly(text));
    };

    return (
        <YStack space='$4' {...wrapperProps}>
            <XStack
                width={width}
                paddingHorizontal={0}
                borderWidth={1}
                borderColor='$borderColorWithShadow'
                borderRadius='$5'
                bg={backgroundColor}
                alignItems='center'
            >
                <XStack
                    alignItems='center'
                    space='$2'
                    px='$3'
                    height={48}
                >
                    <Text fontSize={size}>🇺🇸</Text>
                    <Text fontSize={size} color='$textPrimary'>
                        +1
                    </Text>
                </XStack>
                <Input
                    size={size}
                    flex={1}
                    placeholder={t('UsPhoneInput.placeholder')}
                    keyboardType='phone-pad'
                    value={formatAsUs(digits)}
                    onChangeText={handleChange}
                    bg={backgroundColor}
                    color='$textPrimary'
                    borderWidth={0}
                    borderRadius={0}
                    borderTopRightRadius='$3'
                    borderBottomRightRadius='$3'
                    overflow='hidden'
                    maxLength={14}
                    placeholderTextColor={isDarkMode ? '$gray-700' : '$gray-400'}
                />
            </XStack>
        </YStack>
    );
};

export default UsPhoneInput;
