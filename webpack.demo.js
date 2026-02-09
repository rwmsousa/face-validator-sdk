const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const DEMO_PORT = 8081;
const DEMO_URL = `http://localhost:${DEMO_PORT}/`;

module.exports = {
  entry: './demo/demo.ts',
  mode: 'development',
  devtool: 'inline-source-map',
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
  },
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
    path: path.resolve(__dirname, 'dist-demo'),
    filename: 'demo.js',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './demo/index.html',
      inject: 'body',
    }),
    new webpack.HotModuleReplacementPlugin(),
    // Make webpack watch the HTML template so changes trigger reload
    {
      apply: (compiler) => {
        compiler.hooks.afterCompile.tap('WatchDemoFiles', (compilation) => {
          compilation.fileDependencies.add(path.resolve(__dirname, 'demo/index.html'));
        });
      },
    },
  ],
  devServer: {
    static: path.join(__dirname, 'dist-demo'),
    port: DEMO_PORT,
    open: true,
    hot: true,
    watchFiles: ['demo/**/*', 'src/**/*'],
    onListening: () => {
      console.log('\n  \x1b[1mFace Validator SDK – Demo\x1b[0m');
      console.log('  URL: \x1b[36m%s\x1b[0m\n', DEMO_URL);
    },
  },
  // Bundle face-api.js so the demo works without loading it from elsewhere
  externals: {},
};
