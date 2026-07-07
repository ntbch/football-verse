const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'app');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(filepath);
    }
  }
}

walk(srcDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // 1. Toast success -> info
  content = content.replace(/type:\s*["']success["']/g, 'type: "info"');

  // 2. hAlign="right" -> hAlign="end"
  content = content.replace(/hAlign=["']right["']/g, 'hAlign="end"');

  // 3. Convert isDisabled={ -> disabled={ (for standard HTML buttons)
  content = content.replace(/\bisDisabled=\{/g, 'disabled={');

  // 4. TextInput type="number" -> type="text"
  content = content.replace(/type=["']number["']/g, 'type="text"');

  // 5. Size "xs" -> "xsm" (for Text)
  content = content.replace(/\bsize=["']xs["']/g, 'size="xsm"');

  // 6. Size "md" -> "base" (for Text)
  content = content.replace(/\bsize=["']md["']/g, 'size="base"');

  // 7. Special fix for matches/page.tsx - import Link
  if (filepath.endsWith('matches\\page.tsx') || filepath.endsWith('matches/page.tsx')) {
    if (!content.includes("import Link from")) {
      content = "import Link from \"next/link\";\n" + content;
      console.log('Added Link import to matches/page.tsx');
    }
  }

  // 8. Special fix for search/page.tsx - add types to map parameters
  if (filepath.endsWith('search\\page.tsx') || filepath.endsWith('search/page.tsx')) {
    content = content.replace(
      /import\s+\{\s*SearchResponse\s*\}\s+from\s+["']@\/shared\/lib\/types["']/g,
      'import { SearchResponse, NewsArticleResponse, ThreadResponse } from "@/shared/lib/types"'
    );
    content = content.replace(/newsResults\.map\(\(art\)\s*=>/g, 'newsResults.map((art: NewsArticleResponse) =>');
    content = content.replace(/forumResults\.map\(\(thread\)\s*=>/g, 'forumResults.map((thread: ThreadResponse) =>');
    console.log('Fixed types in search/page.tsx');
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, filepath)}`);
  }
});

console.log('Fix script finished!');
