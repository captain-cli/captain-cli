import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type InstallResult = {
    destination: string;
};

export function defaultInstallDestination(): string {
    return path.join(os.homedir(), ".local", "bin", process.platform === "win32" ? "captain.cmd" : "captain");
}

export function installLocalDistribution(
    source: string,
    destination = defaultInstallDestination(),
    force = false,
): InstallResult {
    let sourceStats: fs.Stats;

    try {
        sourceStats = fs.statSync(source);
    } catch (error) {
        throw new Error(`Cannot read source ${source}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!sourceStats.isFile()) {
        throw new Error(`Source must be a file: ${source}`);
    }

    if (fs.existsSync(destination) && !force) {
        throw new Error(`Destination already exists: ${destination} (use --force to replace)`);
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o755 });

    const temporaryDestination = `${destination}.tmp-${process.pid}`;

    try {
        fs.copyFileSync(source, temporaryDestination);
        if (process.platform !== "win32") {
            fs.chmodSync(temporaryDestination, 0o755);
        }
        fs.renameSync(temporaryDestination, destination);
    } catch (error) {
        try {
            fs.rmSync(temporaryDestination, { force: true });
        } catch {
            // Best-effort cleanup after a failed installation.
        }
        throw new Error(
            `Cannot install Captain CLI to ${destination}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    return { destination };
}
