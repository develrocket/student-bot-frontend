const env = process.env.NODE_ENV || 'development';

const config = {
    development: {
        server: {
            port: process.env.PORT || 3000,
            hostname: process.env.HOSTNAME || 'localhost',
        },
        database: {
            url: `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_HOST || 27017}/${process.env.DB_NAME}`,
        },
        teleBotToken: process.env.TELE_BOT_TOKEN
    },
    production: {
        server: {
            port: process.env.PORT || 3200,
            hostname: process.env.HOSTNAME || 'localhost',
        },
        database: {
            url: `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_HOST || 27017}/${process.env.DB_NAME}`,
        },
        teleBotToken: process.env.TELE_BOT_TOKEN
    },
};
config[env].isDev = env === 'development';
config[env].isProd = env === 'production';

module.exports = config[env];
