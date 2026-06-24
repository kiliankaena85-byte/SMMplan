import fs from "fs";
import path from "path";

// List of raw color patterns that are forbidden in JSX classes (must use semantic tokens instead)
const BANNED_PATTERNS = [
  /\bbg-black\b/,
  /\bbg-white\b/,
  /\btext-black\b/,
  /\btext-white\b/,
  /\bbg-blue-\d+\b/,
  /\btext-blue-\d+\b/,
  /\bbg-red-\d+\b/,
  /\btext-red-\d+\b/,
  /\bbg-green-\d+\b/,
  /\btext-green-\d+\b/,
  /\bbg-gray-\d+\b/,
  /\btext-gray-\d+\b/,
  /\bbg-slate-\d+\b/,
  /\btext-slate-\d+\b/,
  /\bbg-zinc-\d+\b/,
  /\btext-zinc-\d+\b/,
  /\bbg-emerald-\d+\b/,
  /\btext-emerald-\d+\b/,
  /\bbg-amber-\d+\b/,
  /\btext-amber-\d+\b/,
  /\bbg-rose-\d+\b/,
  /\btext-rose-\d+\b/
];

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes("node_modules") && !name.includes(".next")) {
        getFilesRecursively(name, fileList);
      }
    } else {
      if (name.endsWith(".tsx") || name.endsWith(".ts")) {
        fileList.push(name);
      }
    }
  }
  return fileList;
}

function runAudit() {
  const targetSubDir = process.argv[2] || "src";
  const srcDir = path.resolve(process.cwd(), targetSubDir);
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: target directory "${targetSubDir}" not found.`);
    process.exit(1);
  }

  const files = getFilesRecursively(srcDir);
  let totalViolations = 0;
  const violationsReport: { file: string; line: number; text: string; matched: string }[] = [];

  for (const file of files) {
    // Skip external/admin scripts or third party components if any
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Basic check for className strings or strings in quotes
      if (line.includes("className=") || line.includes("class=")) {
        for (const pattern of BANNED_PATTERNS) {
          const match = line.match(pattern);
          if (match) {
            violationsReport.push({
              file: path.relative(process.cwd(), file),
              line: index + 1,
              text: line.trim(),
              matched: match[0]
            });
            totalViolations++;
          }
        }
      }
    });
  }

  if (totalViolations > 0) {
    console.log(`\n\x1b[31m=== DESIGN SYSTEM AUDIT: FAILED (${totalViolations} violations) ===\x1b[0m`);
    violationsReport.forEach((v) => {
      console.log(`\x1b[33m[Violation]\x1b[0m \x1b[36m${v.file}:${v.line}\x1b[0m -> Found raw color: \x1b[31m"${v.matched}"\x1b[0m`);
      console.log(`   Line: ${v.text}\n`);
    });
    console.log("\x1b[35mHow to fix: Replace raw color classes (like 'bg-black', 'text-white') with semantic tokens (like 'bg-background', 'text-foreground', 'bg-card', 'text-primary') defined in globals.css.\x1b[0m\n");
    process.exit(1);
  } else {
    console.log("\n\x1b[32m=== DESIGN SYSTEM AUDIT: PASSED (0 violations found in src/) ===\x1b[0m\n");
    process.exit(0);
  }
}

runAudit();
