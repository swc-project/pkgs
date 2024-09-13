import { existsSync, promises } from "fs";
import { dirname, resolve } from "path";
import Piscina from "piscina";
import { CompileStatus } from "./constants";
import { Callbacks, CliOptions } from "./options";
import { exists, getDest } from "./util";
import handleCompile from "./dirWorker";
import {
    globSources,
    isCompilableExtension,
    splitCompilableAndCopyable,
    watchSources,
} from "./sources";

import type { Options } from "@swc/core";

declare module "fs" {
    namespace promises {
        /**
         * For node > 14 we want to use rm instead of rmdir
         * We need to augment node v12 types
         */
        function rm(dir: string, option: object): void;
    }
}

const { mkdir, rmdir, rm, copyFile, unlink } = promises;

const recursive = { recursive: true };

async function handleCopy(
    filename: string,
    outDir: string,
    stripLeadingPaths: boolean
) {
    const dest = getDest(filename, outDir, stripLeadingPaths);
    const dir = dirname(dest);

    await mkdir(dir, recursive);
    await copyFile(filename, dest);

    return CompileStatus.Copied;
}

async function beforeStartCompilation(cliOptions: CliOptions) {
    const { outDir, deleteDirOnStart } = cliOptions;

    if (deleteDirOnStart) {
        const exists = await existsSync(outDir);
        if (exists) {
            rm ? await rm(outDir, recursive) : await rmdir(outDir, recursive);
        }
    }
}

async function initialCompilation(
    cliOptions: CliOptions,
    swcOptions: Options,
    callbacks?: Callbacks
) {
    const {
        includeDotfiles,
        filenames,
        copyFiles,
        extensions,
        outDir,
        outFileExtension,
        stripLeadingPaths,
        sync,
        quiet,
        watch,
        only,
        ignore,
    } = cliOptions;

    const results = new Map<string, CompileStatus>();
    const reasons = new Map<string, string>();

    const start = process.hrtime();
    const sourceFiles = await globSources(
        filenames,
        only,
        ignore,
        includeDotfiles
    );
    const [compilable, copyable] = splitCompilableAndCopyable(
        sourceFiles,
        extensions,
        copyFiles
    );
    if (sync) {
        for (const filename of compilable) {
            try {
                const result = await handleCompile({
                    filename,
                    outDir,
                    sync,
                    cliOptions,
                    swcOptions,
                    outFileExtension,
                });
                results.set(filename, result);
            } catch (err: any) {
                if (!callbacks?.onFail) {
                    console.error(err.message);
                }
                results.set(filename, CompileStatus.Failed);
            }
        }
        for (const filename of copyable) {
            try {
                const result = await handleCopy(
                    filename,
                    outDir,
                    stripLeadingPaths
                );
                results.set(filename, result);
            } catch (err: any) {
                if (!callbacks?.onFail) {
                    console.error(err.message);
                }
                results.set(filename, CompileStatus.Failed);
            }
        }
    } else {
        const workers = new Piscina({
            filename: resolve(__dirname, "./dirWorker.js"),
            maxThreads: cliOptions.workers,
            concurrentTasksPerWorker: 2,
        });

        await Promise.all([
            Promise.allSettled(
                compilable.map(filename =>
                    workers
                        .run({
                            filename,
                            outDir,
                            sync,
                            cliOptions,
                            swcOptions,
                            outFileExtension,
                        })
                        .catch(err => {
                            if (!callbacks?.onFail) {
                                console.error(err.message);
                            }
                            throw err;
                        })
                )
            ),
            Promise.allSettled(
                copyable.map(file =>
                    handleCopy(file, outDir, stripLeadingPaths)
                )
            ),
        ]).then(([compiled, copied]) => {
            compiled.forEach((result, index) => {
                const filename = compilable[index];
                if (result.status === "fulfilled") {
                    results.set(filename, result.value);
                } else {
                    results.set(filename, CompileStatus.Failed);
                    reasons.set(filename, result.reason.message);
                }
            });

            copied.forEach((result, index) => {
                const filename = copyable[index];
                if (result.status === "fulfilled") {
                    results.set(filename, result.value);
                } else {
                    results.set(filename, CompileStatus.Failed);
                }
            });
        });
    }
    const end = process.hrtime(start);

    let failed = 0;
    let compiled = 0;
    let copied = 0;
    for (let [_, status] of results) {
        switch (status) {
            case CompileStatus.Compiled:
                compiled += 1;
                break;
            case CompileStatus.Failed:
                failed += 1;
                break;
            case CompileStatus.Copied:
                copied += 1;
                break;
        }
    }
    const duration = end[1] / 1000000;

    if (compiled + copied) {
        let message = "";
        if (compiled) {
            message += `Successfully compiled: ${compiled} ${
                compiled > 1 ? "files" : "file"
            }`;
        }
        if (compiled && copied) {
            message += ", ";
        }
        if (copied) {
            message += `copied ${copied} ${copied > 1 ? "files" : "file"}`;
        }
        message += ` with swc (%dms)`;

        if (callbacks?.onSuccess) {
            if (!failed) {
                callbacks.onSuccess({ duration, compiled, copied });
            }
        } else if (!quiet) {
            console.log(message, duration.toFixed(2));
        }
    }

    if (failed) {
        if (callbacks?.onFail) {
            callbacks.onFail({ duration, reasons });
        } else {
            console.log(
                `Failed to compile ${failed} ${
                    failed !== 1 ? "files" : "file"
                } with swc.`
            );
            if (!watch) {
                const files = Array.from(results.entries())
                    .filter(([, status]) => status === CompileStatus.Failed)
                    .map(([filename, _]) => filename)
                    .join("\n");
                throw new Error(`Failed to compile:\n${files}`);
            }
        }
    }
}

