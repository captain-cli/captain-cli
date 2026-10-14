import { Command } from "commander";

import { analyzeBumps } from "@captain/manifest/core/bumpAnalyzer";
import { writeJsonFile } from "@captain/manifest/core/files";

export function registerAnalyzeBumpsCommand(program: Command): void {
    program
        .command("analyze-bumps")
        .description("Analyze changed files and produce a bump plan")
        .option("--base <base>", "Git base ref", "origin/main")
        .option("--changed-files <path>", "Path to a file containing changed file paths")
        .option("--output <output>", "Output bump plan path")
        .action(async (options) => {
            const rootDir = process.cwd();

            const plan = await analyzeBumps({
                rootDir,
                base: options.base,
                changedFilesPath: options.changedFiles,
            });

            if (options.output) {
                await writeJsonFile(options.output, plan);
                console.log(`Bump plan written: ${options.output}`);
            } else {
                console.log(JSON.stringify(plan, null, 2));
            }
        });
}