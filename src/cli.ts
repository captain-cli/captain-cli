#!/usr/bin/env node

import { Command } from "commander";

import { registerInitCommand } from "./commands/init.js";
import { registerLaneCommand } from "./commands/lane.js";
import { registerComponentCommand } from "./commands/component.js";
import { registerGenerateCommand } from "./commands/generate.js";
import { registerScanCommand } from "./commands/scan.js";
import { registerAnalyzeBumpsCommand } from "./commands/analyzeBumps.js";
import { registerBumpCommand } from "./commands/bump.js";
import { registerValidateCommand } from "./commands/validate.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerPrepareRuntimeCommand } from "./commands/prepareRuntime.js";
import { registerInstallCommand, registerToolsCommand } from "./commands/tools.js";
import { registerProvisionCommand } from "./commands/provision.js";
import {
    registerSystemCommand
} from "./commands/system.js";
import {
    registerBuildCommand
} from "./commands/build.js";
import { registerPackageCommand } from "./commands/package.js";
import { registerBootstrapCommand } from "./commands/bootstrap.js";
import { requireCaptainManifest, resolveProjectDirectory } from "@captain/manifest/core/projectContext";
import { assertSupportedNodeVersion } from "@captain/manifest/core/runtime";

try {
    assertSupportedNodeVersion();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}

const program = new Command();

program
    .name("captain")
    .description("Captain's Manifest CLI")
    .version("0.2.0", "-V, --cli-version", "output the Captain CLI version")
    .option("-C, --project <directory>", "Captain project directory (defaults to the current working directory)");

registerInitCommand(program);
registerLaneCommand(program);
registerComponentCommand(program);
registerGenerateCommand(program);
registerScanCommand(program);
registerAnalyzeBumpsCommand(program);
registerBumpCommand(program);
registerValidateCommand(program);
registerStatusCommand(program);
registerPrepareRuntimeCommand(program);
registerToolsCommand(program);
registerInstallCommand(program);
registerProvisionCommand(program);
registerSystemCommand(
    program
);
registerBuildCommand(program);
registerPackageCommand(program);
registerBootstrapCommand(program);

const manifestOptionalCommands = new Set(["init", "install", "tools", "bootstrap"]);

program.hook("preAction", (_thisCommand, actionCommand) => {
    try {
        const selectedRoot = resolveProjectDirectory(program.opts().project);
        process.chdir(selectedRoot);

        let topLevel = actionCommand;
        while (topLevel.parent && topLevel.parent !== program) {
            topLevel = topLevel.parent;
        }

        if (!manifestOptionalCommands.has(topLevel.name())) {
            requireCaptainManifest(selectedRoot);
        }
    } catch (error) {
        program.error((error as Error).message);
    }
});

program.parse(process.argv);
