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

// Helper to convert props string to className additions
function parseHStackProps(propsStr) {
  let classes = 'flex';
  if (propsStr.includes('wrap="wrap"')) {
    classes += ' flex-wrap';
  }
  
  // hAlign
  if (propsStr.includes('hAlign="between"')) {
    classes += ' justify-between';
  } else if (propsStr.includes('hAlign="end"')) {
    classes += ' justify-end';
  } else if (propsStr.includes('hAlign="center"')) {
    classes += ' justify-center';
  } else if (propsStr.includes('hAlign="around"')) {
    classes += ' justify-around';
  }
  
  // vAlign
  if (propsStr.includes('vAlign="start"')) {
    classes += ' items-start';
  } else if (propsStr.includes('vAlign="end"')) {
    classes += ' items-end';
  } else if (propsStr.includes('vAlign="stretch"')) {
    classes += ' items-stretch';
  } else {
    // Default for HStack is center vertical align
    classes += ' items-center';
  }
  
  // Gap
  const gapMatch = propsStr.match(/gap=\{(\d+(\.\d+)?)\}/) || propsStr.match(/gap=["'](\d+(\.\d+)?)["']/);
  if (gapMatch) {
    const val = gapMatch[1];
    classes += ` gap-${val}`;
  }
  
  // Merge existing className if any
  const cnMatch = propsStr.match(/className=["']([^"']+)["']/);
  if (cnMatch) {
    const existing = cnMatch[1];
    return propsStr.replace(/className=["']([^"']+)["']/, `className="${classes} ${existing}"`)
                   .replace(/gap=\{[^}]+\}/g, '')
                   .replace(/gap=["'][^"']+["']/g, '')
                   .replace(/hAlign=["'][^"']+["']/g, '')
                   .replace(/vAlign=["'][^"']+["']/g, '')
                   .replace(/wrap=["'][^"']+["']/g, '');
  } else {
    return propsStr + ` className="${classes}"`
                   .replace(/gap=\{[^}]+\}/g, '')
                   .replace(/gap=["'][^"']+["']/g, '')
                   .replace(/hAlign=["'][^"']+["']/g, '')
                   .replace(/vAlign=["'][^"']+["']/g, '')
                   .replace(/wrap=["'][^"']+["']/g, '');
  }
}

function parseVStackProps(propsStr) {
  let classes = 'flex flex-col';
  
  // hAlign
  if (propsStr.includes('hAlign="between"')) {
    classes += ' justify-between';
  } else if (propsStr.includes('hAlign="end"')) {
    classes += ' items-end';
  } else if (propsStr.includes('hAlign="center"')) {
    classes += ' items-center';
  }
  
  // vAlign
  if (propsStr.includes('vAlign="center"')) {
    classes += ' justify-center';
  }
  
  // Gap
  const gapMatch = propsStr.match(/gap=\{(\d+(\.\d+)?)\}/) || propsStr.match(/gap=["'](\d+(\.\d+)?)["']/);
  if (gapMatch) {
    const val = gapMatch[1];
    classes += ` gap-${val}`;
  }
  
  // Merge existing className if any
  const cnMatch = propsStr.match(/className=["']([^"']+)["']/);
  if (cnMatch) {
    const existing = cnMatch[1];
    return propsStr.replace(/className=["']([^"']+)["']/, `className="${classes} ${existing}"`)
                   .replace(/gap=\{[^}]+\}/g, '')
                   .replace(/gap=["'][^"']+["']/g, '')
                   .replace(/hAlign=["'][^"']+["']/g, '')
                   .replace(/vAlign=["'][^"']+["']/g, '');
  } else {
    return propsStr + ` className="${classes}"`
                   .replace(/gap=\{[^}]+\}/g, '')
                   .replace(/gap=["'][^"']+["']/g, '')
                   .replace(/hAlign=["'][^"']+["']/g, '')
                   .replace(/vAlign=["'][^"']+["']/g, '');
  }
}

function cleanRemainingProps(str) {
  return str.replace(/\s+/g, ' ').trim();
}

