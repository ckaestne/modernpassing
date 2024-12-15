const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require('path');

module.exports = {
  entry: './positions.ts',
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
    extensions: ['.tsx', '.ts', '.js'],

      fallback: {
        assert: require.resolve('assert'),
      }  
  },
  plugins: [
    new HtmlWebpackPlugin({
        title: 'our project', 
        template: 'positions-test.html' }) 
   ],

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};