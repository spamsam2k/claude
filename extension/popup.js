/**
 * Popup script - handles UI and orchestrates the scraping process
 */

let isRunning = false;
let allAgents = [];
let allExtractedData = {};
let scrapedCount = 0;

const elements = {
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    controls: document.querySelector('.controls'),
    progress: document.getElementById('progress'),
    results: document.getElementById('results'),
    error: document.getElementById('error'),
    statusBadge: document.getElementById('statusBadge'),
    pagesCount: document.getElementById('pagesCount'),
    agentsCount: document.getElementById('agentsCount'),
    phonesCount: document.getElementById('phonesCount'),
    progressFill: document.getElementById('progressFill'),
    currentAction: document.getElementById('currentAction'),
    resultsSummary: document.getElementById('resultsSummary'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    errorMessage: document.getElementById('errorMessage'),
    errorCloseBtn: document.getElementById('errorCloseBtn'),
    minDeals: document.getElementById('minDeals'),
    maxLeads: document.getElementById('maxLeads'),
    scrapePhone: document.getElementById('scrapePhone'),
    scrapeEmail: document.getElementById('scrapeEmail'),
    scrapeBrokerage: document.getElementById('scrapeBrokerage'),
    scrapeBio: document.getElementById('scrapeBio'),
    scrapeExperience: document.getElementById('scrapeExperience'),
    scrapeTotalSales: document.getElementById('scrapeTotalSales')
};

// Event listeners
elements.startBtn.addEventListener('click', startExtraction);
elements.stopBtn.addEventListener('click', stopExtraction);
elements.downloadBtn.addEventListener('click', downloadCSV);
elements.resetBtn.addEventListener('click', resetUI);
elements.errorCloseBtn.addEventListener('click', () => hideError());

/**
 * Start the extraction process
 */
async function startExtraction() {
    try {
        const tab = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab[0].url;

        if (!currentUrl.includes('zillow.com')) {
            showError('Please navigate to Zillow Find an Agent page first');
            return;
        }

        isRunning = true;
        allAgents = [];
        allExtractedData = {};
        scrapedCount = 0;

        // Get settings
        const settings = getSettings();

        // Update UI
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
        elements.controls.style.display = 'none';
        elements.progress.style.display = 'block';
        elements.results.style.display = 'none';
        elements.error.style.display = 'none';
        elements.statusBadge.classList.add('running');
        elements.statusBadge.textContent = 'Running';

        // Extract agents with pagination
        await extractAllPages(tab[0].id, settings);

        if (isRunning && allAgents.length > 0) {
            // Extract profile data
            await extractAllProfiles(tab[0].id, settings);
            showResults(settings);
        }
    } catch (e) {
        showError(`Error: ${e.message}`);
    }
}

/**
 * Get settings from UI
 */
function getSettings() {
    return {
        minDeals: parseInt(elements.minDeals.value) || 0,
        maxLeads: parseInt(elements.maxLeads.value) || 100,
        phone: elements.scrapePhone.checked,
        email: elements.scrapeEmail.checked,
        brokerage: elements.scrapeBrokerage.checked,
        bio: elements.scrapeBio.checked,
        experience: elements.scrapeExperience.checked,
        totalSales: elements.scrapeTotalSales.checked
    };
}

/**
 * Extract agents from all pages
 */
async function extractAllPages(tabId, settings) {
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage && isRunning && scrapedCount < settings.maxLeads) {
        updateAction(`Scanning page ${pageNum} for agents (min ${settings.minDeals} sales)...`);

        try {
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'extractAgents',
                minDeals: settings.minDeals
            });

            const agents = response.agents || [];
            if (agents.length > 0) {
                // Only add up to maxLeads
                const remaining = settings.maxLeads - scrapedCount;
                const toAdd = agents.slice(0, remaining);
                allAgents = [...allAgents, ...toAdd];
                scrapedCount += toAdd.length;

                updateStats(pageNum, allAgents.length);

                if (scrapedCount >= settings.maxLeads) {
                    hasNextPage = false;
                    updateAction(`Reached limit of ${settings.maxLeads} leads`);
                    break;
                }
            }

            // Check for next page
            const nextCheck = await chrome.tabs.sendMessage(tabId, {
                action: 'hasNextPage'
            });

            if (nextCheck.hasNext) {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'clickNext'
                });
                await delay(3000); // Wait for page to load
                pageNum++;
            } else {
                hasNextPage = false;
            }
        } catch (e) {
            console.error('Error extracting page:', e);
            hasNextPage = false;
        }
    }

    updateAction(`Found ${allAgents.length} agents. Extracting profile data...`);
}

/**
 * Extract profile data from all agents
 */
