import { Options } from "@swc/core";
import handleCompile from "../dirWorker";
import { CliOptions, DEFAULT_OUT_FILE_EXTENSION } from "../options";
import * as utilModule from "../util";
import * as compileModule from "../compile";
import path from "path";

type HandleCompileOptions = {
    cliOptions: CliOptions;
    swcOptions: Options;
    sync: false;
    outDir: "outDir";
    filename: string;
    outFileExtension?: string;
};

const createHandleCompileOptions = (
    options?: Partial<HandleCompileOptions>
): HandleCompileOptions => ({
    cliOptions: {
        outDir: "",
        outFile: "",
        filename: "",
        stripLeadingPaths: false,
        filenames: [],
        sync: false,
        workers: undefined,
        sourceMapTarget: undefined,
        extensions: [],
        watch: false,
        copyFiles: false,
        outFileExtension: "",
        includeDotfiles: false,
        deleteDirOnStart: false,
        quiet: true,
        only: [],
        ignore: [],
    },
    swcOptions: {},
    sync: false,
    outDir: "outDir",
    filename: "",
    ...options,
});

jest.mock("../util", () => ({
    ...jest.requireActual("../util"),
    compile: jest
        .fn()
        .mockReturnValue(Promise.resolve({ code: "code", map: "map" })),
}));

jest.mock("../compile", () => ({
    outputResult: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe("dirWorker", () => {
    it('should call "compile" with the "DEFAULT_OUT_FILE_EXTENSION" when "outFileExtension" is undefined', async () => {
        const filename = "test";
        const options = createHandleCompileOptions({
            filename: `${filename}.ts`,
        });

        try {
            await handleCompile(options);
        } catch (err) {
            // We don't care about the error in this test, we want to make sure that "compile" was called
        }

        // Assert that subFunction was called with the correct parameter
        expect(utilModule.compile).toHaveBeenCalledWith(
            options.filename,
            { sourceFileName: `../${options.filename}` },
            options.sync,
            path.join(
                options.outDir,
                `${filename}.${DEFAULT_OUT_FILE_EXTENSION}`
            )
        );

        expect(compileModule.outputResult).toHaveBeenCalledWith({
            output: {
                code: "code",
                map: "map",
            },
            sourceFile: `${filename}.ts`,
            destFile: path.join(
                options.outDir,
                `${filename}.${DEFAULT_OUT_FILE_EXTENSION}`
            ),
            destDtsFile: path.join(options.outDir, `${filename}.d.ts`),
            destSourcemapFile: path.join(
                options.outDir,
                `${filename}.${DEFAULT_OUT_FILE_EXTENSION}.map`
            ),
            options: { sourceFileName: `../${options.filename}` },
        });
    });

    it('should call "compile" with "outFileExtension" when it is set in options', async () => {
        const filename = "test";
        const options = createHandleCompileOptions({
            filename: `${filename}.ts`,
            outFileExtension: "cjs",
        });

        try {
            await handleCompile(options);
        } catch (err) {
            // We don't care about the error in this test, we want to make sure that "compile" was called
        }

        // Assert that subFunction was called with the correct parameter
        expect(utilModule.compile).toHaveBeenCalledWith(
            options.filename,
            { sourceFileName: `../${options.filename}` },
            options.sync,
            path.join(options.outDir, `${filename}.${options.outFileExtension}`)
        );
    });
});
