const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

function collectEnvKeys(prefix) {
  var keys = [];
  for (var i = 1; i <= 10; i++) {
    var val = process.env[prefix + "_" + i];
    if (val) { keys.push(val); }
  }
  return keys.join(",");
}

const isDev = (process.env.NODE_ENV || "development") === "development";

module.exports = {
  entry: "./src/main.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  mode: process.env.NODE_ENV || "development",
  devtool: isDev ? "inline-source-map" : false,
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __ASTRON_GROQ_KEYS__: JSON.stringify(collectEnvKeys("GROQ_KEY")),
      __ASTRON_GEMINI_KEYS__: JSON.stringify(collectEnvKeys("GEMINI_KEY")),
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "CSXS"),
          to: path.resolve(__dirname, "dist/CSXS"),
        },
        {
          from: path.resolve(__dirname, "src/lib"),
          to: path.resolve(__dirname, "dist/lib"),
        },
        {
          from: path.resolve(__dirname, "src/assets"),
          to: path.resolve(__dirname, "dist/assets"),
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, "src/bridge/extendscript"),
          to: path.resolve(__dirname, "dist/extendscript"),
        },
        {
          from: "src/modules/*/*.jsx",
          to: path.resolve(__dirname, "dist/extendscript/modules/[name][ext]"),
        },
        {
          from: path.resolve(__dirname, ".debug"),
          to: path.resolve(__dirname, "dist/.debug"),
          toType: "file",
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  performance: {
    maxAssetSize: 512000,
    maxEntrypointSize: 512000,
  },
};
