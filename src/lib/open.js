import { spawn } from "node:child_process";

export function openCommand(filePath, os = process.platform) {
  if (os === "darwin") return { command: "open", args: [filePath] };
  if (os === "win32") return { command: "explorer.exe", args: [filePath] };
  return { command: "xdg-open", args: [filePath] };
}

export function openLocalFile(filePath) {
  const { command, args } = openCommand(filePath);
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
}
