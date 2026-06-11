/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('build_output_utf8.txt', { encoding: 'utf8' });

console.log('Starting build...');
const build = spawn('npm', ['run', 'build'], { shell: true });

build.stdout.on('data', (data) => {
  logStream.write(data);
  process.stdout.write(data);
});

build.stderr.on('data', (data) => {
  logStream.write(data);
  process.stderr.write(data);
});

build.on('close', (code) => {
  console.log(`Build process exited with code ${code}`);
  logStream.end();
  process.exit(code);
});
