import {
    CssModuleTransformOptions,
    TransformOptions,
    transform,
    transformSync,
} from "@swc/css";
import type * as webpack from "webpack";

export interface LoaderOptions {
    sync?: boolean;
    parseMap?: boolean;
    sourceMap?: boolean;
    cssModules?: CssModuleTransformOptions;
}

export default function loader(
    this: webpack.LoaderContext<LoaderOptions>,
    source: Buffer,
    inputSourceMap: any
) {
    // Make the loader async
    const callback = this.async();
    const filename = this.resourcePath;

    const loaderOptions = this.getOptions();

    if (inputSourceMap && typeof inputSourceMap === "object") {
        inputSourceMap = JSON.stringify(inputSourceMap);
    }

    const sync = loaderOptions.sync;
    const parseMap = loaderOptions.parseMap;

    let transformOptions: TransformOptions = {
        sourceMap: loaderOptions.sourceMap,
        filename,
        cssModules: loaderOptions.cssModules,
        minify: false,
    };

    try {
        if (sync) {
            const output = transformSync(source, transformOptions);
            callback(
                null,
                output.code,
                parseMap ? JSON.parse(output.map!) : output.map
            );
        } else {
            transform(source, transformOptions).then(
                (output) => {
                    callback(
                        null,
                        output.code,
                        parseMap ? JSON.parse(output.map!) : output.map
                    );
                },
                (err) => {
                    callback(err);
                }
            );
        }
    } catch (e: any) {
        callback(e);
    }
}

export const raw = true;
