const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(filepath);
    }
  }
}

walk(srcDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // 1. Button size="base" -> size="md"
  content = content.replace(/(<Button[^>]+)size=["']base["']/g, '$1size="md"');

  // 2. HTML button isDisabled={...} -> disabled={...}
  content = content.replace(/(<button[^>]+)isDisabled=/g, '$1disabled=');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, filepath)}`);
  }
});

console.log('Fix-v2 script finished!');
