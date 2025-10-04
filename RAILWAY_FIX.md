# Railway Deployment Fix

## The Problem
Railway can't find `package-lock.json` because the backend is in `apps/backend/` subdirectory.

## Solution Options

### Option 1: Configure Root Directory in Railway Dashboard (RECOMMENDED)

This is the easiest fix:

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **Settings** tab
4. Find **"Root Directory"** or **"Source Directory"**
5. Set it to: `apps/backend`
6. Click **"Deploy"** to trigger new build

**This tells Railway:** "Treat `apps/backend/` as the root of the app"

---

### Option 2: Use Railway CLI

If you have Railway CLI installed:

```bash
railway link
railway up --service backend
```

Then in Railway dashboard, set root directory as above.

---

### Option 3: Move Backend to Root (NOT RECOMMENDED)

This would undo your clean architecture. Don't do this.

---

## After Setting Root Directory

Railway will:
1. ✅ Find `package.json` and `package-lock.json` in root
2. ✅ Run `npm install` automatically
3. ✅ Start with `node server.js`

You can remove or simplify `nixpacks.toml` to just:

```toml
[start]
cmd = "node server.js"
```

---

## Verify Configuration

After setting root directory in Railway:

1. Check **Settings** → Root Directory shows `apps/backend`
2. Trigger a new deployment
3. Watch build logs - should show successful npm install
4. Service should start successfully

---

**Do this now:** Go to Railway dashboard and set Root Directory to `apps/backend` 🚀

