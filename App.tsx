import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider } from './src/contexts/AuthContext';
import { WarehouseAuthProvider } from './src/contexts/WarehouseAuthContext';
import { SocketClusterProvider } from './src/contexts/SocketClusterContext';
import { OrderManagerProvider } from './src/contexts/OrderManagerContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { TempStoreProvider } from './src/contexts/TempStoreContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useThemeContext } from './src/contexts/ThemeContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { ConfigProvider } from './src/contexts/ConfigContext';
import { showLastFatalError } from './src/utils/fatal-error-trap';
import config from './tamagui.config';

function AppContent(): React.JSX.Element {
    const { appTheme } = useThemeContext();

    return (
        <TamaguiProvider config={config} theme={appTheme}>
            <Theme name={appTheme}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaProvider>
                        <BottomSheetModalProvider>
                            <ConfigProvider>
                                <NotificationProvider>
                                    <LanguageProvider>
                                        <AuthProvider>
                                            <WarehouseAuthProvider>
                                            <SocketClusterProvider>
                                                <LocationProvider>
                                                    <TempStoreProvider>
                                                        <ChatProvider>
                                                            <OrderManagerProvider>
                                                                <AppNavigator />
                                                                <Toasts extraInsets={{ bottom: 80 }} />
                                                                <PortalHost name='MainPortal' />
                                                                <PortalHost name='BottomSheetPanelPortal' />
                                                                <PortalHost name='LocationPickerPortal' />
                                                            </OrderManagerProvider>
                                                        </ChatProvider>
                                                    </TempStoreProvider>
                                                </LocationProvider>
                                            </SocketClusterProvider>
                                            </WarehouseAuthProvider>
                                        </AuthProvider>
                                    </LanguageProvider>
                                </NotificationProvider>
                            </ConfigProvider>
                        </BottomSheetModalProvider>
                    </SafeAreaProvider>
                </GestureHandlerRootView>
            </Theme>
        </TamaguiProvider>
    );
}

function App(): React.JSX.Element {
    React.useEffect(() => {
        // 上次运行若因致命 JS 错误崩溃，启动后弹窗展示错误详情（fatal-error-trap 落的盘）
        showLastFatalError();
    }, []);

    return (
        <PortalProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </PortalProvider>
    );
}

export default App;
