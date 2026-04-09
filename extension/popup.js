/**
 * Popup script - handles UI and orchestrates the scraping process
 */

let isRunning = false;
let allAgents = [];
let allExtractedPhones = {};

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
    errorCloseBtn: document.getElementById('errorCloseBtn')
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
        // Check if we're on a Zillow search page
        const tab = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab[0].url;

        if (!currentUrl.includes('zillow.com')) {
            showError('Please navigate to a Zillow search results page first');
            return;
        }

        isRunning = true;
        allAgents = [];
        allExtractedPhones = {};

        // Update UI
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
        elements.controls.style.display = 'none';
        elements.progress.style.display = 'block';
        elements.results.style.display = 'none';
        elements.error.style.display = 'none';
        elements.statusBadge.classList.add('running');
        elements.statusBadge.textContent = 'Running';

        // Start extraction process
        await extractAllPages(tab[0].id);

        if (isRunning) {
            // Phone extraction
            await extractAllPhones(tab[0].id);

            // Show results
            showResults();
        }
    } catch (e) {
        showError(`Error: ${e.message}`);
    }
}

/**
 * Extract agents from all pages
 */
async function extractAllPages(tabId) {
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage && isRunning) {
        updateAction(`Extracting agents from page ${pageNum}...`);

        try {
            // Extract agents from current page
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'extractAgents'
            });

            const agents = response.agents || [];
            allAgents = [...allAgents, ...agents];

            updateStats(pageNum, allAgents.length, 0);

            // Check if there's a next page
            const nextPageExists = await checkNextPage(tabId);

            if (nextPageExists) {
                // Click next button
                await chrome.tabs.sendMessage(tabId, {
                    action: 'clickNext'
                });

                // Wait for page to load
                await delay(3000);
                pageNum++;
            } else {
                hasNextPage = false;
            }
        } catch (e) {
            console.error('Error extracting page:', e);
            hasNextPage = false;
        }
    }

    updateAction(`Found ${allAgents.length} agents total`);
}

/**
 * Extract phone numbers from all agent profiles
 */
async function extractAllPhones(tabId) {
    updateAction('Starting phone number extraction...');
    await delay(1000);

    for (let i = 0; i < allAgents.length; i++) {
        if (!isRunning) break;

        const agent = allAgents[i];
        const progress = Math.round((i / allAgents.length) * 100);

        updateAction(`Extracting phone: ${agent.name} (${i + 1}/${allAgents.length})`);
        elements.progressFill.style.width = progress + '%';

        try {
            // Open agent profile in a new tab
            const newTab = await chrome.tabs.create({ url: agent.link, active: false });

            // Wait for page to load
            await delay(3000);

            // Extract phone from the profile
            const response = await chrome.tabs.sendMessage(newTab.id, {
                action: 'extractPhone'
            });

            allExtractedPhones[agent.link] = response.phone || '';

            // Close the tab
            await chrome.tabs.remove(newTab.id);

            // Update stats
            const phonesFound = Object.values(allExtractedPhones).filter(p => p).length;
            updateStats(pageNum, allAgents.length, phonesFound);

            // Small delay between requests
            await delay(500);
        } catch (e) {
            console.error(`Error extracting phone for ${agent.name}:`, e);
            allExtractedPhones[agent.link] = '';
        }
    }

    updateAction('Extraction complete!');
    elements.progressFill.style.width = '100%';
}

/**
 * Check if next page button exists
 */
async function checkNextPage(tabId) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            action: 'checkNext'
        });
        return response.exists || false;
    } catch (e) {
        return false;
    }
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
function updateStats(pages, agents, phones) {
    elements.pagesCount.textContent = pages;
    elements.agentsCount.textContent = agents;
    elements.phonesCount.textContent = phones;
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
function showResults() {
    elements.progress.style.display = 'none';
    elements.results.style.display = 'block';
    elements.statusBadge.classList.remove('running');
    elements.statusBadge.textContent = 'Complete';

    const phonesFound = Object.values(allExtractedPhones).filter(p => p).length;
    const summary = `
        <strong>${allAgents.length}</strong> agents extracted<br>
        <strong>${phonesFound}</strong> phone numbers found<br>
        Success rate: <strong>${Math.round((phonesFound / allAgents.length) * 100)}%</strong>
    `;
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

    // Build CSV
    const headers = ['Full Name', 'Zillow Link', 'Phone Number', 'Brokerage', 'Rating'];
    let csv = headers.join('\t') + '\n';

    allAgents.forEach(agent => {
        const phone = allExtractedPhones[agent.link] || '';
        const values = [
            agent.name,
            agent.link,
            phone,
            agent.brokerage || '',
            agent.rating || ''
        ];
        csv += values.join('\t') + '\n';
    });

    // Download
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
    allExtractedPhones = {};

    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.controls.style.display = 'flex';
    elements.progress.style.display = 'none';
    elements.results.style.display = 'none';
    elements.error.style.display = 'none';
    elements.statusBadge.classList.remove('running');
    elements.statusBadge.textContent = 'Ready';
    elements.progressFill.style.width = '0%';

    updateStats(0, 0, 0);
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
