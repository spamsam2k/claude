# Zillow Scraper Extension - Quick Fix

The extension is showing "Receiving end does not exist" error. This means the content script isn't loading in Chrome.

## Fix (2 minutes)

### Step 1: Remove the extension
1. Open `chrome://extensions/`
2. Find "Zillow Scraper" 
3. Click **Remove**

### Step 2: Reload the extension
1. Still in `chrome://extensions/`
2. Click **Load unpacked** (top left)
3. Navigate to `/home/user/claude/extension`
4. Select the `extension` folder and click Open

### Step 3: Test it
1. Open this file in your browser: `file:///home/user/claude/extension-test.html`
2. Click "Run All Tests"
3. If it says "✓ Content Script loaded and responding" → extension is working
4. If it fails → scroll down to the advice section

### Step 4: Use it
1. Go to `https://www.zillow.com/professionals/real-estate-agent-reviews/` (Find an Agent page)
2. Click the Zillow Scraper extension icon
3. Click "Extract This Page"
4. Watch the progress in the popup

## What Changed

- Added diagnostic logging so you can see exactly what's happening
- Improved error messages to guide troubleshooting
- Content script now logs when it loads: `📍 Zillow Scraper content script loaded`
- Messages are logged: `📩 Message received: extractAgents`

## If still not working

1. Open DevTools on Zillow page (F12)
2. Go to **Console** tab
3. Look for these messages:
   - `📍 Zillow Scraper content script loaded` ← means extension is loaded
   - `📩 Message received: extractAgents` ← means popup is talking to content script
   - `❌ Content script error:` ← if there's a JavaScript error

4. **Screenshot the console output and send it**

That will tell us exactly what's wrong.

## TL;DR

**Just remove and reload the extension in `chrome://extensions/`**

Chrome sometimes doesn't reload modified files properly. A full remove/reload fixes 99% of "Receiving end does not exist" errors.
