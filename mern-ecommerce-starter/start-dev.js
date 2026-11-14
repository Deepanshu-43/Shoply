import { spawn } from 'child_process';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '================================================');
console.log('\x1b[36m%s\x1b[0m', '   Starting MERN E-Commerce App (Server + Client)  ');
console.log('\x1b[36m%s\x1b[0m', '================================================');

function checkMongo(port = 27017, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

const mongoReady = await checkMongo();
if (!mongoReady) {
  console.log('\x1b[33m%s\x1b[0m', '⚠️  Warning: MongoDB does not seem to be running on port 27017.');
  console.log('\x1b[33m%s\x1b[0m', '   If needed, start it via "net start MongoDB" in PowerShell (Run as Administrator),');
  console.log('\x1b[33m%s\x1b[0m', '   or check your MONGO_URI in server/.env\n');
} else {
  console.log('\x1b[32m%s\x1b[0m', '✓ MongoDB detected on port 27017.');
}

console.log('\x1b[35m%s\x1b[0m', 'Starting Express API server on http://localhost:5000 ...');
const serverProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

console.log('\x1b[35m%s\x1b[0m', 'Starting Vite frontend on http://localhost:5173 ...');
const clientProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'client'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down server and client processes...');
  if (isWindows) {
    if (serverProc.pid) spawn('taskkill', ['/pid', String(serverProc.pid), '/f', '/t'], { stdio: 'ignore' });
    if (clientProc.pid) spawn('taskkill', ['/pid', String(clientProc.pid), '/f', '/t'], { stdio: 'ignore' });
  } else {
    serverProc.kill();
    clientProc.kill();
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
