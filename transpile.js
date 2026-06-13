const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const sourceFile = path.join(__dirname, 'app', '(tabs)', 'dashboard.tsx');
const outputFile = path.join(__dirname, 'transpiled_dashboard.js');

try {
  const result = babel.transformFileSync(sourceFile, {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript'
    ]
  });

  fs.writeFileSync(outputFile, result.code);
  console.log('✅ Transpiled successfully to:', outputFile);
} catch (err) {
  console.error('Babel compilation error:', err.message);
}
