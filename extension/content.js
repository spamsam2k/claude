/**
 * Simple content script - just extract agent data
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractAgents') {
        const agents = extractAgents();
        sendResponse({ agents });
    } else if (request.action === 'extractProfile') {
        const data = extractProfile();
        sendResponse(data);
    } else if (request.action === 'clickNextPage') {
        clickNextPage(request.selector);
        sendResponse({ success: true });
    }
});

/**
 * Extract all agents from this page
 */
function extractAgents() {
    const agents = [];
    const seen = new Set();

    // Get all links to agent profiles
    const links = document.querySelectorAll('a[href*="/profile/"]');

    links.forEach(link => {
        const href = link.href;
        const name = link.textContent.trim().split('\n')[0];

        if (href && name && !seen.has(href) && name.length > 2) {
            // Get the parent card to extract more info
            let card = link.closest('div');
            let attempts = 0;
            while (card && attempts < 10) {
                if (card.innerText && card.innerText.length > 50) {
                    break;
                }
                card = card.parentElement;
                attempts++;
            }

            const cardText = card ? card.innerText : '';

            // Extract sales
            const salesMatch = cardText.match(/(\d+)\s*(?:team\s+)?sales last 12 months/i);
            const sales = salesMatch ? parseInt(salesMatch[1]) : 0;

            // Extract brokerage
            const brokerageMatch = cardText.match(/^([^\n]*(?:Realty|Estate|Broker)[^\n]*?)(?:\n|$)/im);
            const brokerage = brokerageMatch ? brokerageMatch[1].trim() : '';

            agents.push({
                name: name,
                link: href,
                brokerage: brokerage,
                teamSales: sales,
                phone: '',
                email: ''
            });

            seen.add(href);
        }
    });

    return agents;
}

/**
 * Extract profile data
 */
function extractProfile() {
    const pageText = document.body.innerText;

    return {
        phone: extractPhone(pageText),
        email: extractEmail(pageText),
        brokerage: extractBrokerage(pageText)
    };
}

function extractPhone(text) {
    // Try tel: link
    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
        const phone = telLink.href.replace('tel:', '').trim();
        return formatPhone(phone);
    }

    // Try regex
    const match = text.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    if (match) return formatPhone(match[0]);
    return '';
}

function extractEmail(text) {
    const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
}

function extractBrokerage(text) {
    // Look for brokerage name
    const match = text.match(/(?:Brokerage|at):\s*([^\n]+)/i);
    if (match) return match[1].trim();
    return '';
}

function formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return '';
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

function clickNextPage(selector) {
    if (!selector) {
        // Try to auto-find next button
        const buttons = document.querySelectorAll('a, button');
        for (const btn of buttons) {
            if (btn.innerText.toLowerCase().includes('next') && !btn.disabled) {
                btn.click();
                return;
            }
        }
    } else {
        // Use provided selector
        const element = document.querySelector(selector);
        if (element) element.click();
    }
}
