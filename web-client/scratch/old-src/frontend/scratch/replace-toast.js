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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(filepath);
    }
  }
}

walk(srcDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // Replace imports
  content = content.replace(/import\s*\{\s*useToast\s*\}\s*from\s*["']@astryxdesign\/core\/Toast["']/g, 'import { useToast } from "@/shared/components/toast"');
  content = content.replace(/import\s*\{\s*useToast\s*\}\s*from\s*["']@astryxdesign\/core\/Toast["'];?/g, 'import { useToast } from "@/shared/components/toast";');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated toast import in ${path.relative(srcDir, filepath)}`);
  }
});

// Also check src/shared folder
const sharedDir = path.join(__dirname, '..', 'src', 'shared');
walk(sharedDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  content = content.replace(/import\s*\{\s*useToast\s*\}\s*from\s*["']@astryxdesign\/core\/Toast["']/g, 'import { useToast } from "@/shared/components/toast"');
  content = content.replace(/import\s*\{\s*useToast\s*\}\s*from\s*["']@astryxdesign\/core\/Toast["'];?/g, 'import { useToast } from "@/shared/components/toast";');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated toast import in ${path.relative(sharedDir, filepath)}`);
  }
});

console.log('Toast replace finished!');
