import { spawnSync } from "child_process";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(projectRoot, "engine", "build_sidecar.py");

const candidates = process.platform === "win32"
  ? ["python", "py", "python3"]
  : ["python3", "python"];

let chosenCmd = null;

for (const cmd of candidates) {
  try {
    const res = spawnSync(cmd, ["--version"], { stdio: "ignore" });
    if (res.status === 0) {
      chosenCmd = cmd;
      break;
    }
  } catch (e) {
    // continue
  }
}

if (!chosenCmd) {
  console.error("[-] Error: Python was not found! Please install Python (3.10+) to build the sidecar.");
  process.exit(1);
}

console.log(`[*] Executing sidecar compiler with: ${chosenCmd}`);
const run = spawnSync(chosenCmd, [scriptPath], {
  cwd: projectRoot,
  stdio: "inherit"
});

process.exit(run.status ?? 1);
