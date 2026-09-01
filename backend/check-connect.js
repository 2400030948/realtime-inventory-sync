// Direct Atlas connection diagnostic. Run with: node check-connect.js
require('dotenv').config();
const dns = require('dns');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('No MONGO_URI in .env');
  process.exit(1);
}

// Hide password in logs
const masked = uri.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@)/, '$1***$3');
console.log('Connecting to:', masked);

const hostname = new URL(uri).hostname;
console.log('Resolving SRV / host:', hostname);

dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
  if (err) {
    console.error('DNS SRV lookup FAILED:', err.code, err.message);
    console.error('This usually means DNS cannot reach the Atlas SRV record (offline / firewall / DNS-blocker).');
    process.exit(1);
  }
  console.log('SRV records found:', addresses.length);
  addresses.slice(0, 3).forEach((a) => console.log('  ', a.name + ':' + a.port));

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  (async () => {
    try {
      await client.connect();
      const admin = client.db('admin').admin();
      const res = await admin.command({ ping: 1 });
      console.log('PING OK:', res);
      await client.close();
      process.exit(0);
    } catch (e) {
      console.error('CONNECTION FAILED:', e.name, '-', e.message);
      if (e.cause) console.error('Cause:', e.cause.name, e.cause.message);
      process.exit(1);
    }
  })();
});