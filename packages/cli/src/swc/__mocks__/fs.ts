import fs from "fs";
import type { Stats } from "fs";

export interface MockHelpers {
    resetMockStats: () => void;
    resetMockFiles: () => void;
    setMockStats: (stats: Record<string, Stats | Error>) => void;
    setMockFile: (path: string, contents: string) => void;
}

const fsMock = jest.createMockFromModule<typeof fs & MockHelpers>("fs");

let mockStats: Record<string, Stats | Error> = {};
let mockFiles: Record<string, string> = {};

function setMockStats(stats: Record<string, Stats | Error>) {
    Object.entries(stats).forEach(([path, stats]) => {
        mockStats[path] = stats;
    });
}

function setMockFile(path: string, contents: string) {
    mockFiles[path] = contents;
}

function resetMockStats() {
    mockStats = {};
}

function resetMockFiles() {
    mockFiles = {};
}

export function stat(path: string, cb: (err?: Error, stats?: Stats) => void) {
    const result = mockStats[path];
    if (result instanceof Error) {
        cb(result, undefined);
    } else {
        cb(undefined, result);
    }
}

export function readFileSync(path: string): string {
    if (!mockFiles[path]) {
        throw new Error("Non existent.");
    }

    return mockFiles[path];
}

fsMock.setMockStats = setMockStats;
fsMock.resetMockStats = resetMockStats;

fsMock.setMockFile = setMockFile;
fsMock.resetMockFiles = resetMockFiles;

fsMock.stat = stat as typeof fs.stat;
fsMock.readFileSync = readFileSync as typeof fs.readFileSync;

export default fsMock;
