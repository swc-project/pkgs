import slash from "slash";
import { promises } from "fs";
import { dirname, relative } from "path";
import { transformFile, transformFileSync } from "@swc/core";
import type { Options, Output } from "@swc/core";

const { mkdir, stat, writeFile } = promises;

function withSourceMap(
    output: Output,
    options: Options,
    sourceMapFile: string,
    destDir: string
) {
    let dts: string | undefined;

    // TODO: Remove once fixed in core
    if ((output as any).output) {
        const json = JSON.parse((output as any).output);

        if (json.__swc_isolated_declarations__) {
            dts = json.__swc_isolated_declarations__;
        }
    }

    if (!output.map || options.sourceMaps === "inline") {
        return {
            sourceCode: output.code,
            dts,
        };
    }
    // TODO: remove once fixed in core https://github.com/swc-project/swc/issues/1388
    const sourceMap = JSON.parse(output.map);
    if (options.sourceFileName) {
        sourceMap["sources"][0] = options.sourceFileName;
    }
    if (options.sourceRoot) {
        sourceMap["sourceRoot"] = options.sourceRoot;
    }
    output.map = JSON.stringify(sourceMap);

    output.code += `\n//# sourceMappingURL=${slash(
        relative(destDir, sourceMapFile)
    )}`;

    return {
        sourceMap: output.map,
        sourceCode: output.code,
        dts,
    };
}

export async function outputResult({
    output,
    sourceFile,
    destFile,
    destDtsFile,
    destSourcemapFile,
    options,
}: {
    output: Output;
    sourceFile: string;
    destFile: string;
    destDtsFile: string;
    destSourcemapFile: string;
    options: Options;
}) {
    const destDir = dirname(destFile);

    const { sourceMap, sourceCode, dts } = withSourceMap(
        output,
        options,
        destSourcemapFile,
        destDir
    );

    await mkdir(destDir, { recursive: true });
    const { mode } = await stat(sourceFile);

    const dtsPromise = dts
        ? writeFile(destDtsFile, dts, { mode })
        : Promise.resolve();
    const sourceMapPromise = sourceMap
        ? writeFile(destSourcemapFile, sourceMap, { mode })
        : Promise.resolve();

    await Promise.all([
        writeFile(destFile, sourceCode, { mode }),
        dtsPromise,
        sourceMapPromise,
    ]);
}

export async function compile(
    filename: string,
    opts: Options,
    sync: boolean,
    outputPath: string | undefined
): Promise<Output | void> {
    const options = { ...opts };
    if (outputPath) {
        options.outputPath = outputPath;
    }

    try {
        const result = sync
            ? transformFileSync(filename, options)
            : await transformFile(filename, options);

        return result;
    } catch (err: any) {
        if (!err.message.includes("ignored by .swcrc")) {
            throw err;
        }
    }
}
