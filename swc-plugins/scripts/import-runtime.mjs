#!/usr/bin/env zx
//
// Run this script using an absolute path to the runtime directory.
import path from "path";
import semver from "semver";
import toml from "toml";
import { $ } from "zx";

const runtimeName = process.argv[2];
const runtimeDir = process.argv[3];

if (!runtimeName || !runtimeDir) {
  console.error("Runtime name and directory are required");
  process.exit(1);
}

const $$ = $({ cwd: runtimeDir });

const repositoryRoot = (await $$`git rev-parse --show-toplevel`.text()).trim();
const cargoLockPath = path.resolve(`${runtimeDir}/Cargo.lock`);
const relativePathToCargoLock = path.relative(repositoryRoot, cargoLockPath);

console.log("Runtime name:", runtimeName);
console.log("Runtime dir:", runtimeDir);
console.log("Repository root:", repositoryRoot);
console.log("Cargo.lock path:", cargoLockPath);
console.log("Relative path to Cargo.lock:", relativePathToCargoLock);

// Get all git tags
const gitTags = (await $$`git tag`.text()).trim().split("\n").reverse();

const data = {
  runtime: runtimeName,
  versions: [],
};

// For each tag, get the content of `${runtimeDir}/Cargo.lock`.
for (const tag of gitTags) {
  let tagVersion = tag.replace("v", "");
  if (!semver.valid(tagVersion)) {
    console.log(`Skipping tag ${tag} because it is not a valid semver`);
    continue;
  }

  try {
    const cargoLock =
      await $$`git show ${tag}:${relativePathToCargoLock}`.text();

    const parsed = toml.parse(cargoLock);
    const packages = parsed.package;

    for (const pkg of packages) {
      if (pkg.name === "swc_core") {
        const swcCoreVersion = pkg.version;

        data.versions.push({
          version: tagVersion,
          swcCoreVersion,
        });
        console.log(`Found swc_core version ${swcCoreVersion} for tag ${tag}`);
      }
    }

    // Send the data to the server
    if (data.versions.length >= 10) {
      await fetch("http://localhost:50000/import/runtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      data.versions = [];
    }
  } catch (e) {
    console.error(`Failed to parse Cargo.lock for tag ${tag}: ${e}`);
  }
}

await fetch("http://localhost:50000/import/runtime", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});
