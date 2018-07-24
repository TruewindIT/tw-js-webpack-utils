const theConsole = console;
const path = require('path');
const theDirname = path.resolve(`${__dirname}/../../..`);

const parseArgs = (argv, buildConfig) => {
    // Parse parameter - targetBaseDir
    if (argv.targetBaseDir === null || argv.targetBaseDir === undefined) {
        theConsole.warn('Target directory (--targetBaseDir) not specified. Using "__dirname".');
    }
    const targetBaseDir = (argv.targetBaseDir !== null && argv.targetBaseDir !== undefined) ? argv.targetBaseDir : theDirname;

    // Parse parameter - targetEnv.
    if (argv.targetEnv === null || argv.targetEnv === undefined) {
        theConsole.warn('Target environment (--targetEnv) not specified. Using "local".');
    }
    const targetEnv = (argv.targetEnv !== null && argv.targetEnv !== undefined) ? argv.targetEnv : 'local';

    // Parse parameter - list of targetApp, separated by ",". If no argument is specified, build all.
    let apps = [];
    if (argv.targetApps === null || argv.targetApps === undefined) {
        theConsole.warn('Target app(s) not specified. Building all apps.');
        apps = apps.concat(buildConfig.apps);
    } else {
        const splitarg = argv.targetApps.split(',');
        if (splitarg && splitarg.length > 0) {
            splitarg.forEach(a => {
                const app = buildConfig.apps.find(iapp => iapp.name === a);
                if (app) {
                    if (!apps.some(iapp => iapp.name === a)) {
                        apps.push(app);
                    }
                } else {
                    throw new Error('Invalid app(s) specified.');
                }
            });
        } else {
            throw new Error('Invalid app(s) specified.');
        }
    }

    return {
        targetBaseDir,
        targetEnv,
        apps
    };
};

const Common =  {
	parseArgs
};

module.exports = Common;
