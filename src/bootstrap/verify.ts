import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type VerifyResult = {
    path: string;
    versionOutput: string;
};

function executableCandidates(name: string): string[] {
    if (process.platform === "win32") {
        return [`${name}.cmd`, `${name}.exe`, name];
    }

    return [name];
}

export function findOnPath(name: string): string | undefined {
    const pathValue = process.env.PATH ?? "";
    const directories = pathValue.split(path.delimiter).filter(Boolean);

    for (const directory of directories) {
        for (const candidate of executableCandidates(name)) {
            const fullPath = path.join(directory, candidate);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    return fullPath;
                }
            } catch {
                // Keep looking.
            }
        }
    }

    return undefined;
}

export function verifyCaptainCli(explicitPath?: string): VerifyResult {
    const resolvedPath = explicitPath || findOnPath("captain");

    if (!resolvedPath) {
        throw new Error("Captain CLI was not found on PATH");
    }

    try {
        const output = execFileSync(resolvedPath, ["--cli-version"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();

        return {
            path: resolvedPath,
            versionOutput: output,
        };
    } catch (error) {
        throw new Error(
            `Captain CLI at ${resolvedPath} is not runnable: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}
