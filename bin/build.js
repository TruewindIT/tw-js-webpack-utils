const runScript = require('./run-script.js');
const Common = require('./build-common.js');
const BuildConfig = require('../../../build.config.js');
const del = require('del');

const argv = require('minimist')(process.argv.slice(2));

const theConsole = console;
const theProcess = process;

theConsole.log('');
theConsole.log('***********************************************************************************************************************');
theConsole.log(`************************************************** ${BuildConfig.project.name} - Build *******************************************************`);
theConsole.log('***********************************************************************************************************************');

const {targetBaseDir, targetEnv, apps} = Common.parseArgs(argv, BuildConfig);

theConsole.log('');
theConsole.log(`Target base directory: ${targetBaseDir}`);
theConsole.warn('process.cwd(): ' + process.cwd());
theConsole.log(`Environment: ${targetEnv}`);
theConsole.log(`Apps: ${apps.map(app => app.name)}`);

const webpackArgs = [
    '--config',
    './node_modules/tw-js-webpack-utils/bin/webpack-config.js',
    '--progress',
    '--profile',
    '--colors',
    '--env.targetBaseDir',
    targetBaseDir,
    '--env.targetEnv',
    targetEnv,
    '--env.targetApp'
];

function build(app) {
    return new Promise((resolve, reject) => {
        del.sync([`${targetBaseDir}/Client/dist/${app.name}`], { force: true });

        theConsole.log(`******************** Begin building ${app.name} ******************** `);
        runScript('./node_modules/webpack/bin/webpack.js', webpackArgs.concat([app.name]),
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    theConsole.log(`******************** Finished building ${app.name} ******************** `);
                    resolve();
                }
            }
        );
    });
}


apps.forEach(app => {
	try {
		build(app);
	} catch (error) {
		theConsole.log(`Error: ${error}`);
		theProcess.exit(2);
	}
});