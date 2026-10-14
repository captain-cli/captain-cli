import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";

import { readBuildManifest } from "@captain/manifest/core/buildManifest";
import { packageBuild } from "@captain/manifest/core/buildPackager";
import { runBuild } from "@captain/manifest/core/buildRunner";
import { listBuildTargets, resolveBuildTarget } from "@captain/manifest/core/buildTarget";
import {
    assertSystemReady,
    checkSystemReadiness,
} from "@captain/manifest/core/systemReadiness";

async function loadSelectedBuild(rootDir: string, target?: string) {
    const manifest = await readBuildManifest(rootDir);
    const selected = resolveBuildTarget(manifest, target);
    return { manifest, selected };
}

function printTarget(selectedName?: string): void {
    if (selectedName) {
        console.log(`Target: ${selectedName}`);
    }
}

async function printBuildPlan(rootDir: string, target?: string): Promise<void> {
    const { manifest, selected } = await loadSelectedBuild(rootDir, target);

    console.log("Build Plan");
    console.log("");
    console.log(`Application: ${manifest.application.name}`);
    printTarget(selected.name);
    console.log(`Type: ${manifest.application.type}`);
    console.log(`Language: ${manifest.application.language}`);
    if (manifest.application.standard) console.log(`Standard: ${manifest.application.standard}`);
    console.log("");
    console.log("Commands:");
    for (const command of selected.build.commands) console.log(`- ${command}`);
    console.log("");
    console.log("Expected outputs:");
    for (const output of selected.build.outputs) console.log(`- ${output}`);
    console.log("");
    console.log("Vendor dependencies:");
    for (const dependency of manifest.vendor) {
        console.log(`- ${dependency.name} (${dependency.type})`);
        console.log(`  Required at: ${dependency.requiredAt.join(", ")}`);
    }
    console.log("");
    console.log("Package contents:");
    for (const entry of selected.package.include) console.log(`- ${entry}`);
    console.log("");
    console.log(`Artifact directory: ${selected.package.output.directory}`);
}

async function printBuildCheck(rootDir: string, target?: string): Promise<void> {
    const { manifest, selected } = await loadSelectedBuild(rootDir, target);
    const buildDependencies = manifest.vendor.filter(dependency => dependency.requiredAt.includes("build"));
    const runtimeOnlyDependencies = manifest.vendor.filter(
        dependency => dependency.requiredAt.includes("runtime") && !dependency.requiredAt.includes("build"),
    );
    let missingBuildVendorFiles = 0;
    const systemReadiness = await checkSystemReadiness(rootDir);

    console.log("Build Environment Check");
    console.log("");
    console.log(`Application: ${manifest.application.name}`);
    printTarget(selected.name);
    console.log("");
    console.log("Build manifest:");
    console.log("  ✓ loaded");
    console.log("");
    console.log("Build commands:");
    for (const command of selected.build.commands) console.log(`  ✓ ${command}`);
    console.log("");
    console.log("Expected outputs:");
    for (const output of selected.build.outputs) console.log(`  ✓ ${output}`);
    console.log("");
    console.log("Build-time vendor dependencies:");

    if (buildDependencies.length === 0) console.log("  ✓ none declared");
    for (const dependency of buildDependencies) {
        const buildPaths = dependency.paths?.build ?? [];
        const missingPaths = buildPaths.filter(vendorPath => !fs.existsSync(path.resolve(rootDir, vendorPath)));
        if (buildPaths.length === 0) {
            console.log(`  ? ${dependency.name} (${dependency.type})`);
            console.log("    no build paths declared");
            missingBuildVendorFiles++;
            continue;
        }
        if (missingPaths.length === 0) {
            console.log(`  ✓ ${dependency.name} (${dependency.type})`);
            for (const vendorPath of buildPaths) console.log(`    ${vendorPath}`);
        } else {
            console.log(`  ✗ ${dependency.name} (${dependency.type})`);
            for (const vendorPath of buildPaths) {
                const exists = fs.existsSync(path.resolve(rootDir, vendorPath));
                console.log(exists ? `    ✓ ${vendorPath}` : `    ✗ ${vendorPath}`);
            }
            missingBuildVendorFiles += missingPaths.length;
        }
    }

    console.log("");
    console.log("Runtime-only vendor dependencies:");
    if (runtimeOnlyDependencies.length === 0) {
        console.log("  - none declared");
    } else {
        for (const dependency of runtimeOnlyDependencies) {
            console.log(`  - ${dependency.name} (${dependency.type})`);
        }
    }

    console.log("");
    console.log("System dependencies:");

    if (!systemReadiness.declared) {
        console.log("  ✓ none declared");
    } else if (systemReadiness.satisfied) {
        console.log("  ✓ satisfied");
    } else {
        console.log(
            `  ✗ ${systemReadiness.pendingChanges} change(s) pending`,
        );
    }

    console.log("");

    if (!systemReadiness.satisfied) {
        console.log("Build readiness: blocked");
        console.log(
            `Reason: ${systemReadiness.pendingChanges} system dependency change(s) pending`,
        );
    } else if (missingBuildVendorFiles > 0) {
        console.log("Build readiness: blocked");
        console.log(
            `Reason: ${missingBuildVendorFiles} required build-time vendor file(s) missing or undeclared`,
        );
    } else {
        console.log("Build readiness: ready");
    }
}

