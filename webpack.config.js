const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BundleAnalyzerPlugin =
    require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = (env, argv) => {
    const isProduction = argv.mode === "production";
    const isAnalyze = process.env.npm_lifecycle_event === "analyze";

    return {
        entry: "./src/index.js",
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: isProduction ? "[name].[contenthash].js" : "[name].js",
            chunkFilename: isProduction
                ? "[name].[contenthash].js"
                : "[name].js",
            clean: true,
            publicPath: "/",
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                "@babel/preset-env",
                                "@babel/preset-react",
                            ],
                        },
                    },
                },
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    type: "asset/resource",
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/i,
                    type: "asset/resource",
                },
                {
                    test: /\.json$/,
                    type: "asset/resource",
                },
            ],
        },
        resolve: {
            extensions: [".js", ".jsx"],
            alias: {
                "@": path.resolve(__dirname, "src"),
                "@components": path.resolve(__dirname, "src/components"),
                "@store": path.resolve(__dirname, "src/store"),
                "@utils": path.resolve(__dirname, "src/utils"),
                "@data": path.resolve(__dirname, "src/data"),
                "@canvas": path.resolve(__dirname, "src/canvas"),
            },
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./index.html",
                inject: "body",
            }),
            ...(isAnalyze ? [new BundleAnalyzerPlugin()] : []),
        ],
        devServer: {
            static: {
                directory: path.join(__dirname, "public"),
            },
            compress: true,
            port: 3000,
            hot: true,
            historyApiFallback: true,
            client: {
                overlay: {
                    errors: true,
                    warnings: false,
                },
            },
        },
        optimization: {
            splitChunks: {
                chunks: "all",
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: "vendors",
                        chunks: "all",
                    },
                    three: {
                        test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
                        name: "three",
                        chunks: "all",
                    },
                    clipper: {
                        test: /[\\/]node_modules[\\/]clipper-lib[\\/]/,
                        name: "clipper",
                        chunks: "all",
                    },
                },
            },
        },
        devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
    };
};
