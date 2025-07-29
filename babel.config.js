module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add any additional plugins you need
      'react-native-reanimated/plugin', // Keep this last
    ],
  };
};