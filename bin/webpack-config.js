const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin  = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BuildConfig = require('../../../build.config.js');

// grab .babelrc and set es2015: modules to false (essentially disabling "commonjs modules" for webpack execution)
// this will allow webpack to perform tree shaking optimization
// TODO NL 2017-08-09: don't know if this is working properly. Needs further investigation
const babelrcJson = JSON.parse(fs.readFileSync('.babelrc'));
const babelrc = {
    ...babelrcJson,
    babelrc: false
};

const theDirname = path.resolve(`${__dirname}/../../..`);

babelrc.presets.forEach((preset, index) => {
    if (preset === 'es2015') {
        babelrc.presets[index] = ['es2015', { 'modules': false }];
        return;
    }
});

const getWebPackConfig = (options) => {
    const projectName = BuildConfig.project.name;
    let targetBaseDir;
    let targetEnv;

    if (options === null || options === undefined || options.targetBaseDir === null || options.targetBaseDir === undefined) {
        targetBaseDir = theDirname;
    } else {
        targetBaseDir = options.targetBaseDir;
    }

    if (options === null || options === undefined || options.targetEnv === null || options.targetEnv === undefined) {
        targetEnv = 'local';
    } else {
        targetEnv = options.targetEnv;
    }

    const targetApp = BuildConfig.apps.find(iapp => iapp.name === options.targetApp);
    if (options === null || options === undefined || options.targetApp === null || options.targetApp === undefined || !targetApp) {
        throw new Error(`Invalid target app (targetApp) specified:${options.targetApp}`);
    }

    const {wdsProtocol, wdsHost, wdsPort, name: targetAppName} = targetApp;
    const targetPath = targetBaseDir + `/Client/dist/${targetAppName}`;

    if (targetEnv !== 'local' && targetEnv !== 'development' && targetEnv !== 'quality' && targetEnv !== 'production') {
        throw new Error(`Invalid target environment (targetEnv) specified:${targetEnv}`);
    }

    const debug = targetEnv !== 'quality' && targetEnv !== 'production';
    const nodeEnv = debug ? 'development' : 'production';

    /** ************** DEFINE ENV CONFIG *************/
    const envConfig = BuildConfig.getEnv(targetApp, targetEnv);

    /** ************** DEFINE AUX FUNCS *************/
    const defaultFileLoader = (outputPath = `${envConfig.AssetsPath}`, publicPath = outputPath, name = '[name].[hash].[ext]') => {
        return {
            loader: 'file-loader',
            options: {
                name: name,
                outputPath: `${outputPath}`,
                publicPath: `${envConfig.BaseURL}/${publicPath}`
            }
        };
    };

    const defaultUrlLoader = (mimetype, outputPath = `${envConfig.AssetsPath}`, publicPath = outputPath, name = '[name].[hash].[ext]', limit = 10000) => {
        const urlLoader = {
            loader: 'url-loader',
            options: {
                limit: limit,
                // fallback to file-loader options
                name: name,
                outputPath: `${outputPath}`,
                publicPath: `${envConfig.BaseURL}/${publicPath}`
            }
        };

        if (mimetype) {
            urlLoader.options = {...urlLoader.options, mimetype: mimetype};
        }

        return urlLoader;
    };

    /** ************* DEFINE ENTRY *******************/
    let cfgEntry = [];

    if (debug) {
        cfgEntry = cfgEntry.concat([
            `webpack-dev-server/client?${wdsProtocol}://${wdsHost}:${wdsPort}/`,
            'webpack/hot/only-dev-server',
            'react-hot-loader/patch'
        ]);
    }

    cfgEntry = cfgEntry.concat([
        `./Client/src/${targetAppName}/Index.jsx`
    ]);


    /** ************* DEFINE PLUGINS *******************/
    const HtmlWebpackPluginOptions = BuildConfig.getPluginOptions('HtmlWebpackPlugin', targetApp, targetEnv);
    const DefinePluginOptions = BuildConfig.getPluginOptions('DefinePlugin', targetApp, targetEnv);
    const MiniCssExtractPluginOptions = BuildConfig.getPluginOptions('MiniCssExtractPlugin', targetApp, targetEnv);

    let cfgPlugins = [
        new HtmlWebpackPlugin(Object.assign({}, {
            template: `./Client/src/${targetAppName}/index.template.ejs`,
            favicon: `./Client/src/${targetAppName}/assets/images/favicon.ico`,
            environment: targetEnv,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            },
            inject: true
        }, HtmlWebpackPluginOptions)),
        new webpack.DefinePlugin(Object.assign({}, {
            'process.env': {
                NODE_ENV: JSON.stringify(nodeEnv),
                ENV_CONFIG: JSON.stringify(envConfig)
            }
        }, DefinePluginOptions)),
        new MiniCssExtractPlugin(Object.assign({}, {
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: debug ? '[name].css' : '[name].[hash].css',
            chunkFilename: debug ? '[id].css' : '[id].[hash].css'
        }, MiniCssExtractPluginOptions))
    ];

    const CopyWebpackPluginOptions = BuildConfig.getPluginOptions('CopyWebpackPlugin', targetApp, targetEnv);
    if (CopyWebpackPluginOptions) {
        cfgPlugins = cfgPlugins.concat([
            new CopyWebpackPlugin(CopyWebpackPluginOptions)
        ]);
    }

    if (debug) {
        cfgPlugins = cfgPlugins.concat([
            new webpack.HotModuleReplacementPlugin()
        ]);
    } else {
        cfgPlugins = cfgPlugins.concat([
            new webpack.LoaderOptionsPlugin({
                minimize: true,
                debug: false
            })
        ]);
    }

    /** ************* DEFINE OPTIMIZE *******************/
    let cfgOptimize; // undefined by default

    if (!debug) {
        cfgOptimize = {
            minimizer: [
                new UglifyJsPlugin(
                    {
                        parallel: true,
                        uglifyOptions: {
                            output: {
                                comments: false
                            }
                        }
                    }
                ),
                new OptimizeCSSAssetsPlugin({})
            ]
        };
    }

    /** ******** DEFINE MODULE RULES **************/
    const esLintRule = {
        test: /\.js(x)?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [{
            loader: 'eslint-loader',
            options: {
                configFile: '.eslintrc',
                failOnWarning: true,
                failOnError: true,
                fix: true
            }
        }]
    };

    const cssLoaderCfg = {
        loader: 'css-loader',
        options: {
            modules: true,
            camelCase: true,
            sourceMap: false, // debug, https://github.com/webpack/css-loader/issues/232
            minimize: !debug,
            localIdentName: '[path][name]__[local]--[hash:base64:5]',
            importLoaders: 1
        }
    };

    const cssRule = {
        test: /\.(s)?css?$/,
        use: [
            debug ? 'style-loader' : MiniCssExtractPlugin.loader,
            cssLoaderCfg,
            'postcss-loader'
        ]
    };

    /** ******** DEFINE OUTPUT **************/
    const output = {
        path: targetPath,
        filename: 'bundle.js',
        publicPath: envConfig.BaseURL
    };

    if(!debug) {
        output.filename = 'bundle.[hash:8].js';
    }

    /** ******** DEFINE CONFIG **************/
    const config = {
        mode: nodeEnv,
        devtool: debug ? 'inline-sourcemap' : false,
        resolve: {
            extensions: ['.js', '.jsx']
        },
        entry: cfgEntry,
        output: output,
        plugins: cfgPlugins,
        optimization: cfgOptimize,
        module: {
            rules: [
                {
                    test: /\.(jsx)?$/,
                    exclude: /(node_modules|bower_components)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: babelrc
                        }
                    ]
                },
                cssRule,
                { test: /\.eot(\?\S*)?$/, use: [defaultUrlLoader(null, `${envConfig.AssetsPath}fonts/`)] },
                { test: /\.woff2(\?\S*)?$/, use: [defaultUrlLoader('application/font-woff2', `${envConfig.AssetsPath}fonts/`)] },
                { test: /\.woff(\?\S*)?$/, use: [defaultUrlLoader('application/font-woff', `${envConfig.AssetsPath}fonts/`)] },
                { test: /\.ttf(\?\S*)?$/, use: [defaultUrlLoader(null, `${envConfig.AssetsPath}fonts/`)] },
                { test: /\.svg(\?\S*)?$/, use: [defaultUrlLoader(null, `${envConfig.AssetsPath}fonts/`)] },
                { test: /\.(jpe?g|png|gif)$/i, use: [defaultFileLoader(`${envConfig.AssetsPath}images/`)] },
                { test: /\.ico$/, use: [defaultFileLoader()] }
            ]
        }
    };

    config.module.rules.push(esLintRule);

    return config;
};

module.exports = getWebPackConfig;
