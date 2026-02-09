const path = require('path');

/**
 * Webpack config for production demo build (Vercel deployment).
 * Bundles everything into demo/dist for standalone deployment.
 */
module.exports = {
  entry: './demo/demo-standalone.ts',
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.demo.json'),
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: { fs: false },
  },
  output: {
    path: path.resolve(__dirname, 'demo/dist'),
    filename: 'demo.bundle.js',
    clean: true,
  },
  // Bundle tudo (sem externals) para deployment standalone
  externals: {},
};
