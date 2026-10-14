import { Command } from "commander";
import {
    createPackagePipelinePlan,
    executePackagePipeline,
    type PackageFormat,
} from "@captain/manifest/core/packagePipeline";
import { createPublishPlan, executePublish } from "@captain/manifest/core/publish";

function parseFormat(value: string): PackageFormat[] | undefined {
    if (value === "all") return undefined;
    if (value === "deb" || value === "rpm") return [value];
    throw new Error(`Unsupported package format: ${value}`);
}

async function printPlan(rootDir: string, format: string): Promise<void> {
    const plan = await createPackagePipelinePlan(rootDir, parseFormat(format));
    console.log("Package Pipeline Plan");
    console.log("");
    console.log(`Application: ${plan.applicationName}`);
    console.log(`Artifact root: ${plan.artifactRoot}`);
    console.log(`Stager project: ${plan.projectRoot}`);
    console.log(`Stager target: ${plan.stagerTarget}`);
    console.log(`Staged root: ${plan.stagedRoot}`);
    console.log(`Embark project: ${plan.projectRoot}`);
    console.log(`Formats: ${plan.formats.join(", ")}`);
    console.log(`Package output: ${plan.packageOutputRoot}`);
}

export function registerPackageCommand(program: Command): void {
    const packageCommand = program
        .command("package")
        .description("Orchestrate build, staging, and native packaging");

    const planCommand = packageCommand
        .command("plan", { isDefault: true })
        .description("Print the package pipeline plan")
        .option("--format <format>", "Package format: deb, rpm, or all", "all");

    planCommand.action(async () => {
        const options = planCommand.opts<{ format: string }>();
        await printPlan(process.cwd(), options.format);
    });

    const buildCommand = packageCommand
        .command("build")
        .description("Build, stage, and create native packages")
        .option("--format <format>", "Package format: deb, rpm, or all", "all")
        .option("--skip-build", "Reuse current build outputs and only repackage");

    buildCommand.action(async () => {
        const options = buildCommand.opts<{ format: string; skipBuild?: boolean }>();
        try {
            console.log("Package Pipeline");
            console.log("");
            const plan = await executePackagePipeline(process.cwd(), {
                formats: parseFormat(options.format),
                skipBuild: options.skipBuild ?? false,
            });
            console.log("");
            console.log(`Package result: succeeded (${plan.formats.join(", ")})`);
        } catch (error) {
            console.error("");
            console.error("Package result: failed");
            console.error(`Reason: ${(error as Error).message}`);
            process.exitCode = 1;
        }
    });

    const publishCommand = packageCommand
        .command("publish")
        .description("Publish completed native packages to configured destinations")
        .option("--destination <name>", "Publish only to one configured destination")
        .option("--format <format>", "Package format: deb, rpm, or all", "all")
        .option("--dry-run", "Print the publish plan without uploading");

    publishCommand.action(async () => {
        const options = publishCommand.opts<{
            destination?: string;
            format: string;
            dryRun?: boolean;
        }>();
        try {
            const publishOptions = {
                destination: options.destination,
                formats: parseFormat(options.format),
                dryRun: options.dryRun ?? false,
            };
            const result = options.dryRun
                ? { plan: await createPublishPlan(process.cwd(), publishOptions), published: [] }
                : await executePublish(process.cwd(), publishOptions);

            console.log("Package Publish");
            console.log("");
            console.log(`Project: ${result.plan.projectName}@${result.plan.projectVersion}`);
            for (const destination of result.plan.destinations) {
                console.log(`Destination: ${destination.name} (${destination.provider})`);
                if (destination.repository) console.log(`Repository: ${destination.repository}`);
                if (destination.tag) console.log(`Release tag: ${destination.tag}`);
                console.log(`Artifacts: ${destination.artifacts.map(artifact => artifact.name).join(", ")}`);
            }

            if (options.dryRun) {
                console.log("");
                console.log("Publish result: dry run");
                return;
            }

            for (const published of result.published) {
                console.log("");
                console.log(`Published ${published.uploaded.length} artifact(s) to ${published.destination}`);
                if (published.releaseUrl) console.log(`Release: ${published.releaseUrl}`);
            }
            console.log("Publish result: succeeded");
        } catch (error) {
            console.error("");
            console.error("Publish result: failed");
            console.error(`Reason: ${(error as Error).message}`);
            process.exitCode = 1;
        }
    });

}
