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
import path from "path";

export interface Options {
    sourceMap: boolean;
    esModule: boolean;

    cssModules: CssModuleTransformOptions;

    exportType: "string" | "array" | "css-style-sheet" | string;

    exportLocalsConventionType:
        | "camelCase"
        | "camelCaseOnly"
        | "dashes"
        | "dashesOnly"
        | "asIs"
        | string;

    modules: ModulesOptions;
}

export type LoaderOptions = Partial<Options> & {
    sync?: boolean;
    parseMap?: boolean;
};

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
    console.log(`Filename: ${filename}`);

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

    const options: Options = {
        // TODO
        modules: {
            namedExport: false,
            exportOnlyLocals: false,
            exportLocalsConvention: (name: string) => name,
        },
        sourceMap: false,
        esModule: true,
        cssModules: {
            pattern:
                loaderOptions.cssModules?.pattern ??
                "[filename]-[local]-[hash]",
        },
        exportType: "string",
        exportLocalsConventionType: "asIs",
    };

    if (options.modules.exportOnlyLocals !== true) {
        imports.unshift({
            type: "api_import",
            importName: "___CSS_LOADER_API_IMPORT___",
            url: stringifyRequest(this, require.resolve("./runtime/api")),
        });

        if (options.sourceMap) {
            imports.unshift({
                importName: "___CSS_LOADER_API_SOURCEMAP_IMPORT___",
                url: stringifyRequest(
                    this,
                    require.resolve("./runtime/sourceMaps")
                ),
            });
        } else {
            imports.unshift({
                importName: "___CSS_LOADER_API_NO_SOURCEMAP_IMPORT___",
                url: stringifyRequest(
                    this,
                    require.resolve("./runtime/noSourceMaps")
                ),
            });
        }
    }

    const transformResult = await transformSync(source, transformOptions);
    const deps = JSON.parse(transformResult.deps!);
    const result: CssTransformResult = {
        css: transformResult.code,
        map: transformResult.map ? JSON.parse(transformResult.map) : undefined,
    };

    console.log(`Deps`, deps);

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

    console.log(
        `One file: ${importCode}\n===== =====\n${moduleCode}\n===== =====\n${exportCode}`
    );

    callback(null, `${importCode}${moduleCode}${exportCode}`);
}

export const raw = true;

const matchRelativePath = /^\.\.?[/\\]/;

function isAbsolutePath(str: string) {
    return path.posix.isAbsolute(str) || path.win32.isAbsolute(str);
}

function isRelativePath(str: string) {
    return matchRelativePath.test(str);
}

// TODO simplify for the next major release
function stringifyRequest(
    loaderContext: webpack.LoaderContext<LoaderOptions>,
    request: string
) {
    if (
        typeof loaderContext.utils !== "undefined" &&
        typeof loaderContext.utils.contextify === "function"
    ) {
        return JSON.stringify(
            loaderContext.utils.contextify(
                loaderContext.context || loaderContext.rootContext,
                request
            )
        );
    }

    const splitted = request.split("!");
    const { context } = loaderContext;

    return JSON.stringify(
        splitted
            .map((part) => {
                // First, separate singlePath from query, because the query might contain paths again
                const splittedPart = part.match(/^(.*?)(\?.*)/);
                const query = splittedPart ? splittedPart[2] : "";
                let singlePath = splittedPart ? splittedPart[1] : part;

                if (isAbsolutePath(singlePath) && context) {
                    singlePath = path.relative(context, singlePath);

                    if (isAbsolutePath(singlePath)) {
                        // If singlePath still matches an absolute path, singlePath was on a different drive than context.
                        // In this case, we leave the path platform-specific without replacing any separators.
                        // @see https://github.com/webpack/loader-utils/pull/14
                        return singlePath + query;
                    }

                    if (isRelativePath(singlePath) === false) {
                        // Ensure that the relative path starts at least with ./ otherwise it would be a request into the modules directory (like node_modules).
                        singlePath = `./${singlePath}`;
                    }
                }

                return singlePath.replace(/\\/g, "/") + query;
            })
            .join("!")
    );
}
