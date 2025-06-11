import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  // Set up deep linking configuration
  useEffect(() => {
    // Register the app to handle the deep linking
    const configureDeepLinking = async () => {
      try {
        // Handle the case where the app is already open
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('App opened with URL:', initialUrl);
        }
      } catch (error) {
        console.error('Error configuring deep linking:', error);
      }
    };

    configureDeepLinking();
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App-level error caught:', error);
        console.error('Error info:', errorInfo);
        // Here you could send to crash reporting service
      }}
    >
      <Provider store={store}>
        <SafeAreaProvider>
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Navigation-level error caught:', error);
            }}
          >
            <RootNavigator />
          </ErrorBoundary>
          <Toast />
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
