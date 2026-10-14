import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { detectHost } from "../bootstrap/host.js";
import { installLocalDistribution } from "../bootstrap/install.js";
import { verifyCaptainCli } from "../bootstrap/verify.js";

test("detectHost reports a deterministic install candidate", () => {
    const host = detectHost();
    assert.equal(host.defaultInstallDir, path.join(host.home, ".local", "bin"));
    assert.equal(typeof host.supported, "boolean");
});

test("installLocalDistribution copies a local Captain CLI distribution", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "captain-cli-install-"));
    const source = path.join(root, "source-captain");
    const destination = path.join(root, "bin", "captain");
    fs.writeFileSync(source, "captain-cli-test\n", { mode: 0o755 });

    const result = installLocalDistribution(source, destination);

    assert.equal(result.destination, destination);
    assert.equal(fs.readFileSync(destination, "utf8"), "captain-cli-test\n");
    assert.throws(() => installLocalDistribution(source, destination), /already exists/);

    installLocalDistribution(source, destination, true);
    assert.equal(fs.readFileSync(destination, "utf8"), "captain-cli-test\n");
});

test("verifyCaptainCli executes the selected Captain CLI", { skip: process.platform === "win32" }, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "captain-cli-verify-"));
    const fakeCaptain = path.join(root, "captain");
    fs.writeFileSync(
        fakeCaptain,
        "#!/bin/sh\nif [ \"$1\" = \"--cli-version\" ]; then echo 9.9.9-test; exit 0; fi\nexit 2\n",
        { mode: 0o755 },
    );

    const result = verifyCaptainCli(fakeCaptain);

    assert.equal(result.path, fakeCaptain);
    assert.equal(result.versionOutput, "9.9.9-test");
});
