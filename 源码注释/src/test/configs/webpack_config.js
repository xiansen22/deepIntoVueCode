const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const FlowWebpackPlugin = require('flow-webpack-plugin');

module.exports = {
    mode: "development",
    entry: path.resolve(__dirname, "../demo/index.js"),
    output: {
        path: path.resolve(__dirname, "../demo/build"),
        filename: "[name][hash:8].bundle.js"
    },
    devServer: {
        port: 8080,
        hot: true
    },
    resolve: {
        alias: {
            core: path.resolve(__dirname, "../../core"),
            shared: path.resolve(__dirname, "../../shared"),
            compiler: path.resolve(__dirname, "../../compiler"),
            server: path.resolve(__dirname, "../../server"),
            sfc: path.resolve(__dirname, "../../sfc"),
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: "babel-loader"
            }
        ]
    },
    plugins: [

        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "../demo/public/index.html")
        })
    ] 
}