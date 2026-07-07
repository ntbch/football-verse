const fs = require('fs');
const path = require('path');

const logFile = 'C:\\Users\\bach\\.gemini\\antigravity-ide\\brain\\aad72918-fd9b-48cd-a974-2bfd2475a78d\\.system_generated\\logs\\transcript_full.jsonl';

if (!fs.existsSync(logFile)) {
  console.error("Log file doesn't exist at path:", logFile);
  process.exit(1);
}

const fileContentsMap = {};

const lines = fs.readFileSync(logFile, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls && Array.isArray(obj.tool_calls)) {
      for (const call of obj.tool_calls) {
        if (call.name === 'write_to_file') {
          const args = call.args;
          if (args && args.TargetFile && args.CodeContent) {
            let target = args.TargetFile;
            // Standardize path
            target = path.resolve(target);
            if (target.includes('src\\app') || target.includes('src/app') || target.includes('src\\shared') || target.includes('src/shared')) {
              fileContentsMap[target] = args.CodeContent;
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore invalid JSON lines
  }
}

// Now write all tracked files back!
for (const [targetFile, content] of Object.entries(fileContentsMap)) {
  // Let's not restore globals.css, layout.tsx, navbar.tsx, page-shell.tsx, state-blocks.tsx, types.ts, themes.ts, page.tsx, search.tsx, news/page.tsx, news/[slug]/page.tsx since they are already refactored correctly!
  // Wait, actually, let's restore everything except the ones we refactored correctly in this session!
  // The ones we refactored correctly in this session are:
  // - page.tsx (home)
  // - search/page.tsx
  // - news/page.tsx
  // - news/[slug]/page.tsx
  // Let's exclude these from restoration so we don't lose our correct work!
  const isExcluded = 
    targetFile.endsWith('src\\app\\page.tsx') || targetFile.endsWith('src/app/page.tsx') ||
    targetFile.endsWith('src\\app\\search\\page.tsx') || targetFile.endsWith('src/app/search/page.tsx') ||
    targetFile.endsWith('src\\app\\news\\page.tsx') || targetFile.endsWith('src/app/news/page.tsx') ||
    targetFile.endsWith('src\\app\\news\\[slug]\\page.tsx') || targetFile.endsWith('src/app/news/[slug]/page.tsx') ||
    targetFile.endsWith('src\\shared\\components\\navbar.tsx') || targetFile.endsWith('src/shared/components/navbar.tsx') ||
    targetFile.endsWith('src\\shared\\components\\page-shell.tsx') || targetFile.endsWith('src/shared/components/page-shell.tsx') ||
    targetFile.endsWith('src\\shared\\components\\state-blocks.tsx') || targetFile.endsWith('src/shared/components/state-blocks.tsx') ||
    targetFile.endsWith('src\\app\\globals.css') || targetFile.endsWith('src/app/globals.css') ||
    targetFile.endsWith('src\\app\\layout.tsx') || targetFile.endsWith('src/app/layout.tsx');

  if (isExcluded) {
    console.log("Skipping restoration of manually polished file:", targetFile);
    continue;
  }

  // Ensure parent directory exists
  const parent = path.dirname(targetFile);
  fs.mkdirSync(parent, { recursive: true });
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log("Restored pristine state for:", targetFile);
}

console.log("Pristine restoration complete!");
