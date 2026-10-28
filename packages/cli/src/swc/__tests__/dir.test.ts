import { swcDir } from "../index";

jest.mock("../compile", () => ({
    outputResult: jest.fn(),
}));

let mockRun: any;
const mockDestroy = jest.fn();

jest.mock("piscina", () => ({
    __esModule: true,
    default: class {
        run(...args: any[]) {
            return mockRun(...args);
        }
        destroy() {
            return mockDestroy();
        }
    },
}));

const cliOptions: any = {
    outDir: "./.temp/",
    watch: false,
    filenames: ["./src/swcx/"],
    extensions: [".ts"],
    stripLeadingPaths: true,
    sync: false,
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

describe("dir worker pool", () => {
    beforeEach(() => {
        mockDestroy.mockClear();
    });

    it("should destroy the pool after a successful compilation", async () => {
        mockRun = () => Promise.resolve(1); // mock compile success

        const onSuccess = jest.fn();
        const onFail = jest.fn();

        await swcDir({
            cliOptions,
            swcOptions,
            callbacks: { onSuccess, onFail },
        });

        expect(onSuccess.mock.calls).toHaveLength(1);
        expect(mockDestroy.mock.calls).toHaveLength(1);
    });

    it("should destroy the pool when a file fails to compile", async () => {
        mockRun = () => Promise.reject(new Error("fail")); // mock compile fail

        const onSuccess = jest.fn();
        const onFail = jest.fn();

        await swcDir({
            cliOptions,
            swcOptions,
            callbacks: { onSuccess, onFail },
        });

        expect(onFail.mock.calls).toHaveLength(1);
        expect(mockDestroy.mock.calls).toHaveLength(1);
    });
});
