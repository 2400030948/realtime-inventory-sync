// Quick env/dependency diagnostic. Run with: node check-env.js
console.log('Node:', process.version);
const pkg = require('./package.json').dependencies;
console.log('Declared deps:', { mongoose: pkg.mongoose, dotenv: pkg.dotenv });

try {
  const mongoosePath = require.resolve('mongoose');
  const dotenvPath = require.resolve('dotenv');
  console.log('Installed mongoose path:', mongoosePath);
  console.log('Installed dotenv path:', dotenvPath);
  const mongoosePkg = require('mongoose/package.json');
  const dotenvPkg = require('dotenv/package.json');
  console.log('Installed versions:', { mongoose: mongoosePkg.version, dotenv: dotenvPkg.version });
} catch (e) {
  console.error('Dependency resolution failed:', e.message);
}

require('dotenv').config();
console.log('--- .env loaded values ---');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI present?', Boolean(process.env.MONGO_URI));
if (process.env.MONGO_URI) {
  // Sanity-check parse of the URI without revealing the password
  try {
    const u = new URL(process.env.MONGO_URI);
    console.log('Protocol:', u.protocol);
    console.log('Username:', u.username);
    console.log('Host:', u.hostname);
    console.log('Database:', u.pathname.replace(/^\//, ''));
    console.log('Search params:', u.search);
  } catch (e) {
    console.error('MONGO_URI is not a valid URL:', e.message);
  }
}
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('LOW_STOCK_THRESHOLD:', process.env.LOW_STOCK_THRESHOLD);