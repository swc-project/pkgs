import slash from "slash";
import { dirname, relative } from "path";
import { CompileStatus } from "./constants";
import { compile, getDest, mapDtsExt, mapTsExt, deepClone } from "./util";
import { outputResult } from "./compile";

import type { Options } from "@swc/core";
import type { CliOptions } from "./options";

export default async function handleCompile(opts: {
    filename: string;
    outDir: string;
    sync: boolean;
    cliOptions: CliOptions;
    swcOptions: Options;
    outFileExtension?: string;
}) {
    // Create a deep clone of the options to prevent shared references
    const clonedOpts = deepClone(opts);

    const dest = getDest(
        clonedOpts.filename,
        clonedOpts.outDir,
        clonedOpts.cliOptions.stripLeadingPaths,
        `.${clonedOpts.outFileExtension ?? mapTsExt(clonedOpts.filename)}`
    );
    const sourceFileName = slash(relative(dirname(dest), clonedOpts.filename));

    // Create a fresh copy of the swcOptions
    const options = deepClone(clonedOpts.swcOptions);

    // Set sourceFileName in the options
    options.sourceFileName = sourceFileName;

    // Ensure we have the right extension for output files
    // Instead of directly setting on module.outFileExtension (which might not exist in the type),
    // we'll pass it separately to the compile function

    const result = await compile(
        clonedOpts.filename,
        options,
        clonedOpts.sync,
        dest
    );

    if (result) {
        const destDts = getDest(
            clonedOpts.filename,
            clonedOpts.outDir,
            clonedOpts.cliOptions.stripLeadingPaths,
            `.${mapDtsExt(clonedOpts.filename)}`
        );
        const destSourcemap = dest + ".map";
        await outputResult({
            output: result,
            sourceFile: clonedOpts.filename,
            destFile: dest,
            destDtsFile: destDts,
            destSourcemapFile: destSourcemap,
            options,
        });
        return CompileStatus.Compiled;
    } else {
        return CompileStatus.Omitted;
    }
}
