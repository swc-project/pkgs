import * as swc from "@swc/core";
import slash from "slash";
import { mkdirSync, writeFileSync, promises } from "fs";
import { dirname, extname, join, relative } from "path";
import { stderr } from "process";

/**
 * Deep clone an object to ensure no shared references
 * @param obj The object to clone
 * @returns A new deep-cloned object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return (obj.map(item => deepClone(item)) as unknown) as T;
    }

    const result = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepClone(obj[key]);
        }
    }
    return result;
}

export async function exists(path: string): Promise<boolean> {
    let pathExists = true;
    try {
        await promises.access(path);
    } catch (err: any) {
        pathExists = false;
    }
    return pathExists;
}

export async function transform(
    filename: string,
    code: string,
    opts: swc.Options,
    sync: boolean,
    outputPath: string | undefined
): Promise<swc.Output> {
    opts = {
        filename,
        ...opts,
    };

    if (outputPath) {
        opts.outputPath = outputPath;
    }

    if (sync) {
        return swc.transformSync(code, opts);
    }

    return swc.transform(code, opts);
}

export async function compile(
    filename: string,
    opts: swc.Options,
    sync: boolean,
    outputPath: string | undefined
): Promise<swc.Output | void> {
    // Deep clone the options to ensure we don't have any shared references
    opts = deepClone({
        ...opts,
    });

    if (outputPath) {
        opts.outputPath = outputPath;

        // Extract the extension from the output path to ensure module resolution uses it
        const ext = extname(outputPath);
        if (ext && opts.module && typeof opts.module === "object") {
            // Force the module to use the correct extension for import path resolution
            // This explicit setting helps ensure we don't reuse cached module config
            // @ts-ignore: Adding a custom property that might not be in the type definition
            opts.module.forcedOutputFileExtension = ext.slice(1); // Remove the leading dot
        }
    }

    try {
        const result = sync
            ? swc.transformFileSync(filename, opts)
            : await swc.transformFile(filename, opts);

        if (result.map) {
            // TODO: fix this in core
            // https://github.com/swc-project/swc/issues/1388
            const sourceMap = JSON.parse(result.map);
            if (opts.sourceFileName) {
                sourceMap["sources"][0] = opts.sourceFileName;
            }
            if (opts.sourceRoot) {
                sourceMap["sourceRoot"] = opts.sourceRoot;
            }
            result.map = JSON.stringify(sourceMap);
        }
        return result;
    } catch (err: any) {
        if (!err.message.includes("ignored by .swcrc")) {
            throw err;
        }
    }
}

export function outputFile(
    output: swc.Output,
    filename: string,
    sourceMaps: undefined | swc.Options["sourceMaps"]
) {
    const destDir = dirname(filename);
    mkdirSync(destDir, { recursive: true });

    let code = output.code;
    if (output.map && sourceMaps !== "inline") {
        // we've requested for a sourcemap to be written to disk
        const fileDirName = dirname(filename);
        const mapLoc = filename + ".map";
        code +=
            "\n//# sourceMappingURL=" + slash(relative(fileDirName, mapLoc));
        writeFileSync(mapLoc, output.map);
    }

    writeFileSync(filename, code);
}

export function assertCompilationResult<T>(
    result: Map<string, Error | T>,
    quiet = false
): asserts result is Map<string, T> {
    let compiled = 0;
    let copied = 0;
    let failed = 0;
    for (const value of result.values()) {
        if (value instanceof Error) {
            failed++;
        } else if ((value as unknown) === "copied") {
            copied++;
        } else if (value) {
            compiled++;
        }
    }
    if (!quiet && compiled + copied > 0) {
        const copyResult = copied === 0 ? " " : ` (copied ${copied}) `;
        stderr.write(
            `Successfully compiled ${compiled} ${
                compiled !== 1 ? "files" : "file"
            }${copyResult}with swc.\n`
        );
    }

    if (failed > 0) {
        throw new Error(
            `Failed to compile ${failed} ${
                failed !== 1 ? "files" : "file"
            } with swc.`
        );
    }
}

function stripComponents(filename: string) {
    const components = filename.split("/").slice(1);
    if (!components.length) {
        return filename;
    }
    while (components[0] === "..") {
        components.shift();
    }
    return components.join("/");
}

const cwd = process.cwd();

export function getDest(
    filename: string,
    outDir: string,
    stripLeadingPaths: boolean,
    ext?: string
) {
    let base = slash(relative(cwd, filename));
    if (stripLeadingPaths) {
        base = stripComponents(base);
    }
    if (ext) {
        base = base.replace(/\.\w*$/, ext);
    }
    return join(outDir, base);
}

export function mapTsExt(filename: string) {
    return (
        {
            ".ts": "js",
            ".mts": "mjs",
            ".cts": "cjs",
        }[extname(filename)] ?? "js"
    );
}

export function mapDtsExt(filename: string) {
    return (
        {
            ".ts": "d.ts",
            ".mts": "d.mts",
            ".cts": "d.cts",
        }[extname(filename)] ?? "d.ts"
    );
}
