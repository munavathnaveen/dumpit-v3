import Toast from "react-native-toast-message";

type ToastType = "success" | "error" | "info";

/**
 * Show a toast notification
 * @param type The type of toast ('success', 'error', 'info')
 * @param title The title of the toast
 * @param message Optional message to display
 */
const showToast = (type: ToastType, title: string, message?: string) => {
    Toast.show({
        type,
        text1: title,
        text2: message,
        position: "bottom",
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 30,
        bottomOffset: 40,
    });
};

const toast = {
    success: (title: string, message?: string) => showToast("success", title, message),
    error: (title: string, message?: string) => showToast("error", title, message),
    info: (title: string, message?: string) => showToast("info", title, message),
};

export default toast;
