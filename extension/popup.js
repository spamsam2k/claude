/**
 * Simple popup - just extract page by page
 */

let allAgents = [];
let maxLeads = 100;

const elements = {
    extractBtn: document.getElementById('extractBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    progress: document.getElementById('progress'),
    agentsCount: document.getElementById('agentsCount'),
    phonesCount: document.getElementById('phonesCount'),
    currentAction: document.getElementById('currentAction'),
    statusBadge: document.getElementById('statusBadge'),
    maxLeads: document.getElementById('maxLeads'),
    footerText: document.getElementById('footerText')
};

elements.extractBtn.addEventListener('click', extractPage);
elements.downloadBtn.addEventListener('click', downloadCSV);
elements.resetBtn.addEventListener('click', resetData);

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
    elements.statusBadge.textContent = 'Extracting';

    try {
        const response = await chrome.tabs.sendMessage(tab[0].id, {
            action: 'extractAgents'
        });

        const newAgents = response.agents || [];
        allAgents = allAgents.concat(newAgents);

        // Extract phones from profiles
        elements.currentAction.textContent = `Found ${newAgents.length} agents. Extracting phone numbers...`;
        await extractPhones(tab[0].id, newAgents);

        elements.agentsCount.textContent = allAgents.length;
        elements.phonesCount.textContent = allAgents.filter(a => a.phone).length;
        elements.currentAction.textContent = `✓ Page complete! ${allAgents.length} total agents`;
        elements.statusBadge.textContent = 'Complete';
        elements.downloadBtn.style.display = 'inline-block';
        elements.resetBtn.style.display = 'inline-block';

        if (allAgents.length >= parseInt(elements.maxLeads.value)) {
            elements.extractBtn.disabled = true;
            elements.footerText.textContent = '✓ Reached maximum leads!';
        } else {
            elements.footerText.textContent = '👉 Navigate to next page in Zillow, then click "Extract This Page" again';
        }

    } catch (e) {
        elements.currentAction.textContent = `❌ Error: ${e.message}`;
        elements.statusBadge.textContent = 'Error';
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
            await delay(2000);

            const response = await chrome.tabs.sendMessage(newTab.id, {
                action: 'extractProfile'
            });

            const idx = allAgents.findIndex(a => a.link === agent.link);
            if (idx >= 0) {
                allAgents[idx].phone = response.phone || '';
                allAgents[idx].email = response.email || '';
                allAgents[idx].brokerage = response.brokerage || allAgents[idx].brokerage || '';
            }

            await chrome.tabs.remove(newTab.id).catch(() => {});
            elements.phonesCount.textContent = allAgents.filter(a => a.phone).length;
            await delay(300);
        } catch (e) {
            console.error('Phone extraction error:', e);
        }
    }
}

/**
 * Download CSV
 */
function downloadCSV() {
    if (allAgents.length === 0) {
        alert('No agents to download');
        return;
    }

    const headers = ['Agent Name', 'Sales Last 12 Mo', 'Phone', 'Email', 'Brokerage', 'Profile Link'];
    let csv = headers.join('\t') + '\n';

    allAgents.forEach(agent => {
        const values = [
            agent.name || '',
            agent.teamSales || 0,
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

/**
 * Reset data
 */
function resetData() {
    if (confirm('Clear all extracted agents?')) {
        allAgents = [];
        elements.progress.style.display = 'none';
        elements.downloadBtn.style.display = 'none';
        elements.resetBtn.style.display = 'none';
        elements.statusBadge.textContent = 'Ready';
        elements.footerText.textContent = 'Ready to extract. Click "Extract This Page"';
        elements.extractBtn.disabled = false;
    }
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
