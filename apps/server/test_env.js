const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

const expectedEnvPathInServer = path.resolve(__dirname, '.env');
console.log('Expected .env path in apps/server/src:', expectedEnvPathInServer);
console.log('File exists in apps/server/src?', fs.existsSync(expectedEnvPathInServer));

const expectedEnvPathInServerRoot = path.resolve(__dirname, '..', '.env');
console.log('Expected .env path in apps/server:', expectedEnvPathInServerRoot);
console.log('File exists in apps/server?', fs.existsSync(expectedEnvPathInServerRoot));

const res = dotenv.config();
console.log('dotenv result:', res);
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
