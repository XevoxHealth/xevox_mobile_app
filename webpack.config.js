const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          'react-native-vector-icons',
          'react-native-web'
        ]
      }
    },
    argv
  );

  // Resolve aliases
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web'
  };

  // Fallback for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    net: false,
    tls: false,
    child_process: false,
    dgram: false,
    dns: false,
    http2: false,
    module: false
  };

  // Remove problematic webpack configuration
  delete config.node;

  return config;
};