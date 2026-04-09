/**
 * Simple, robust agent extraction - just grab text and parse it
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractAgents') {
        const agents = extractAgentsSimple(request.minDeals || 0);
        sendResponse({ agents });
    } else if (request.action === 'extractProfile') {
        const data = extractProfileSimple(request.fields || {});
        sendResponse(data);
    } else if (request.action === 'clickNext') {
        clickNext();
        sendResponse({ success: true });
    } else if (request.action === 'hasNextPage') {
        sendResponse({ hasNext: !!findNextButton() });
    }
});

/**
 * Extract agents by looking at all links to profiles and their context
 */
function extractAgentsSimple(minDeals = 0) {
    const agents = [];
    const seen = new Set();

    // Get all profile links
    const links = Array.from(document.querySelectorAll('a')).filter(a =>
        a.href && a.href.includes('/profile/') && a.textContent.trim().length > 2
    );

    links.forEach(link => {
        const href = link.href;
        if (seen.has(href)) return;
        seen.add(href);

        const name = link.textContent.trim().split('\n')[0];

        // Get text around this link (the card it's in)
        let parent = link.parentElement;
        let cardText = '';
        for (let i = 0; i < 5; i++) {
            if (!parent) break;
            cardText = parent.innerText || cardText;
            if (cardText.length > 100) break;
            parent = parent.parentElement;
        }

        // Extract sales number from card text
        const salesMatch = cardText.match(/(\d+)\s*(?:team\s+)?sales last 12 months/i);
        const sales = salesMatch ? parseInt(salesMatch[1]) : 0;

        // Extract brokerage from card text
        const brokerageMatch = cardText.match(/^([^\n]*(?:Realty|Estate|Broker|Agency)[^\n]*)/im);
        const brokerage = brokerageMatch ? brokerageMatch[1].trim() : '';

        // Filter by minimum sales
        if (sales >= minDeals && name.length > 2) {
            agents.push({
                name: name,
                link: href,
                brokerage: brokerage,
                teamSales: sales,
                phone: '',
                email: '',
                bio: '',
                experience: '',
                totalSales: ''
            });
        }
    });

    return agents;
}

/**
 * Extract profile data - simple text parsing
 */
function extractProfileSimple(fields) {
    const pageText = document.body.innerText;
    const htmlText = document.documentElement.innerHTML;

    const data = {
        name: extractName(),
        phone: fields.phone ? extractPhoneSimple(pageText) : '',
        email: fields.email ? extractEmailSimple(pageText) : '',
        brokerage: fields.brokerage ? extractBrokerageSimple(pageText) : '',
        bio: fields.bio ? extractBioSimple(pageText) : '',
        experience: fields.experience ? extractExperienceSimple(pageText) : '',
        totalSales: fields.totalSales ? extractSalesSimple(pageText) : ''
    };

    return data;
}

function extractName() {
    const h1 = document.querySelector('h1');
    if (h1) return h1.innerText.trim();

    const text = document.body.innerText;
    const firstLine = text.split('\n')[0];
    return firstLine.trim().substring(0, 100);
}

function extractPhoneSimple(text) {
    // Try tel: link first
    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
        const phone = telLink.href.replace('tel:', '').trim();
        return formatPhone(phone);
    }

    // Then regex
    const match = text.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    if (match) return formatPhone(match[0]);
    return '';
}

function extractEmailSimple(text) {
    const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
}

function extractBrokerageSimple(text) {
    const match = text.match(/(?:Brokerage|with|at):\s*([^\n]+)/i);
    if (match) return match[1].trim();

    const match2 = text.match(/^([A-Z][^\n]*(?:Realty|Estate)[^\n]*?)(?:\n|$)/im);
    return match2 ? match2[1].trim() : '';
}

function extractBioSimple(text) {
    const match = text.match(/About[\s\n]+([^About]*?)(?=Years|Experience|$)/i);
    if (match) return match[1].trim().substring(0, 500);
    return '';
}

function extractExperienceSimple(text) {
    const patterns = [
        /(\d+)\s*(?:years?|yrs?)?\s*(?:of\s+)?(?:real\s+)?estate\s+experience/i,
        /since\s+(\d{4})/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }
    return '';
}

function extractSalesSimple(text) {
    const patterns = [
        /total\s+(?:sales?|homes?):\s*([0-9,]+)/i,
        /(\d+)\s+(?:homes?|properties)\s+sold/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].replace(/,/g, '');
    }
    return '';
}

function formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return '';
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

function clickNext() {
    const btn = findNextButton();
    if (btn) {
        btn.click();
        return true;
    }
    return false;
}

function findNextButton() {
    // Try standard selectors
    let btn = document.querySelector('a[aria-label*="Next"], button[aria-label*="Next"], a[rel="next"]');
    if (btn && !btn.disabled) return btn;

    // Search by text
    const allButtons = document.querySelectorAll('a, button');
    for (const b of allButtons) {
        if (b.innerText.toLowerCase().includes('next') && !b.disabled) {
            return b;
        }
    }

    return null;
}