walk(srcDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // 1. Remove Astryx Core Imports
  content = content.replace(/import\s+\{[^}]*\}\s+from\s+["']@astryxdesign\/core\/Layout["'];?\n?/g, '');
  content = content.replace(/import\s+\{[^}]*\}\s+from\s+["']@astryxdesign\/core\/Grid["'];?\n?/g, '');
  content = content.replace(/import\s+\{[^}]*\}\s+from\s+["']@astryxdesign\/core\/Card["'];?\n?/g, '');
  content = content.replace(/import\s+\{[^}]*\}\s+from\s+["']@astryxdesign\/core\/Text["'];?\n?/g, '');
  content = content.replace(/import\s+\{[^}]*\}\s+from\s+["']@astryxdesign\/core\/TextInput["'];?\n?/g, '');
  content = content.replace(/import\s+\{[^}]*\}\s+from\s+["']@astryxdesign\/core\/Button["'];?\n?/g, '');

  // 2. Refactor StackItem
  content = content.replace(/<StackItem([^>]*)\bsize=["']fill["']([^>]*)>/g, '<div$1 className="flex-1"$2>');
  content = content.replace(/<StackItem([^>]*)>/g, '<div$1>');
  content = content.replace(/<\/StackItem>/g, '</div>');

  // 3. Refactor Grid
  content = content.replace(/<Grid([^>]*)>/g, (match, p1) => {
    let classes = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    if (p1.includes('columns=')) {
      // Custom overrides if needed, default is fine
    }
    const cnMatch = p1.match(/className=["']([^"']+)["']/);
    if (cnMatch) {
      return `<div ${p1.replace(/className=["']([^"']+)["']/, `className="${classes} ${cnMatch[1]}"`)}>`;
    } else {
      return `<div ${p1} className="${classes}">`;
    }
  });
  content = content.replace(/<\/Grid>/g, '</div>');

  // 4. Refactor Card
  content = content.replace(/<Card([^>]*)>/g, (match, p1) => {
    let classes = 'p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium';
    const cnMatch = p1.match(/className=["']([^"']+)["']/);
    if (cnMatch) {
      return `<div ${p1.replace(/className=["']([^"']+)["']/, `className="${classes} ${cnMatch[1]}"`)}>`;
    } else {
      return `<div ${p1} className="${classes}">`;
    }
  });
  content = content.replace(/<\/Card>/g, '</div>');

  // 5. Refactor Heading
  // Match <Heading level={1} ...> -> <h1 ...>
  for (let lvl = 1; lvl <= 6; lvl++) {
    const headingOpenRegex = new RegExp(`<Heading([^>]*)\\blevel=\\{${lvl}\\}([^>]*)>`, 'g');
    const headingOpenStringRegex = new RegExp(`<Heading([^>]*)\\blevel=["']${lvl}["']([^>]*)>`, 'g');
    
    const getHeadingClass = (level) => {
      if (level === 1) return 'font-serif text-3xl md:text-5xl font-black leading-tight tracking-tight';
      if (level === 2) return 'font-serif text-2xl md:text-3xl font-black tracking-tight';
      if (level === 3) return 'font-serif text-xl md:text-2xl font-black tracking-tight';
      if (level === 4) return 'font-serif text-lg font-black leading-snug';
      if (level === 5) return 'font-sans text-sm font-bold leading-snug';
      return 'font-sans text-xs font-bold';
    };
    
    const replaceHeading = (match, before, after) => {
      const cls = getHeadingClass(lvl);
      const combined = before + ' ' + after;
      const cnMatch = combined.match(/className=["']([^"']+)["']/);
      if (cnMatch) {
        const withClass = combined.replace(/className=["']([^"']+)["']/, `className="${cls} ${cnMatch[1]}"`);
        return `<h${lvl} ${withClass}>`;
      } else {
        return `<h${lvl} ${combined} className="${cls}">`;
      }
    };

    content = content.replace(headingOpenRegex, replaceHeading);
    content = content.replace(headingOpenStringRegex, replaceHeading);
  }
  content = content.replace(/<\/Heading>/g, (match) => '</h1>'); // Will need cleanup later or map to dynamic closing. Actually React handles h1..h6 but since they are nested let's be careful.
  // Better yet, replace </Heading> by tracking tags or simply </h1..6>. Since they are nested, let's replace </Heading> with generic tag if JSX allows or map accurately.
  // Actually, we can use a more precise replacement or replace </Heading> with a regex or let the compiler guide us.
  // Wait, let's map it: when replacing `<Heading level={X}>` we can replace `</Heading>` with `</hX>` by using index replacement. Or since Heading closing tags are just `</Heading>`, we can replace `<Heading ...>` with `<hX ...>` and `</Heading>` with `</hX>` inside a loop.
  // Let's do a regex replacement that matches `<Heading level={X}>...</Heading>` and replaces both!
  for (let lvl = 1; lvl <= 6; lvl++) {
    // Replace matching block
    // We can do it by replacing the open tag and closing tag.
    // Wait, regex for tag pairs: we can replace `<Heading level={X}` with `<hX` and `</Heading>` with `</hX>`.
    // But how to map `</Heading>` to `</hX>`?
    // If we replace `<Heading level={X}` with `<hX`, we can just replace `</Heading>` with `</hX>` if we do it sequentially.
    // Better: let's replace `</Heading>` with `</div>` and use `div` for headings? No, `h1`-`h6` is important for SEO!
    // Let's replace the whole file's `<Heading level={lvl} ...> ... </Heading>` using a regex pattern:
    // This is clean if we do it with regex. But some headings span multiple lines.
    // Let's do a loop where we replace `<Heading level={lvl}` with `<hX` and we replace the next `</Heading>` with `</hX>`!
    // Since JavaScript regex doesn't support easy balanced groups, let's do:
    // replace `</Heading>` with `</h1..6>`? Yes, let's keep track of opened heading levels in a stack, or since we process line-by-line or char-by-char:
  }

  // Let's implement a clean state-machine tag replacer for Heading
  let headingStack = [];
  content = content.replace(/<Heading([^>]*)>|<\/Heading>/g, (tag) => {
    if (tag === '</Heading>') {
      const lvl = headingStack.pop() || 2;
      return `</h${lvl}>`;
    } else {
      // Find level
      const lvlMatch = tag.match(/level=\{(\d+)\}/) || tag.match(/level=["'](\d+)["']/);
      const lvl = lvlMatch ? parseInt(lvlMatch[1], 10) : 2;
      headingStack.push(lvl);
      
      const getHeadingClass = (level) => {
        if (level === 1) return 'font-serif text-3xl md:text-5xl font-black leading-tight tracking-tight';
        if (level === 2) return 'font-serif text-2xl md:text-3xl font-black tracking-tight';
        if (level === 3) return 'font-serif text-xl md:text-2xl font-black tracking-tight';
        if (level === 4) return 'font-serif text-lg font-black leading-snug';
        if (level === 5) return 'font-sans text-sm font-bold leading-snug';
        return 'font-sans text-xs font-bold';
      };

      const cls = getHeadingClass(lvl);
      let rest = tag.replace(/<Heading/g, '').replace(/>/g, '')
                    .replace(/level=\{\d+\}/g, '').replace(/level=["']\d+["']/g, '');
      
      const cnMatch = rest.match(/className=["']([^"']+)["']/);
      if (cnMatch) {
        rest = rest.replace(/className=["']([^"']+)["']/, `className="${cls} ${cnMatch[1]}"`);
      } else {
        rest += ` className="${cls}"`;
      }
      return `<h${lvl}${rest}>`;
    }
  });

  // 6. Refactor Text
  let textStack = [];
  content = content.replace(/<Text([^>]*)>|<\/Text>/g, (tag) => {
    if (tag === '</Text>') {
      const tagType = textStack.pop() || 'p';
      return `</${tagType}>`;
    } else {
      // If it has type="supporting", or color="secondary", etc.
      let tagType = 'p';
      if (tag.includes('type="supporting"') || tag.includes('type=\'supporting\'')) {
        tagType = 'span';
      }
      textStack.push(tagType);

      let classes = 'text-xs leading-relaxed font-medium';
      if (tag.includes('color="secondary"') || tag.includes('color=\'secondary\'')) {
        classes += ' text-[var(--color-text-secondary)]';
      } else {
        classes += ' text-[var(--color-text-primary)]';
      }

      if (tag.includes('size="xsm"') || tag.includes('size=\'xsm\'')) {
        classes += ' text-[10px]';
      } else if (tag.includes('size="sm"') || tag.includes('size=\'sm\'')) {
        classes += ' text-xs';
      } else if (tag.includes('size="base"') || tag.includes('size=\'base\'')) {
        classes += ' text-sm';
      } else if (tag.includes('size="lg"') || tag.includes('size=\'lg\'')) {
        classes += ' text-base';
      }

      let rest = tag.replace(/<Text/g, '').replace(/>/g, '')
                    .replace(/color=["'][^"']+["']/g, '')
                    .replace(/type=["'][^"']+["']/g, '')
                    .replace(/size=["'][^"']+["']/g, '');

      const cnMatch = rest.match(/className=["']([^"']+)["']/);
      if (cnMatch) {
        rest = rest.replace(/className=["']([^"']+)["']/, `className="${classes} ${cnMatch[1]}"`);
      } else {
        rest += ` className="${classes}"`;
      }
      return `<${tagType}${rest}>`;
    }
  });

  // 7. Refactor HStack
  content = content.replace(/<HStack([^>]*)>/g, (match, p1) => {
    const updated = parseHStackProps(p1);
    return `<div ${updated}>`;
  });
  content = content.replace(/<\/HStack>/g, '</div>');

  // 8. Refactor VStack
  content = content.replace(/<VStack([^>]*)>/g, (match, p1) => {
    const updated = parseVStackProps(p1);
    return `<div ${updated}>`;
  });
  content = content.replace(/<\/VStack>/g, '</div>');

  // 9. Clean up any double/empty spaces in className and tags
  content = content.replace(/className="\s+/g, 'className="');
  content = content.replace(/\s+"/g, '"');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, filepath)}`);
  }
});

console.log('Refactor script finished!');
