const path = require('path');

const libraryName = 'FaceValidator';
const baseFilename = 'face-validator-sdk';

const baseConfig = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
};

const baseCoreConfig = {
  ...baseConfig,
  entry: './src/core.ts',
};

const cjsConfig = {
  ...baseConfig,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${baseFilename}.cjs.js`,
    library: { type: 'commonjs2' },
    // clean omitido: o script "build" já faz rimraf dist; clean: true aqui apagava .esm.js e .umd.js nas builds multi-config
  },
  target: 'node',
  externals: {
    '@mediapipe/tasks-vision': '@mediapipe/tasks-vision',
    react: 'react',
    'react-dom': 'react-dom',
  },
};

const esmConfig = {
  ...baseConfig,
  experiments: { outputModule: true },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${baseFilename}.esm.js`,
    library: { type: 'module' },
  },
  target: 'web',
  externals: {
    '@mediapipe/tasks-vision': '@mediapipe/tasks-vision',
    react: 'react',
    'react-dom': 'react-dom',
  },
};

const umdConfig = {
  ...baseConfig,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${baseFilename}.umd.js`,
    library: { name: libraryName, type: 'umd' },
    globalObject: 'this',
  },
  target: 'web',
  externals: {
    '@mediapipe/tasks-vision': 'mediapipe',
    react: 'React',
    'react-dom': 'ReactDOM',
  },
};

// Core builds — framework-agnostic, no React dependency
const coreCjsConfig = {
  ...baseCoreConfig,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${baseFilename}-core.cjs.js`,
    library: { type: 'commonjs2' },
  },
  target: 'node',
  externals: {
    '@mediapipe/tasks-vision': '@mediapipe/tasks-vision',
  },
};

const coreEsmConfig = {
  ...baseCoreConfig,
  experiments: { outputModule: true },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${baseFilename}-core.esm.js`,
    library: { type: 'module' },
  },
  target: 'web',
  externals: {
    '@mediapipe/tasks-vision': '@mediapipe/tasks-vision',
  },
};

const coreUmdConfig = {
  ...baseCoreConfig,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${baseFilename}-core.umd.js`,
    library: { name: libraryName, type: 'umd' },
    globalObject: 'this',
  },
  target: 'web',
  externals: {
    '@mediapipe/tasks-vision': 'mediapipe',
  },
};

module.exports = (env, argv) => {
  const devtool = argv.mode === 'production' ? 'source-map' : 'inline-source-map';
  return [
    { ...cjsConfig, devtool },
    { ...esmConfig, devtool },
    { ...umdConfig, devtool },
    { ...coreCjsConfig, devtool },
    { ...coreEsmConfig, devtool },
    { ...coreUmdConfig, devtool },
  ];
};
