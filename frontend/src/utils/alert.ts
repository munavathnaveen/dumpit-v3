import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

const alertPolyfill = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean; onDismiss?: () => void }
) => {
  const result = window.confirm([title, message].filter(Boolean).join('\n'));

  if (result) {
    const confirmOption = buttons?.find(({ style }) => style !== 'cancel');
    confirmOption?.onPress?.();
  } else {
    const cancelOption = buttons?.find(({ style }) => style === 'cancel');
    cancelOption?.onPress?.();
  }
};

const alert = Platform.OS === 'web' ? alertPolyfill : Alert.alert;

export default alert; 