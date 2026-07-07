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
      const rel = path.relative(srcDir, filepath);
      const isExcluded = 
        rel === 'page.tsx' ||
        rel.startsWith('news' + path.sep) ||
        rel.startsWith('search' + path.sep) ||
        rel.startsWith('login' + path.sep) ||
        rel.startsWith('register' + path.sep) ||
        rel === 'layout.tsx' ||
        rel === 'globals.css';
      
      if (!isExcluded) {
        callback(filepath);
      }
    }
  }
}

function getAttr(p1, attrName) {
  const index = p1.indexOf(attrName + '=');
  if (index === -1) return null;
  const start = index + attrName.length + 1;
  const char = p1[start];
  if (char === '"' || char === "'") {
    const end = p1.indexOf(char, start + 1);
    return { raw: p1.substring(start, end + 1), val: p1.substring(start + 1, end), isExpr: false };
  } else if (char === '{') {
    let braces = 1;
    let i = start + 1;
    while (braces > 0 && i < p1.length) {
      if (p1[i] === '{') braces++;
      if (p1[i] === '}') braces--;
      i++;
    }
    return { raw: p1.substring(start, i), val: p1.substring(start + 1, i - 1), isExpr: true };
  }
  return null;
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

  // 2. Refactor TextInput
  content = content.replace(/<TextInput\b([\s\S]*?)\/>/g, (match, p1) => {
    const labelAttr = getAttr(p1, 'label');
    const valueAttr = getAttr(p1, 'value');
    const onChangeAttr = getAttr(p1, 'onChange');
    const placeholderAttr = getAttr(p1, 'placeholder');
    const typeAttr = getAttr(p1, 'type');

    const label = labelAttr ? labelAttr.val : '';
    const value = valueAttr ? valueAttr.val : '';
    const onChange = onChangeAttr ? onChangeAttr.val : '';
    const placeholder = placeholderAttr ? placeholderAttr.val : '';
    const type = typeAttr ? typeAttr.val : 'text';

    return (
      '<div className="flex flex-col gap-1 w-full text-left">\n' +
      (label ? '  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">' + label + '</label>\n' : '') +
      '  <input\n' +
      '    type="' + type + '"\n' +
      '    placeholder="' + placeholder + '"\n' +
      '    value={' + value + '}\n' +
      '    onChange={(e) => ' + onChange + '(e.target.value)}\n' +
      '    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"\n' +
      '  />\n' +
      '</div>'
    );
  });

  // 3. Refactor Button
  content = content.replace(/<Button\b([\s\S]*?)\/>/g, (match, p1) => {
    const labelAttr = getAttr(p1, 'label');
    const variantAttr = getAttr(p1, 'variant');
    const onClickAttr = getAttr(p1, 'onClick');
    const isLoadingAttr = getAttr(p1, 'isLoading');
    const isDisabledAttr = getAttr(p1, 'isDisabled') || getAttr(p1, 'disabled');

    const label = labelAttr ? (labelAttr.isExpr ? labelAttr.val : '"' + labelAttr.val + '"') : '""';
    const variant = variantAttr ? variantAttr.val : 'primary';
    const onClick = onClickAttr ? onClickAttr.val : '';
    const isLoading = isLoadingAttr ? isLoadingAttr.val : 'false';
    const isDisabled = isDisabledAttr ? isDisabledAttr.val : 'false';

    let btnClass = "px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-black hover:opacity-90 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95";
    if (variant === 'secondary') {
      btnClass = "px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-white hover:bg-white/5 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95";
    }

    return (
      '<button\n' +
      '  type="button"\n' +
      (onClick ? '  onClick={' + onClick + '}\n' : '') +
      '  disabled={' + isDisabled + ' || ' + isLoading + '}\n' +
      '  className="' + btnClass + '"\n' +
      '>\n' +
      '  {' + isLoading + ' ? "Loading..." : ' + label + '}\n' +
      '</button>'
    );
  });

  // 4. Refactor Heading (multiline match)
  content = content.replace(/<Heading\b([\s\S]*?)>([\s\S]*?)<\/Heading>/g, (match, p1, contentText) => {
    const lvlAttr = getAttr(p1, 'level');
    const lvl = lvlAttr ? parseInt(lvlAttr.val, 10) : 2;

    const getHeadingClass = (level) => {
      if (level === 1) return 'font-serif text-3xl md:text-5xl font-black leading-tight tracking-tight text-white';
      if (level === 2) return 'font-serif text-2xl md:text-3xl font-black tracking-tight text-white';
      if (level === 3) return 'font-serif text-xl md:text-2xl font-black tracking-tight text-white';
      if (level === 4) return 'font-serif text-lg font-black leading-snug text-white';
      if (level === 5) return 'font-sans text-sm font-bold leading-snug text-white';
      return 'font-sans text-xs font-bold text-white';
    };

    const cls = getHeadingClass(lvl);
    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';
    
    return '<h' + lvl + ' className="' + cls + ' ' + restClass + '">' + contentText + '</h' + lvl + '>';
  });

  // 5. Refactor Text (multiline match)
  content = content.replace(/<Text\b([\s\S]*?)>([\s\S]*?)<\/Text>/g, (match, p1, contentText) => {
    let classes = 'text-xs leading-relaxed font-medium';
    if (p1.includes('color="secondary"') || p1.includes("color='secondary'")) {
      classes += ' text-[var(--color-text-secondary)]';
    } else {
      classes += ' text-[var(--color-text-primary)]';
    }

    if (p1.includes('size="xsm"') || p1.includes("size='xsm'")) {
      classes += ' text-[10px]';
    } else if (p1.includes('size="sm"') || p1.includes("size='sm'")) {
      classes += ' text-xs';
    } else if (p1.includes('size="base"') || p1.includes("size='base'")) {
      classes += ' text-sm';
    } else if (p1.includes('size="lg"') || p1.includes("size='lg'")) {
      classes += ' text-base';
    }

    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';

    return '<p className="' + classes + ' ' + restClass + '">' + contentText + '</p>';
  });

  // 6. Refactor StackItem
  content = content.replace(/<StackItem([\s\S]*?)>/g, (match, p1) => {
    let classes = 'flex-1';
    if (p1.includes('size="fill"')) {
      classes = 'flex-1';
    }
    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';
    return '<div className="' + classes + ' ' + restClass + '">';
  });
  content = content.replace(/<\/StackItem>/g, '</div>');

  // 7. Refactor Grid
  content = content.replace(/<Grid([\s\S]*?)>/g, (match, p1) => {
    let classes = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';
    return '<div className="' + classes + ' ' + restClass + '">';
  });
  content = content.replace(/<\/Grid>/g, '</div>');

  // 8. Refactor Card
  content = content.replace(/<Card([\s\S]*?)>/g, (match, p1) => {
    let classes = 'p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium';
    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';
    return '<div className="' + classes + ' ' + restClass + '">';
  });
  content = content.replace(/<\/Card>/g, '</div>');

  // 9. Refactor HStack
  content = content.replace(/<HStack([\s\S]*?)>/g, (match, p1) => {
    let classes = 'flex items-center';
    if (p1.includes('wrap="wrap"')) classes += ' flex-wrap';
    
    if (p1.includes('hAlign="between"')) classes += ' justify-between';
    else if (p1.includes('hAlign="end"')) classes += ' justify-end';
    else if (p1.includes('hAlign="center"')) classes += ' justify-center';
    else if (p1.includes('hAlign="around"')) classes += ' justify-around';
    
    if (p1.includes('vAlign="start"')) classes += ' items-start';
    else if (p1.includes('vAlign="end"')) classes += ' items-end';
    else if (p1.includes('vAlign="stretch"')) classes += ' items-stretch';

    const gapMatch = p1.match(/gap=\{(\d+(\.\d+)?)\}/) || p1.match(/gap=["'](\d+(\.\d+)?)["']/);
    if (gapMatch) classes += ' gap-' + gapMatch[1];

    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';
    return '<div className="' + classes + ' ' + restClass + '">';
  });
  content = content.replace(/<\/HStack>/g, '</div>');

  // 10. Refactor VStack
  content = content.replace(/<VStack([\s\S]*?)>/g, (match, p1) => {
    let classes = 'flex flex-col';
    if (p1.includes('hAlign="center"')) classes += ' items-center';
    else if (p1.includes('hAlign="end"')) classes += ' items-end';
    
    if (p1.includes('vAlign="center"')) classes += ' justify-center';
    else if (p1.includes('vAlign="end"')) classes += ' justify-end';

    const gapMatch = p1.match(/gap=\{(\d+(\.\d+)?)\}/) || p1.match(/gap=["'](\d+(\.\d+)?)["']/);
    if (gapMatch) classes += ' gap-' + gapMatch[1];

    let cnMatch = p1.match(/className=["']([^"']+)["']/);
    let restClass = cnMatch ? cnMatch[1] : '';
    return '<div className="' + classes + ' ' + restClass + '">';
  });
  content = content.replace(/<\/VStack>/g, '</div>');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, filepath)}`);
  }
});

console.log('Refactor Admin script finished!');
