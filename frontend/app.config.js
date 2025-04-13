const dotenv = require('react-native-dotenv');
const appJson = require('./_app.json');
const appConfig = appJson.expo;

module.exports = {
  ...appConfig,
  name: "Dumpit",
  slug: "dumpit",
  orientation: "portrait",
  icon: "./assets/icon.png",
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
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    }
  },
  android: {
    ...appConfig.android,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#E23744"
    },
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  }
} 