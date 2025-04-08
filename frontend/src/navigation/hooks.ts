import { useNavigation as useNativeNavigation, ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainStackParamList, BottomTabParamList } from './types';

// Define a route type since we can't directly import it
type RouteType = {
  key: string;
  name: string;
  params?: Record<string, any>;
};

// Custom typed hooks for different navigator types
export function useNavigation<T extends keyof MainStackParamList>() {
  return useNativeNavigation<NativeStackNavigationProp<MainStackParamList, T>>();
}

export function useTabNavigation<T extends keyof BottomTabParamList>() {
  return useNativeNavigation<BottomTabNavigationProp<BottomTabParamList, T>>();
}

// Type safe useRoute hook
export function useRoute<T extends keyof MainStackParamList>() {
  const navigation = useNavigation<T>();
  const currentRoute = navigation.getState().routes[navigation.getState().index];
  return {
    key: currentRoute.key,
    name: currentRoute.name,
    params: currentRoute.params as MainStackParamList[T]
  };
}

// Utility functions for getting navigation params
export function getRouteParams<T extends keyof MainStackParamList>(
  routeName: T, 
  navigation: NativeStackNavigationProp<MainStackParamList>
) {
  const route = navigation.getState().routes.find((r: RouteType) => r.name === routeName);
  return route?.params as MainStackParamList[T];
} 