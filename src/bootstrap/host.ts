import os from "node:os";
import path from "node:path";

export type HostInfo = {
    os: NodeJS.Platform;
    arch: string;
    home: string;
    defaultInstallDir: string;
    supported: boolean;
};

const SUPPORTED_PLATFORMS = new Set<NodeJS.Platform>(["linux", "darwin", "win32"]);
const SUPPORTED_ARCHITECTURES = new Set(["x64", "arm64"]);

export function detectHost(): HostInfo {
    const home = os.homedir();

    return {
        os: process.platform,
        arch: process.arch,
        home,
        defaultInstallDir: path.join(home, ".local", "bin"),
        supported:
            SUPPORTED_PLATFORMS.has(process.platform) &&
            SUPPORTED_ARCHITECTURES.has(process.arch),
    };
}
