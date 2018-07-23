import crypto from 'crypto';

const secret = 'This is a secret. Tell me more...';

export const project = {
    name: 'project'
};

export const apps = [
    {
        name: 'app1',
        wdsProtocol: 'http',
        wdsHost: 'localhost',
        wdsPort: '3003'
    },
    {
        name: 'app2',
        wdsProtocol: 'http',
        wdsHost: 'localhost',
        wdsPort: '3004'
    }
];

export const getEnv = (app, targetEnv) => {
    let envConfig = {
        AppEnv: targetEnv,
        AssetsPath: 'assets/',
        LogLevel: 1,
        AuthServerHostName: 'http://localhost',
        AuthURL: '/project.auth',
        ApiServerHostName: 'http://localhost',
        ApiURL: '/project.backend',
        BaseURL: `/project.frontend/${app.name}`,
        ResourceCode: `${app.name}`,
        AccessTokenAlias: crypto.createHmac('sha256', secret).update(`${project.name}_${app.name}_${targetEnv}_AccessToken`).digest('hex'),
        RefreshTokenAlias: crypto.createHmac('sha256', secret).update(`${project.name}_${app.name}_${targetEnv}_RefreshToken`).digest('hex')
    };

    switch (targetEnv) {
        case 'development':
            envConfig = {
                ...envConfig,
                AuthServerHostName: 'http://dev-server.com',
                ApiServerHostName: 'http://dev-server.com'
            };
            break;
        case 'quality':
            envConfig = {
                ...envConfig,
                LogLevel: 3, // warn
                AuthServerHostName: 'http://TBD',
                AuthURL: '/auth',
                ApiServerHostName: 'TBD',
                ApiURL: `/${app.name}`,
                BaseURL: `/${app.name}`
            };
            break;
        case 'production':
            envConfig = {
                ...envConfig,
                LogLevel: 3, // warn
                AuthServerHostName: 'http://TBD',
                AuthURL: '/auth',
                ApiServerHostName: 'TBD',
                ApiURL: '/backend',
                BaseURL: `/${app.name}`,
            };
            break;
        case 'local':
        default:
            break;
    }

    return envConfig;
};
