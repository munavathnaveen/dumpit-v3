import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  // Set up deep linking configuration
  useEffect(() => {
    // Register the app to handle the deep linking
    const configureDeepLinking = async () => {
      // Handle the case where the app is already open
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('App opened with URL:', initialUrl);
      }
    };

    configureDeepLinking();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </Provider>
  );
}
