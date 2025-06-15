const appJson = require("./_app.json");

// Destructure to exclude native keys from _app.json
const { orientation, icon, userInterfaceStyle, splash, scheme, ios, android, ...rest } = appJson.expo;

module.exports = {
    ...rest,
    name: "Dumpit",
    slug: "dumpit",
    version: "1.0.0",
    assetBundlePatterns: ["**/*"],
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
    },
    ios: {
        bundleIdentifier: "com.dumpit.app",
        supportsTablet: true,
    },
    android: {
        package: "com.dumpit.app",
        adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#ffffff",
        },
        permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
    },
    web: {
        favicon: "./assets/favicon.png",
    },
    extra: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        eas: {
            projectId: "0866d496-cd11-4928-87e5-ea9f960ed725",
        },
    },
};
