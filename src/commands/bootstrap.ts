import { Command } from "commander";

import { detectHost } from "../bootstrap/host.js";
import { installLocalDistribution } from "../bootstrap/install.js";
import { verifyCaptainCli } from "../bootstrap/verify.js";

type BootstrapInstallOptions = {
    destination?: string;
    force?: boolean;
};

type BootstrapVerifyOptions = {
    captain?: string;
};

export function registerBootstrapCommand(program: Command): void {
    const bootstrap = program
        .command("bootstrap")
        .description("Inspect, install, and verify the Captain CLI on a host");

    bootstrap
        .command("doctor")
        .description("Inspect whether this host is ready to run Captain CLI")
        .action(() => {
            const info = detectHost();

            console.log(`Host OS: ${info.os}`);
            console.log(`Architecture: ${info.arch}`);
            console.log(`Home: ${info.home}`);
            console.log(`PATH writable install candidate: ${info.defaultInstallDir}`);

            if (info.supported) {
                console.log("Doctor result: ready");
                return;
            }

            console.log("Doctor result: unsupported host");
            process.exitCode = 1;
        });

    bootstrap
        .command("install")
        .description("Install a local Captain CLI distribution")
        .requiredOption("--source <path>", "local Captain CLI executable/distribution to install")
        .option("--destination <path>", "destination path; defaults to ~/.local/bin/captain")
        .option("--force", "replace an existing Captain CLI executable")
        .action((options: BootstrapInstallOptions & { source: string }) => {
            try {
                const result = installLocalDistribution(
                    options.source,
                    options.destination,
                    Boolean(options.force),
                );
                console.log(`Installed Captain CLI: ${result.destination}`);
                console.log("Install result: succeeded");
            } catch (error) {
                console.error("Install result: failed");
                console.error(`Reason: ${error instanceof Error ? error.message : String(error)}`);
                process.exitCode = 1;
            }
        });

    bootstrap
        .command("verify")
        .description("Verify that Captain CLI is installed and runnable")
        .option("--captain <path>", "path to Captain CLI executable; defaults to PATH lookup")
        .action((options: BootstrapVerifyOptions) => {
            try {
                const result = verifyCaptainCli(options.captain);
                console.log(`Captain CLI: ${result.path}`);
                console.log(`Version output: ${result.versionOutput}`);
                console.log("Verify result: succeeded");
            } catch (error) {
                console.error("Verify result: failed");
                console.error(`Reason: ${error instanceof Error ? error.message : String(error)}`);
                process.exitCode = 1;
            }
        });
}
