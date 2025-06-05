const appJson = require("./_app.json");
const appConfig = appJson.expo;

module.exports = {
    ...appConfig,
    name: "Dumpit",
    slug: "dumpit",
    assetBundlePatterns: ["**/*"],
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
