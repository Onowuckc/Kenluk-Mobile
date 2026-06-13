const fs = require('fs');
const readline = require('readline');
const path = require('path');

const srcFile = path.join(__dirname, 'restored_dashboard.tsx');
const destFile = path.join(__dirname, 'app', '(tabs)', 'dashboard.tsx');

const rl = readline.createInterface({
  input: fs.createReadStream(srcFile),
  crlfDelay: Infinity
});

let inCode = false;
const codeLines = [];

rl.on('line', (line) => {
  if (!inCode) {
    if (line.includes('The following code has been modified')) {
      inCode = true;
    }
    return;
  }
  
  // The code lines are prefixed with: line_number: original_line
  // e.g. "8: 1: import React..."
  // We match the prefix of the line.
  // Wait, let's look at the prefix.
  const match = line.match(/^\d+:\s([\s\S]*)$/);
  if (match) {
    codeLines.push(match[1]);
  } else if (line.trim() === '') {
    codeLines.push('');
  }
});

rl.on('close', () => {
  fs.writeFileSync(destFile, codeLines.join('\n'));
  console.log('✅ Successfully restored clean file to:', destFile);
});
