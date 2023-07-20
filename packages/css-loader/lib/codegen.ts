import { RawSourceMap, SourceMapGenerator } from "source-map-js";
import { LoaderOptions, ModulesOptions } from "./index.js";
import type * as webpack from "webpack";
import path from "path";

export interface CssImport {
    importName: string;
    url: string;
    type: "url" | string;
}

export interface CssTransformResult {
    map: RawSourceMap;
    css: string;
}

export type SourceMap = SourceMapGenerator & {
    toJSON(): RawSourceMap;
};

export function getImportCode(imports: CssImport[], options: LoaderOptions) {
    let code = "";

    for (const item of imports) {
        const { importName, url, type } = item;

        code +=
            type === "url"
                ? `var ${importName} = new URL(${url}, import.meta.url);\n`
                : `import ${importName} from ${url};\n`;
    }

    return code ? `// Imports\n${code}` : "";
}

export interface ApiParam {
    url: string;
    importName?: string;

    layer: string;
    supports: string;
    media: string;

    dedupe?: boolean;
}

export interface ApiReplacement {
    replacementName: string;
    localName: string;
    importName: string;
    needQuotes: boolean;
    hash: string;
}

export function getModuleCode(
    result: CssTransformResult,
    api: ApiParam[],
    replacements: ApiReplacement[],
    options: LoaderOptions,
    isTemplateLiteralSupported: boolean,
    loaderContext: webpack.LoaderContext<LoaderOptions>
) {
    if (options.modules.exportOnlyLocals === true) {
        return "";
    }

    let sourceMapValue = "";

    if (options.sourceMap) {
        const sourceMap = result.map;

        sourceMapValue = `,${normalizeSourceMapForRuntime(
            sourceMap,
            loaderContext
        )}`;
    }

    let code = isTemplateLiteralSupported
        ? convertToTemplateLiteral(result.css)
        : JSON.stringify(result.css);

    let beforeCode = `var ___CSS_LOADER_EXPORT___ = ___CSS_LOADER_API_IMPORT___(${
        options.sourceMap
            ? "___CSS_LOADER_API_SOURCEMAP_IMPORT___"
            : "___CSS_LOADER_API_NO_SOURCEMAP_IMPORT___"
    });\n`;

    for (const item of api) {
        const { url, layer, supports, media, dedupe } = item;

        if (url) {
            // eslint-disable-next-line no-undefined
            const printedParam = printParams(media, undefined, supports, layer);

            beforeCode += `___CSS_LOADER_EXPORT___.push([module.id, ${JSON.stringify(
                `@import url(${url});`
            )}${printedParam.length > 0 ? `, ${printedParam}` : ""}]);\n`;
        } else {
            const printedParam = printParams(media, dedupe, supports, layer);

            beforeCode += `___CSS_LOADER_EXPORT___.i(${item.importName}${
                printedParam.length > 0 ? `, ${printedParam}` : ""
            });\n`;
        }
    }

    for (const item of replacements) {
        const { replacementName, importName, localName } = item;

        if (localName) {
            code = code.replace(new RegExp(replacementName, "g"), () =>
                options.modules.namedExport
                    ? isTemplateLiteralSupported
                        ? `\${ ${importName}_NAMED___[${JSON.stringify(
                              getValidLocalName(
                                  localName,
                                  options.modules.exportLocalsConvention
                              )
                          )}] }`
                        : `" + ${importName}_NAMED___[${JSON.stringify(
                              getValidLocalName(
                                  localName,
                                  options.modules.exportLocalsConvention
                              )
                          )}] + "`
                    : isTemplateLiteralSupported
                    ? `\${${importName}.locals[${JSON.stringify(localName)}]}`
                    : `" + ${importName}.locals[${JSON.stringify(
                          localName
                      )}] + "`
            );
        } else {
            const { hash, needQuotes } = item;
            const getUrlOptions = []
                .concat(hash ? [`hash: ${JSON.stringify(hash)}`] : ([] as any))
                .concat(needQuotes ? "needQuotes: true" : ([] as any));
            const preparedOptions =
                getUrlOptions.length > 0
                    ? `, { ${getUrlOptions.join(", ")} }`
                    : "";

            beforeCode += `var ${replacementName} = ___CSS_LOADER_GET_URL_IMPORT___(${importName}${preparedOptions});\n`;
            code = code.replace(new RegExp(replacementName, "g"), () =>
                isTemplateLiteralSupported
                    ? `\${${replacementName}}`
                    : `" + ${replacementName} + "`
            );
        }
    }

    // Indexes description:
    // 0 - module id
    // 1 - CSS code
    // 2 - media
    // 3 - source map
    // 4 - supports
    // 5 - layer
    return `${beforeCode}// Module\n___CSS_LOADER_EXPORT___.push([module.id, ${code}, ""${sourceMapValue}]);\n`;
}