async function executeBuild(rootDir: string, target?: string): Promise<void> {
    await assertSystemReady(rootDir);

    const { manifest, selected } = await loadSelectedBuild(rootDir, target);
    console.log("Build Run");
    console.log("");
    console.log(`Application: ${manifest.application.name}`);
    printTarget(selected.name);
    console.log("");

    const executionManifest = {
        build: selected.build,
        package: selected.package,
    };
    const result = runBuild(rootDir, executionManifest);

    if (result.failedCommand) {
        console.log("");
        console.log("Build result: failed");
        console.log(`Failed command: ${result.failedCommand}`);
        process.exitCode = 1;
        return;
    }

    if (result.missingOutputs.length > 0) {
        console.log("Expected outputs:");
        for (const output of selected.build.outputs) {
            console.log(result.missingOutputs.includes(output) ? `  ✗ ${output}` : `  ✓ ${output}`);
        }
        console.log("");
        console.log("Build result: failed");
        console.log(`Reason: ${result.missingOutputs.length} expected output(s) missing`);
        process.exitCode = 1;
        return;
    }

    console.log("Expected outputs:");
    for (const output of selected.build.outputs) console.log(`  ✓ ${output}`);
    console.log("");
    console.log("Build result: succeeded");
}

async function executePackage(rootDir: string, target?: string): Promise<void> {
    const { manifest, selected } = await loadSelectedBuild(rootDir, target);
    console.log("Build Package");
    console.log("");
    console.log(`Application: ${manifest.application.name}`);
    printTarget(selected.name);
    console.log("");

    const executionManifest = {
        build: selected.build,
        package: selected.package,
    };
    const result = packageBuild(rootDir, executionManifest);

    console.log("Package contents:");
    for (const entry of selected.package.include) {
        console.log(result.missingEntries.includes(entry) ? `  ✗ ${entry}` : `  ✓ ${entry}`);
    }
    console.log("");
    if (!result.success) {
        console.log("Package result: failed");
        console.log(`Reason: ${result.missingEntries.length} package entry or entries missing`);
        process.exitCode = 1;
        return;
    }
    console.log(`Artifact directory: ${result.artifactDirectory}`);
    console.log("");
    console.log("Package result: succeeded");
}

export function registerBuildCommand(program: Command): void {
    const build = program.command("build").description("Manage project builds");

    const targets = build.command("targets").description("List named build targets");
    targets.action(async () => {
        const manifest = await readBuildManifest(process.cwd());
        const names = listBuildTargets(manifest);
        if (names.length === 0) {
            console.log("This project uses a single build configuration.");
            return;
        }
        console.log("Build Targets");
        console.log("");
        for (const name of names) {
            const marker = name === manifest.defaultTarget ? " (default)" : "";
            console.log(`- ${name}${marker}`);
        }
    });

    const plan = build.command("plan").description("Print the project build plan")
        .option("--target <name>", "Named build target");
    plan.action(async () => {
        const options = plan.opts<{ target?: string }>();
        await printBuildPlan(process.cwd(), options.target);
    });

    const check = build.command("check").description("Check project build readiness")
        .option("--target <name>", "Named build target");
    check.action(async () => {
        const options = check.opts<{ target?: string }>();
        await printBuildCheck(process.cwd(), options.target);
    });

    build.action(async () => {
        await printBuildPlan(process.cwd());
    });

    const run = build.command("run").description("Execute the project build")
        .option("--target <name>", "Named build target");
    run.action(async () => {
        const options = run.opts<{ target?: string }>();
        await executeBuild(process.cwd(), options.target);
    });

    const packageCommand = build.command("package").description("Materialize the project build artifact")
        .option("--target <name>", "Named build target");
    packageCommand.action(async () => {
        const options = packageCommand.opts<{ target?: string }>();
        await executePackage(process.cwd(), options.target);
    });
}
