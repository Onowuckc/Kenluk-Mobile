const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const filePath = path.join(__dirname, 'app', '(tabs)', 'dashboard.tsx');
const code = fs.readFileSync(filePath, 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

console.log('--- Checking for hidden/unicode spaces in JSX children of non-Text components ---');

traverse(ast, {
  JSXElement(astPath) {
    const nameNode = astPath.node.openingElement.name;
    let name = '';
    if (nameNode.type === 'JSXIdentifier') {
      name = nameNode.name;
    } else if (nameNode.type === 'JSXMemberExpression') {
      name = `${nameNode.object.name}.${nameNode.property.name}`;
    }

    if (name !== 'Text' && name !== 'Animated.Text') {
      astPath.node.children.forEach(child => {
        if (child.type === 'JSXText') {
          const val = child.value;
          // Check if it contains anything other than standard spaces, tabs, carriage returns, or newlines
          const clean = val.replace(/[\s\r\n\t]/g, '');
          if (clean.length > 0) {
            console.log(`❌ Non-standard text "${JSON.stringify(val)}" under <${name}> at line ${child.loc?.start.line}`);
          } else {
            // Check for non-breaking space (u00a0) or other special whitespaces
            for (let i = 0; i < val.length; i++) {
              const charCode = val.charCodeAt(i);
              if (charCode === 160) {
                console.log(`❌ Non-breaking space (u00a0) found under <${name}> at line ${child.loc?.start.line}`);
              } else if (charCode > 127 && charCode !== 8232 && charCode !== 8233) {
                // Any other unicode character
                console.log(`❌ Special unicode character (code: ${charCode}) found under <${name}> at line ${child.loc?.start.line}`);
              }
            }
          }
        }
      });
    }
  }
});
console.log('--- Done checking ---');
