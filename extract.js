const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\e4e32580-13f6-4449-bc01-344f81fc5f93\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logFile),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('dashboard.tsx') && (line.includes('write_to_file') || line.includes('replace_file_content') || line.includes('multi_replace_file_content'))) {
    console.log('--- MATCHING LINE ---');
    console.log('Line length:', line.length);
    console.log('Snippet:', line.substring(0, 500));
    // Let's write the full line to a file for analysis
    fs.writeFileSync('matching_line.json', line);
  }
});