async function watchCompilation(
    cliOptions: CliOptions,
    swcOptions: Options,
    callbacks?: Callbacks
) {
    const {
        includeDotfiles,
        filenames,
        copyFiles,
        extensions,
        outDir,
        stripLeadingPaths,
        outFileExtension,
        quiet,
        sync,
    } = cliOptions;

    const watcher = await watchSources(filenames, includeDotfiles);
    watcher.on("ready", () => {
        if (callbacks?.onWatchReady) {
            callbacks.onWatchReady();
        } else if (!quiet) {
            console.info("Watching for file changes.");
        }
    });
    watcher.on("unlink", async filename => {
        try {
            if (isCompilableExtension(filename, extensions)) {
                await unlink(
                    getDest(filename, outDir, stripLeadingPaths, ".js")
                );
                const sourcemapPath = getDest(
                    filename,
                    outDir,
                    stripLeadingPaths,
                    ".js.map"
                );
                const sourcemapExists = await exists(sourcemapPath);
                if (sourcemapExists) {
                    await unlink(sourcemapPath);
                }
            } else if (copyFiles) {
                await unlink(getDest(filename, outDir, stripLeadingPaths));
            }
        } catch (err: any) {
            if (err.code !== "ENOENT") {
                console.error(err.stack);
            }
        }
    });
    for (const type of ["add", "change"]) {
        watcher.on(type, async filename => {
            if (isCompilableExtension(filename, extensions)) {
                const start = process.hrtime();
                const getDuration = () => {
                    const end = process.hrtime(start);
                    const duration = end[1] / 1000000;
                    return duration;
                };
                try {
                    const result = await handleCompile({
                        filename,
                        outDir,
                        sync,
                        cliOptions,
                        swcOptions,
                        outFileExtension,
                    });
                    const duration = getDuration();
                    if (result === CompileStatus.Compiled) {
                        if (callbacks?.onSuccess) {
                            callbacks.onSuccess({
                                duration,
                                compiled: 1,
                                filename,
                            });
                        } else if (!quiet) {
                            console.log(
                                `Successfully compiled ${filename} with swc (%dms)`,
                                duration.toFixed(2)
                            );
                        }
                    }
                } catch (error: any) {
                    if (callbacks?.onFail) {
                        const reasons = new Map<string, string>();
                        reasons.set(filename, error.message);
                        callbacks.onFail({ duration: getDuration(), reasons });
                    } else {
                        console.error(error.message);
                    }
                }
            } else if (copyFiles) {
                const start = process.hrtime();
                const getDuration = () => {
                    const end = process.hrtime(start);
                    const duration = end[1] / 1000000;
                    return duration;
                };
                try {
                    const result = await handleCopy(
                        filename,
                        outDir,
                        stripLeadingPaths
                    );
                    if (result === CompileStatus.Copied) {
                        const duration = getDuration();
                        if (callbacks?.onSuccess) {
                            callbacks.onSuccess({
                                duration,
                                copied: 1,
                                filename,
                            });
                        } else if (!quiet) {
                            console.log(
                                `Successfully copied ${filename} with swc (%dms)`,
                                duration.toFixed(2)
                            );
                        }
                    }
                } catch (error: any) {
                    if (callbacks?.onFail) {
                        const reasons = new Map<string, string>();
                        reasons.set(filename, error.message);
                        callbacks.onFail({ duration: getDuration(), reasons });
                    } else {
                        console.error(`Failed to copy ${filename}`);
                        console.error(error.message);
                    }
                }
            }
        });
    }
}

export default async function dir({
    cliOptions,
    swcOptions,
    callbacks,
}: {
    cliOptions: CliOptions;
    swcOptions: Options;
    callbacks?: Callbacks;
}) {
    const { watch } = cliOptions;

    await beforeStartCompilation(cliOptions);
    await initialCompilation(cliOptions, swcOptions, callbacks);

    if (watch) {
        await watchCompilation(cliOptions, swcOptions, callbacks);
    }
}
