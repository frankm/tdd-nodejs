const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const path = require('path');

module.exports = {
  target: 'node', // in order to ignore built-in modules like path, fs, etc.
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  mode: 'development',

  entry: './index.js',
  output: {
    filename: 'smokeTestStub.js',
    path: path.join(__dirname, '../dist'),
  },

  plugins: [
    // Mac doesn't care about case, but linux servers do, so enforce...
    // new CaseSensitivePathsPlugin({ debug: true }),
    new CaseSensitivePathsPlugin(),
  ],
};