async function extractAllProfiles(tabId, settings) {
    updateAction('Starting profile extraction...');
    await delay(1000);

    for (let i = 0; i < allAgents.length; i++) {
        if (!isRunning) break;

        const agent = allAgents[i];
        const progress = Math.round(((i + 1) / allAgents.length) * 100);

        updateAction(`Extracting profile: ${agent.name} (${i + 1}/${allAgents.length})...`);
        elements.progressFill.style.width = progress + '%';

        try {
            if (!agent.link || !agent.link.startsWith('http')) {
                continue;
            }

            const newTab = await chrome.tabs.create({ url: agent.link, active: false });
            await delay(4000);

            try {
                const response = await chrome.tabs.sendMessage(newTab.id, {
                    action: 'extractProfile',
                    fields: settings
                });

                allExtractedData[agent.link] = response;
            } catch (msgError) {
                console.error(`Message error for ${agent.name}:`, msgError);
                allExtractedData[agent.link] = {};
            }

            try {
                await chrome.tabs.remove(newTab.id);
            } catch (closeError) {
                console.log('Tab already closed');
            }

            updateStats(1, allAgents.length);
            await delay(1000);

        } catch (e) {
            console.error(`Error processing ${agent.name}:`, e);
        }
    }

    updateAction('Extraction complete!');
    elements.progressFill.style.width = '100%';
}

/**
 * Stop the extraction process
 */
function stopExtraction() {
    isRunning = false;
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.statusBadge.classList.remove('running');
    elements.statusBadge.textContent = 'Stopped';
    updateAction('Extraction stopped');
}

/**
 * Update statistics display
 */
function updateStats(pages, agents) {
    elements.pagesCount.textContent = pages;
    elements.agentsCount.textContent = agents;
    elements.phonesCount.textContent = Object.values(allExtractedData).filter(d => d.phone).length;
}

/**
 * Update current action text
 */
function updateAction(text) {
    elements.currentAction.textContent = text;
}

/**
 * Show results section
 */
function showResults(settings) {
    elements.progress.style.display = 'none';
    elements.results.style.display = 'block';
    elements.statusBadge.classList.remove('running');
    elements.statusBadge.textContent = 'Complete';

    const phonesFound = Object.values(allExtractedData).filter(d => d.phone).length;
    const emailsFound = Object.values(allExtractedData).filter(d => d.email).length;

    let summary = `<strong>${allAgents.length}</strong> agents extracted<br>`;
    if (settings.phone) summary += `<strong>${phonesFound}</strong> phone numbers found<br>`;
    if (settings.email) summary += `<strong>${emailsFound}</strong> emails found<br>`;
    summary += `Success rate: <strong>${Math.round((phonesFound / allAgents.length) * 100)}%</strong>`;

    elements.resultsSummary.innerHTML = summary;
}

/**
 * Download results as CSV
 */
function downloadCSV() {
    if (allAgents.length === 0) {
        alert('No data to download');
        return;
    }

    const settings = getSettings();
    const headers = ['Full Name', 'Profile Link'];

    if (settings.phone) headers.push('Phone Number');
    if (settings.email) headers.push('Email');
    if (settings.brokerage) headers.push('Brokerage');
    headers.push('Team Sales (12mo)');
    if (settings.bio) headers.push('Bio');
    if (settings.experience) headers.push('Years Experience');
    if (settings.totalSales) headers.push('Total Sales');

    let csv = headers.join('\t') + '\n';

    allAgents.forEach(agent => {
        const data = allExtractedData[agent.link] || {};
        const values = [agent.name, agent.link];

        if (settings.phone) values.push(data.phone || agent.phone || '');
        if (settings.email) values.push(data.email || '');
        if (settings.brokerage) values.push(data.brokerage || agent.brokerage || '');
        values.push(agent.teamSales || '');
        if (settings.bio) values.push((data.bio || '').replace(/\n/g, ' '));
        if (settings.experience) values.push(data.experience || '');
        if (settings.totalSales) values.push(data.totalSales || '');

        csv += values.join('\t') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zillow-agents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Reset UI
 */
function resetUI() {
    isRunning = false;
    allAgents = [];
    allExtractedData = {};
    scrapedCount = 0;

    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.controls.style.display = 'flex';
    elements.progress.style.display = 'none';
    elements.results.style.display = 'none';
    elements.error.style.display = 'none';
    elements.statusBadge.classList.remove('running');
    elements.statusBadge.textContent = 'Ready';
    elements.progressFill.style.width = '0%';

    updateStats(0, 0);
}

/**
 * Show error message
 */
function showError(message) {
    elements.error.style.display = 'block';
    elements.errorMessage.textContent = message;
    elements.statusBadge.classList.add('error');
    elements.statusBadge.textContent = 'Error';
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
}

/**
 * Hide error message
 */
function hideError() {
    elements.error.style.display = 'none';
    elements.statusBadge.classList.remove('error');
    elements.statusBadge.textContent = 'Ready';
}

/**
 * Utility: delay function
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if on Zillow on popup open
 */
window.addEventListener('DOMContentLoaded', async () => {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab[0].url;

    if (!currentUrl.includes('zillow.com')) {
        elements.statusBadge.textContent = 'Not on Zillow';
        elements.startBtn.disabled = true;
    }
});
