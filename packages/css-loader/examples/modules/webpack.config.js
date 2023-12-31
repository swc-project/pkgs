"use strict";

const path = require("path");

module.exports = {
    mode: "development",
    // Enable source map
    devtool: "source-map",
    entry: path.join(__dirname, "index.js"),
    output: {
        path: path.join(__dirname, "build"),
        filename: "bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                exclude: /(node_modules|bower_components)/,
                use: [
                    {
                        loader: "style-loader",
                    },
                    {
                        loader: "@swc/css-loader",
                        options: {
                            // Enable source map
                            sourceMap: true,
                        },
                    },
                ],
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: "swc-loader",
                    options: {
                        // Enable source map
                        sourceMap: true,
                        jsc: {
                            parser: {
                                syntax: "ecmascript",
                                jsx: true,
                            },
                            transform: {
                                react: {
                                    pragma: "React.createElement",
                                    pragmaFrag: "React.Fragment",
                                    throwIfNamespace: true,
                                    development: false,
                                    useBuiltins: false,
                                },
                            },
                        },
                    },
                },
            },
        ],
    },
};
