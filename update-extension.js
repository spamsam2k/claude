#!/usr/bin/env node

/**
 * Zillow Agent Scraper - Extension Updater
 *
 * Pulls latest changes from GitHub and validates extension files
 * Run whenever you want to update the extension
 *
 * Usage:
 *   node update-extension.js
 *   or: npm run update-extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_DIR = path.join(__dirname, 'extension');
const BRANCH = 'claude/extract-zillow-phone-numbers-1GWtv';

console.log('\n🚀 Zillow Agent Scraper - Extension Updater\n');
console.log('═'.repeat(50) + '\n');

try {
    // Step 1: Pull latest from GitHub
    console.log('📥 Pulling latest changes from GitHub...');
    try {
        execSync(`git fetch origin ${BRANCH}`, { cwd: __dirname });
        execSync(`git checkout ${BRANCH}`, { cwd: __dirname });
        execSync(`git pull origin ${BRANCH}`, { cwd: __dirname });
        console.log('   ✅ Downloaded latest version\n');
    } catch (e) {
        console.log('   ⚠️  Could not pull from git (offline?)\n');
        console.log('   Checking local files instead...\n');
    }

    // Step 2: Verify extension files
    console.log('🔍 Verifying extension files:\n');

    const requiredFiles = [
        'manifest.json',
        'popup.html',
        'popup.js',
        'content.js',
        'background.js',
        'styles.css'
    ];

    let allFilesPresent = true;

    requiredFiles.forEach(file => {
        const filePath = path.join(EXTENSION_DIR, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`   ✅ ${file.padEnd(20)} ${sizeKB} KB`);
        } else {
            console.log(`   ❌ ${file.padEnd(20)} MISSING!`);
            allFilesPresent = false;
        }
    });

    console.log('\n' + '═'.repeat(50) + '\n');

    if (!allFilesPresent) {
        console.error('❌ Some files are missing! Extension may not work properly.\n');
        process.exit(1);
    }

    // Step 3: Show next steps
    console.log('✅ Extension files are all ready!\n');
    console.log('📋 To update Chrome with the new files:\n');
    console.log('   1. Open Chrome and go to: chrome://extensions/');
    console.log('   2. Find "Zillow Agent Scraper"');
    console.log('   3. Click the REFRESH icon 🔄 (top right of the card)');
    console.log('   4. Done! Your extension is updated\n');

    console.log('💡 Pro tip - Create an alias to run this faster:');
    console.log('   Add this line to ~/.bashrc or ~/.zshrc:\n');
    console.log('   alias update-ext="cd /home/user/claude && node update-extension.js"\n');
    console.log('   Then just type: update-ext\n');

    console.log('📖 Extension location: /home/user/claude/extension/');
    console.log('📖 Need help? Check: /home/user/claude/extension/README.md\n');

} catch (error) {
    console.error('❌ Error updating extension:\n');
    console.error(error.message + '\n');
    process.exit(1);
}
