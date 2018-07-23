const runScript = require('./run-script');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const Common = require('./build-common');
const getwebPackConfig = require('./webpack-config');
const BuildConfig = require('../../../build.config.js');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));

const theConsole = console;
const theProcess = process;

theConsole.log('');
theConsole.log('***********************************************************************************************************************');
theConsole.log(`******************************************* ${BuildConfig.project.name} - Webpack-Dev-Server *************************************************`);
theConsole.log('***********************************************************************************************************************');
theConsole.log('');

function build(args, skipBuild) {
    return new Promise((resolve, reject) => {
        if (!skipBuild) {
            theConsole.log('');
            theConsole.log('********************** Running build ************************');
            theConsole.log('');
            runScript('./node_modules/tw-js-webpack-utils/bin/build.js', args,
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        } else {
            resolve();
        }
    });
}

function startDevServer(targetBaseDir, targetEnv, app) {
    return new Promise((resolve, reject) => {
        const webpackCfg = getwebPackConfig({
            targetBaseDir: targetBaseDir,
            targetEnv: targetEnv,
            targetApp: app.name
        });

        const server = new WebpackDevServer(webpack(webpackCfg), {
            publicPath: webpackCfg.output.publicPath,
            hot: true,
            historyApiFallback: true,
            // It suppresses error shown in console, so it has to be set to false.
            quiet: false,
            // It suppresses everything except error, so it has to be set to false as well
            // to see success build.
            noInfo: false,

            stats: {
                colors: true
                // Config for minimal theConsole.log mess.
                // assets: false,
                // version: false,
                // hash: false,
                // timings: false,
                // chunks: false,
                // chunkModules: false
            }
        });

        // Important part. Send down index.html for all requests
        server.use('/', (req, res) => {
            res.sendFile(path.join(`${targetBaseDir}/Client/dist/${app.name}/index.html`));
        });

        server.listen(app.wdsPort, app.wdsHost, (err) => {
            if (err) {
                theConsole.log(err);
                reject(err);
            }

            theConsole.log(`Listening at ${app.wdsHost}:${app.wdsPort} for app ${app.name}`);
        });

        resolve({ targetBaseDir: targetBaseDir, targetEnv: targetEnv });
    });
}

build(process.argv.slice(2), argv.skipBuild)
.then(() => {
    const {targetBaseDir, targetEnv, apps} = Common.parseArgs(argv, BuildConfig);

    theConsole.log('');
    theConsole.log(`Target base directory: ${targetBaseDir}`);
    theConsole.log(`Environment: ${targetEnv}`);
    theConsole.log(`Apps: ${apps.map(app => app.name)}`);

    apps.forEach(app => {
        try {
            startDevServer(targetBaseDir, targetEnv, app);
        } catch (error) {
            theConsole.log(`Error: ${error}`);
            theProcess.exit(2);
        }
    });
});
