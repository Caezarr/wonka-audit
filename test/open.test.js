import test from "node:test";
import assert from "node:assert/strict";
import { openCommand } from "../src/lib/open.js";

test("share preview uses platform-native open commands without a shell", () => {
  assert.deepEqual(openCommand("/tmp/report.html", "darwin"), { command: "open", args: ["/tmp/report.html"] });
  assert.deepEqual(openCommand("C:\\report.html", "win32"), { command: "explorer.exe", args: ["C:\\report.html"] });
  assert.deepEqual(openCommand("/tmp/report.html", "linux"), { command: "xdg-open", args: ["/tmp/report.html"] });
});
