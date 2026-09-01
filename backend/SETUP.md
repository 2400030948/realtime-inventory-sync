# Backend Setup Notes

## First-run checklist

1. **Copy `.env` from the template**
   ```bash
   cp .env.example .env   # macOS/Linux
   copy .env.example .env # Windows
   ```
   Then fill in your real `MONGO_URI`, AWS keys, etc.

2. **Whitelist your IP in MongoDB Atlas** (most common gotcha)

   If you see:
   ```
   Could not connect to any servers in your MongoDB Atlas cluster.
   One common reason is that you're trying to access the database from an IP
   that isn't whitelisted.
   ```
   …then your current public IP is **not** allowed to reach your Atlas cluster.

   Fix:
   1. Open https://cloud.mongodb.com and sign in.
   2. Choose your project → **Security → Network Access** (left sidebar).
   3. Click **"+ Add IP Address"**.
   4. Click **"Add Current IP Address"** (it auto-detects), then **Confirm**.
   5. Wait ~1–2 minutes for the change to propagate, then re-run `npm start`.

   For local development only, you can also click **"Allow Access from
   Anywhere"** (adds the `0.0.0.0/0` entry). Do **not** use this in production.

3. **Resume the cluster if it auto-paused**

   Free-tier (M0) Atlas clusters pause after 60 days of inactivity. In the
   Atlas UI, go to **Database → Clusters**, click your cluster, then
   **Resume** if its status is "Paused".

4. **Install & run**
   ```bash
   npm install
   npm start            # production
   npm run dev          # auto-reload via nodemon
   ```

## Diagnostic scripts

| Script | Purpose |
| --- | --- |
| `node check-env.js` | Verifies `.env` is being loaded and prints `MONGO_URI` host/user (password masked). |
| `node check-connect.js` | Attempts a real TCP+TLS handshake with Atlas. If this fails with the IP whitelist error, your IP really isn't whitelisted. |
| `node check-startup.js` | Boots `server.js` for 12s and prints all output. Useful for capturing error logs. |

## Why the connection string looks the way it does

`MONGO_URI` uses the `mongodb+srv://` scheme. This tells the driver to look
up DNS SRV records at `_mongodb._tcp.<host>` to discover the Atlas replica
set members. The driver then opens **TLS** connections on port `27017` to
each member. Both DNS and TCP must be reachable from your machine.