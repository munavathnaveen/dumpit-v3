const appJson = require('./_app.json');
const appConfig = appJson.expo;

module.exports = {
  ...appConfig,
  name: "Dumpit",
  slug: "dumpit",
  orientation: "portrait",
  icon: "./assets/logo.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#E23744"
  },
  scheme: "dumpit",
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    ...appConfig.ios,
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    }
  },
  android: {
    ...appConfig.android,
    package: "com.mdnihal.dumpit",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#E23744"
    },
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    eas: {
      projectId: "0866d496-cd11-4928-87e5-ea9f960ed725"
    }
  }
} 