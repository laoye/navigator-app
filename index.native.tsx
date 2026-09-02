// index.native.tsx
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { installFatalErrorTrap } from './src/utils/fatal-error-trap';

// 尽早安装：致命 JS 错误在崩溃前落盘，下次启动可弹窗回看
installFatalErrorTrap();

AppRegistry.registerComponent(appName, () => App);
