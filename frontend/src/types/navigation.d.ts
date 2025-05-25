declare module "@react-navigation/native" {
    export function useNavigation<T = any>(): T;
    export const NavigationContainer: React.ComponentType<any>;
    export type NavigationProp<T> = any;
    export type RouteProp<T, K extends keyof T> = any;
    export type ParamListBase = Record<string, object | undefined>;
}

declare module "@react-navigation/native-stack" {
    export function createNativeStackNavigator<T = any>(): {
        Navigator: React.ComponentType<any>;
        Screen: React.ComponentType<any>;
    };
    export type NativeStackNavigationProp<T, K extends keyof T = any> = any;
    export type NativeStackScreenProps<T, K extends keyof T = any> = {
        navigation: NativeStackNavigationProp<T, K>;
        route: any;
    };
}
