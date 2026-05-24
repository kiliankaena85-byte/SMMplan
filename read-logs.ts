import * as fs from 'fs';
import * as readline from 'readline';

async function main() {
  const logPath = 'C:\\Users\\Артём\\.gemini\\antigravity\\brain\\f32ad398-9c40-4383-8245-6568e47faf97\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 1045 || obj.step_index === 1061 || obj.step_index === 1062 || obj.step_index === 1073) {
        console.log(`=== STEP ${obj.step_index} ===`);
        console.log(obj.content);
        console.log('=============================\n');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
}

main().catch(console.error);
