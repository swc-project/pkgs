import { swcDir } from "../index";

jest.mock("../compile", () => ({
    outputResult: jest.fn(),
}));

let mockComplie: any;

jest.mock("../dirWorker", () => ({
    __esModule: true,
    default: () => mockComplie(),
}));

const cliOptions: any = {
    outDir: "./.temp/",
    watch: false,
    filenames: ["./src/swcx/"],
    extensions: [".ts"],
    stripLeadingPaths: true,
    sync: true,
};
const swcOptions: any = {
    jsc: {
        target: "esnext",
        externalHelpers: false,
    },
    module: {
        type: "commonjs",
    },
};

describe("dir callbacks", () => {
    it("onSuccess should be called", async () => {
        mockComplie = () => Promise.resolve(1); // mock complie success

        const onSuccess = jest.fn();
        const onFail = jest.fn();

        await swcDir({
            cliOptions: cliOptions,
            swcOptions: swcOptions,
            callbacks: {
                onSuccess,
                onFail,
            },
        });

        expect(onSuccess.mock.calls).toHaveLength(1);
        expect(onFail.mock.calls).toHaveLength(0);
    });

    it("onFail should be called", async () => {
        mockComplie = () => Promise.reject(new Error("fail")); // mock complie fail

        const onSuccess = jest.fn();
        const onFail = jest.fn();

        await swcDir({
            cliOptions: cliOptions,
            swcOptions: swcOptions,
            callbacks: {
                onSuccess,
                onFail,
            },
        });

        expect(onSuccess.mock.calls).toHaveLength(0);
        expect(onFail.mock.calls).toHaveLength(1);
    });
});
