module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: [
            'API_URL',
            'NODE_ENV',
            'GOOGLE_MAPS_API_KEY'
          ],
          safe: false,
          allowUndefined: true,
        },
      ],
    ],
  };
}; 