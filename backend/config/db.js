const mongoose = require('mongoose');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Connects to MongoDB with a small retry loop and event listeners for
 * visibility in development. Exits the process if it ultimately cannot connect,
 * so a misconfigured Atlas cluster never silently serves a "broken" API.
 */
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('FATAL: MONGO_URI is not defined. Check your .env file.');
    process.exit(1);
  }

  mongoose.connection.on('connected', () =>
    console.log(`MongoDB connected: ${mongoose.connection.host}`)
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('MongoDB disconnected')
  );
  mongoose.connection.on('reconnected', () =>
    console.log('MongoDB reconnected')
  );
  mongoose.connection.on('error', (err) =>
    console.error('MongoDB connection error:', err.message)
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000, // fail fast instead of hanging
        // Mongoose 8 defaults are sane; explicit for clarity
      });
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`
      );
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        console.error(
          '\nAll MongoDB connection attempts failed.\n' +
            'Common causes:\n' +
            "  1. Your current IP isn't whitelisted in MongoDB Atlas →\n" +
            '     https://www.mongodb.com/docs/atlas/security-whitelist/\n' +
            '  2. The DB user / password in MONGO_URI is wrong.\n' +
            '  3. The Atlas cluster is paused (free tier auto-pauses after inactivity).\n' +
            '  4. You are behind a VPN / corporate proxy blocking port 27017.\n'
        );
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
