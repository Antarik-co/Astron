const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

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
