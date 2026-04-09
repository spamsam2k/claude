/**
 * Simple popup - just extract page and let user click next manually
 */

let allAgents = [];
let nextPageSelector = null;
let maxLeads = 100;

const elements = {
    extractBtn: document.getElementById('extractBtn'),
    nextBtn: document.getElementById('nextBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    progress: document.getElementById('progress'),
    agentsCount: document.getElementById('agentsCount'),
    phonesCount: document.getElementById('phonesCount'),
    currentAction: document.getElementById('currentAction'),
    selectorMode: document.getElementById('selectorMode'),
    selectorCancel: document.getElementById('selectorCancel'),
    statusBadge: document.getElementById('statusBadge'),
    maxLeads: document.getElementById('maxLeads'),
    footerText: document.getElementById('footerText')
};

elements.extractBtn.addEventListener('click', extractPage);
elements.nextBtn.addEventListener('click', setupNextPageSelector);
elements.downloadBtn.addEventListener('click', downloadCSV);
elements.selectorCancel.addEventListener('click', cancelSelector);

/**
 * Extract agents from current page
 */
async function extractPage() {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab[0].url;

    if (!currentUrl.includes('zillow.com')) {
        elements.footerText.textContent = '❌ Not on Zillow!';
        return;
    }

    elements.extractBtn.disabled = true;
    elements.progress.style.display = 'block';
    elements.currentAction.textContent = 'Extracting agents...';

    try {
        const response = await chrome.tabs.sendMessage(tab[0].id, {
            action: 'extractAgents'
        });

        const newAgents = response.agents || [];
        allAgents = allAgents.concat(newAgents);

        // Extract phones from profiles (in background)
        await extractPhones(tab[0].id, newAgents);

        elements.agentsCount.textContent = allAgents.length;
        elements.phonesCount.textContent = allAgents.filter(a => a.phone).length;
        elements.currentAction.textContent = `✓ Found ${newAgents.length} agents on this page (${allAgents.length} total)`;
        elements.statusBadge.textContent = 'Complete';
        elements.downloadBtn.style.display = 'inline-block';

        if (allAgents.length >= parseInt(elements.maxLeads.value)) {
            elements.nextBtn.disabled = true;
            elements.footerText.textContent = '✓ Reached maximum leads!';
        }

    } catch (e) {
        elements.currentAction.textContent = `❌ Error: ${e.message}`;
    } finally {
        elements.extractBtn.disabled = false;
    }
}

/**
 * Extract phones from each agent's profile
 */
async function extractPhones(tabId, agents) {
    for (const agent of agents) {
        if (allAgents.length >= parseInt(elements.maxLeads.value)) break;

        try {
            const newTab = await chrome.tabs.create({ url: agent.link, active: false });
            await delay(3000);

            const response = await chrome.tabs.sendMessage(newTab.id, {
                action: 'extractProfile',
                fields: { phone: true, email: true, brokerage: true }
            });

            const idx = allAgents.findIndex(a => a.link === agent.link);
            if (idx >= 0) {
                allAgents[idx].phone = response.phone || '';
                allAgents[idx].email = response.email || '';
                allAgents[idx].brokerage = response.brokerage || allAgents[idx].brokerage || '';
            }

            await chrome.tabs.remove(newTab.id);
            elements.phonesCount.textContent = allAgents.filter(a => a.phone).length;

            await delay(500);
        } catch (e) {
            console.error('Phone extraction error:', e);
        }
    }
}

/**
 * Setup next page button selector
 */
async function setupNextPageSelector() {
    if (nextPageSelector) {
        // Already have a selector, just click it
        const tab = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab[0].id, {
            action: 'clickNextPage',
            selector: nextPageSelector
        });
        return;
    }

    // Enter selector mode
    elements.selectorMode.style.display = 'block';
    elements.nextBtn.disabled = true;
    elements.extractBtn.disabled = true;

    const tab = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject click listener on the page
    await chrome.tabs.executeScript(tab[0].id, {
        code: `
            window.selectedElement = null;
            document.addEventListener('click', (e) => {
                if (e.target.id !== 'zillow-selector-cancel') {
                    e.preventDefault();
                    e.stopPropagation();
                    window.selectedElement = e.target;
                }
            }, true);
        `
    }).catch(() => {});

    // Wait for selection
    await delay(100);
    elements.footerText.textContent = '👆 Click the Next Page button on the page...';
}

/**
 * Cancel selector mode
 */
function cancelSelector() {
    elements.selectorMode.style.display = 'none';
    elements.nextBtn.disabled = false;
    elements.extractBtn.disabled = false;
}

/**
 * Download CSV
 */
function downloadCSV() {
    if (allAgents.length === 0) {
        alert('No agents to download');
        return;
    }

    const headers = ['Name', 'Phone', 'Email', 'Brokerage', 'Profile Link'];
    let csv = headers.join('\t') + '\n';

    allAgents.forEach(agent => {
        const values = [
            agent.name || '',
            agent.phone || '',
            agent.email || '',
            agent.brokerage || '',
            agent.link || ''
        ];
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

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if on Zillow
window.addEventListener('DOMContentLoaded', async () => {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab[0].url.includes('zillow.com')) {
        elements.extractBtn.disabled = true;
        elements.footerText.textContent = '❌ Go to Zillow Find an Agent page';
    }
});
