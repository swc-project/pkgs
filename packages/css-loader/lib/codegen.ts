import { LoaderOptions } from "./index.js";

export interface CssImport {
    importName: string;
    url: string;
    type: "url" | string;
}

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

export function getModuleCode(
    result,
    api,
    replacements,
    options: LoaderOptions,
    isTemplateLiteralSupported: boolean,
    loaderContext
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
                .concat(hash ? [`hash: ${JSON.stringify(hash)}`] : [])
                .concat(needQuotes ? "needQuotes: true" : []);
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
    exports,
    replacements,
    icssPluginUsed,
    options: LoaderOptions,
    isTemplateLiteralSupported: boolean
) {
    let code = "// Exports\n";

    if (icssPluginUsed) {
        let localsCode = "";

        const addExportToLocalsCode = (names, value) => {
            const normalizedNames = Array.isArray(names)
                ? new Set(names)
                : new Set([names]);

            for (const name of normalizedNames) {
                if (options.modules.namedExport) {
                    localsCode += `export var ${name} = ${
                        isTemplateLiteralSupported
                            ? convertToTemplateLiteral(value)
                            : JSON.stringify(value)
                    };\n`;
                } else {
                    if (localsCode) {
                        localsCode += `,\n`;
                    }

                    localsCode += `\t${JSON.stringify(name)}: ${
                        isTemplateLiteralSupported
                            ? convertToTemplateLiteral(value)
                            : JSON.stringify(value)
                    }`;
                }
            }
        };

        for (const { name, value } of exports) {
            addExportToLocalsCode(
                options.modules.exportLocalsConvention(name),
                value
            );
        }

        for (const item of replacements) {
            const { replacementName, localName } = item;

            if (localName) {
                const { importName } = item;

                localsCode = localsCode.replace(
                    new RegExp(replacementName, "g"),
                    () => {
                        if (options.modules.namedExport) {
                            return isTemplateLiteralSupported
                                ? `\${${importName}_NAMED___[${JSON.stringify(
                                      getValidLocalName(
                                          localName,
                                          options.modules.exportLocalsConvention
                                      )
                                  )}]}`
                                : `" + ${importName}_NAMED___[${JSON.stringify(
                                      getValidLocalName(
                                          localName,
                                          options.modules.exportLocalsConvention
                                      )
                                  )}] + "`;
                        } else if (options.modules.exportOnlyLocals) {
                            return isTemplateLiteralSupported
                                ? `\${${importName}[${JSON.stringify(
                                      localName
                                  )}]}`
                                : `" + ${importName}[${JSON.stringify(
                                      localName
                                  )}] + "`;
                        }

                        return isTemplateLiteralSupported
                            ? `\${${importName}.locals[${JSON.stringify(
                                  localName
                              )}]}`
                            : `" + ${importName}.locals[${JSON.stringify(
                                  localName
                              )}] + "`;
                    }
                );
            } else {
                localsCode = localsCode.replace(
                    new RegExp(replacementName, "g"),
                    () =>
                        isTemplateLiteralSupported
                            ? `\${${replacementName}}`
                            : `" + ${replacementName} + "`
                );
            }
        }

        if (options.modules.exportOnlyLocals) {
            code += options.modules.namedExport
                ? localsCode
                : `${
                      options.esModule ? "export default" : "module.exports ="
                  } {\n${localsCode}\n};\n`;

            return code;
        }

        code += options.modules.namedExport
            ? localsCode
            : `___CSS_LOADER_EXPORT___.locals = {${
                  localsCode ? `\n${localsCode}\n` : ""
              }};\n`;
    }

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
