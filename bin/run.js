import { taskLog } from "@clack/prompts";
import { spawn } from "node:child_process";

function streamToTaskLog(stream, taskLogInstance) {
  let buffer = "";
  stream.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) taskLogInstance.message(line, { raw: true });
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) taskLogInstance.message(buffer.trim(), { raw: true });
  });
}

export async function run(cmd, cwd, description) {
  const taskLogInstance = taskLog({ title: description });
  const child = spawn(cmd, {
    cwd,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  streamToTaskLog(child.stdout, taskLogInstance);
  streamToTaskLog(child.stderr, taskLogInstance);

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) {
        taskLogInstance.success("Done!", { showLog: true });
        resolve();
      } else {
        taskLogInstance.error("Failed!", { showLog: true });
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}
