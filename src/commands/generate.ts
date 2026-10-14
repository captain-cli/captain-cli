import { Command } from "commander";

import {
    getBumpRulesPath,
    getMasterManifestPath,
} from "@captain/manifest/core/manifest";
import { syncGeneratedManifests } from "@captain/manifest/core/sync";

export function registerGenerateCommand(program: Command): void {
    program
        .command("generate")
        .description("Generate master manifest and bump rules")
        .action(async () => {
            const rootDir = process.cwd();

            await syncGeneratedManifests(rootDir);

            console.log("Captain generated project metadata:");
            console.log(`- ${getMasterManifestPath(rootDir)}`);
            console.log(`- ${getBumpRulesPath(rootDir)}`);
        });
}