export function getExportCode(
    options: LoaderOptions,
    isTemplateLiteralSupported: boolean
) {
    let code = "// Exports\n";

    const isCSSStyleSheetExport = options.exportType === "css-style-sheet";

    if (isCSSStyleSheetExport) {
        code += "var ___CSS_LOADER_STYLE_SHEET___ = new CSSStyleSheet();\n";
        code +=
            "___CSS_LOADER_STYLE_SHEET___.replaceSync(___CSS_LOADER_EXPORT___.toString());\n";
    }

    let finalExport;

    switch (options.exportType) {
        case "string":
            finalExport = "___CSS_LOADER_EXPORT___.toString()";
            break;
        case "css-style-sheet":
            finalExport = "___CSS_LOADER_STYLE_SHEET___";
            break;
        default:
        case "array":
            finalExport = "___CSS_LOADER_EXPORT___";
            break;
    }

    code += `${
        options.esModule ? "export default" : "module.exports ="
    } ${finalExport};\n`;

    return code;
}

function normalizeSourceMapForRuntime(
    map: RawSourceMap | undefined,
    loaderContext: webpack.LoaderContext<LoaderOptions>
) {
    const resultMap = map ? map : null;

    if (resultMap) {
        delete resultMap.file;

        /* eslint-disable no-underscore-dangle */
        if (
            loaderContext._compilation &&
            loaderContext._compilation.options &&
            loaderContext._compilation.options.devtool &&
            loaderContext._compilation.options.devtool.includes("nosources")
        ) {
            /* eslint-enable no-underscore-dangle */

            delete resultMap.sourcesContent;
        }

        resultMap.sourceRoot = "";
        resultMap.sources = resultMap.sources.map((source) => {
            // Non-standard syntax from `postcss`
            if (source.indexOf("<") === 0) {
                return source;
            }

            const sourceType = getURLType(source);

            if (sourceType !== "path-relative") {
                return source;
            }

            const resourceDirname = path.dirname(loaderContext.resourcePath);
            const absoluteSource = path.resolve(resourceDirname, source);
            const contextifyPath = normalizePath(
                path.relative(loaderContext.rootContext, absoluteSource)
            );

            return `webpack://./${contextifyPath}`;
        });
    }

    return JSON.stringify(resultMap);
}

function getValidLocalName(
    localName: string,
    exportLocalsConvention: ModulesOptions["exportLocalsConvention"]
) {
    const result = exportLocalsConvention(localName);

    return Array.isArray(result) ? result[0] : result;
}

function printParams(
    media: string,
    dedupe: boolean | undefined,
    supports: string,
    layer: string
) {
    let result = "";

    if (typeof layer !== "undefined") {
        result = `, ${JSON.stringify(layer)}`;
    }

    if (typeof supports !== "undefined") {
        result = `, ${JSON.stringify(supports)}${result}`;
    } else if (result.length > 0) {
        result = `, undefined${result}`;
    }

    if (dedupe) {
        result = `, true${result}`;
    } else if (result.length > 0) {
        result = `, false${result}`;
    }

    if (media) {
        result = `${JSON.stringify(media)}${result}`;
    } else if (result.length > 0) {
        result = `""${result}`;
    }

    return result;
}

const SLASH = "\\".charCodeAt(0);
const BACKTICK = "`".charCodeAt(0);
const DOLLAR = "$".charCodeAt(0);

function convertToTemplateLiteral(str: string) {
    let escapedString = "";

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        escapedString +=
            code === SLASH || code === BACKTICK || code === DOLLAR
                ? `\\${str[i]}`
                : str[i];
    }

    return `\`${escapedString}\``;
}

function normalizePath(file: string) {
    return path.sep === "\\" ? file.replace(/\\/g, "/") : file;
}

// We can't use path.win32.isAbsolute because it also matches paths starting with a forward slash
const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;

const ABSOLUTE_SCHEME = /^[a-z0-9+\-.]+:/i;

function getURLType(source: string) {
    if (source[0] === "/") {
        if (source[1] === "/") {
            return "scheme-relative";
        }

        return "path-absolute";
    }

    if (IS_NATIVE_WIN32_PATH.test(source)) {
        return "path-absolute";
    }

    return ABSOLUTE_SCHEME.test(source) ? "absolute" : "path-relative";
}
