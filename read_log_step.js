const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\e4e32580-13f6-4449-bc01-344f81fc5f93\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logFile),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 279) {
      if (obj.content) {
        console.log('Content length:', obj.content.length);
        console.log('Content starts with:', JSON.stringify(obj.content.substring(0, 300)));
        console.log('Content ends with:', JSON.stringify(obj.content.substring(obj.content.length - 300)));
      }
    }
  } catch (err) {}
});
