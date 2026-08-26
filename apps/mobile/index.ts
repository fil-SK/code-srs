// Expo Go does not expose Web Crypto on globalThis. Install the native crypto
// bridge before Expo Router evaluates any route module, because demo fixture
// construction creates ReviewLog ids during the first render.
import './src/platform/installMobileCrypto'

// Expo requires the Router entry import to remain last in a custom entry file.
import 'expo-router/entry'
