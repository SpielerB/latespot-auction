module.exports = function override(config) {
    config.output = {
        ...config.output, // copy all settings
        filename: "static/js/[name].js",
        chunkFilename: "static/js/[name].chunk.js",
    };

    config.optimization = {
        ...config.optimization,
        runtimeChunk: false,
        splitChunks: {
            minChunks: 10000000
        }
    }

    config.plugins.map((plugin, i) => {
        if (plugin.options && plugin.options.filename && plugin.options.filename.includes('static/css')) {
            config.plugins[i].options = {
                ...config.plugins[i].options,
                filename: 'static/css/index_bundle.css',
                chunkFilename: 'static/css/index_bundle.css'
            }
        }
    });

    return config;
};