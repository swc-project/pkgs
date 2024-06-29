const swc = require("@swc/core");

function patchOptions(options) {
    return {
        ...options,
        compress: {
            ...(options?.compress ?? {}),
            inline: 2,
        },
    };
}

exports.minify = (src, options) => {
    return swc.minify(src, patchOptions(options));
};

exports.minifySync = (src, options) => {
    return swc.minifySync(src, patchOptions(options));
};
