import { RawSourceMap, SourceMapGenerator } from "source-map-js";
import {
    CssModuleTransformOptions,
    TransformOptions,
    transform,
    transformSync,
} from "@swc/css";
import type * as webpack from "webpack";
import {
    getImportCode,
    getModuleCode,
    getExportCode,
    CssImport,
    ApiReplacement,
    ApiParam,
    CssTransformResult,
} from "./codegen.js";

export interface LoaderOptions {
    sync?: boolean;
    parseMap?: boolean;
    sourceMap?: boolean;
    cssModules?: CssModuleTransformOptions;

    esModule?: boolean;

    exportType?: "string" | "array" | "css-style-sheet" | string;

    exportLocalsConventionType?:
        | "camelCase"
        | "camelCaseOnly"
        | "dashes"
        | "dashesOnly"
        | "asIs"
        | string;

    modules: ModulesOptions;
}

export interface ModulesOptions {
    namedExport: boolean;
    exportOnlyLocals: boolean;
    exportLocalsConvention: (name: string) => string;
}

export default async function loader(
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
        analyzeDependencies: true,
    };

    let isTemplateLiteralSupported = false;

    if (
        // eslint-disable-next-line no-underscore-dangle
        this._compilation &&
        // eslint-disable-next-line no-underscore-dangle
        this._compilation.options &&
        // eslint-disable-next-line no-underscore-dangle
        this._compilation.options.output &&
        // eslint-disable-next-line no-underscore-dangle
        this._compilation.options.output.environment &&
        // eslint-disable-next-line no-underscore-dangle
        this._compilation.options.output.environment.templateLiteral
    ) {
        isTemplateLiteralSupported = true;
    }

    const imports: CssImport[] = [];
    const api: ApiParam[] = [];
    const replacements: ApiReplacement[] = [];

    const options: LoaderOptions = {};

    const transformResult = await transform(source, transformOptions);
    const deps = JSON.parse(transformResult.deps!);
    console.log(deps);
    const result: CssTransformResult = {
        css: transformResult.code,
        map: transformResult.map ? JSON.parse(transformResult.map) : undefined,
    };

    const importCode = getImportCode(imports, options);

    let moduleCode: string | undefined;

    try {
        moduleCode = getModuleCode(
            result,
            api,
            replacements,
            options,
            isTemplateLiteralSupported,
            this
        );
    } catch (error: any) {
        callback(error);

        return;
    }

    const exportCode = getExportCode(options, isTemplateLiteralSupported);

    callback(null, `${importCode}${moduleCode}${exportCode}`);
}

export const raw = true;
