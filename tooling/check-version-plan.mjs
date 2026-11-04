import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { getReleasePlan } from "@changesets/get-release-plan";

const baseRef = "origin/main";
const metadataPaths = execFileSync("git", ["ls-tree", "-r", "--name-only", baseRef], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(
    (path) =>
      path === "package.json" ||
      path === "pnpm-workspace.yaml" ||
      path.endsWith("/package.json") ||
      path.startsWith(".changeset/"),
  );

mkdirSync(".turbo", { recursive: true });
const snapshot = mkdtempSync(resolve(".turbo/version-plan-"));
try {
  const archive = execFileSync("git", ["archive", baseRef, "--", ...metadataPaths]);
  execFileSync("tar", ["-x", "-C", snapshot], { input: archive });

  const basePlan = await getReleasePlan(snapshot);
  const releases = basePlan.releases.filter((release) => release.type !== "none");
  if (releases.length === 0) {
    throw new Error("The base branch has no pending releases to version.");
  }
  const currentPlan = await getReleasePlan(process.cwd());
  if (currentPlan.changesets.length !== 0) {
    throw new Error("The version PR must consume every pending changeset.");
  }

  const expectedVersions = new Map(releases.map((release) => [release.name, release.newVersion]));
  for (const path of metadataPaths.filter((path) => path.endsWith("package.json"))) {
    const basePackage = JSON.parse(readFileSync(resolve(snapshot, path), "utf8"));
    const currentPackage = JSON.parse(readFileSync(path, "utf8"));
    const expectedVersion = expectedVersions.get(basePackage.name) ?? basePackage.version;
    if (currentPackage.name !== basePackage.name || currentPackage.version !== expectedVersion) {
      throw new Error(
        `${path}: expected ${basePackage.name}@${expectedVersion}, received ${currentPackage.name}@${currentPackage.version}`,
      );
    }
  }
  console.log(`Version PR matches the Changesets plan for ${releases.length} package(s).`);
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
