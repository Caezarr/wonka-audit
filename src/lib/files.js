import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function walkFiles(root, predicate, maxDepth = 5) {
  const out = [];
  walk(root, 0);
  return out;

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full, depth + 1);
      else if (predicate(full, entry)) out.push({ path: full, mtimeMs: stat.mtimeMs });
    }
  }
}

