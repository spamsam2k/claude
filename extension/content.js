/**
 * Simple content script - extract agent data from Zillow pages
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'extractAgents') {
            const agents = extractAgents();
            sendResponse({ agents });
        } else if (request.action === 'extractProfile') {
            const data = extractProfile();
            sendResponse(data);
        } else if (request.action === 'clickNextPage') {
            const success = clickNextPageAuto();
            sendResponse({ success });
        }
    } catch (error) {
        console.error('Content script error:', error);
        sendResponse({ error: error.message });
    }
});

/**
 * Extract all agents from this page
 */
function extractAgents() {
    const agents = [];
    const seen = new Set();

    console.log('Starting agent extraction...');

    try {
        // Get all links to agent profiles
        const links = document.querySelectorAll('a[href*="/profile/"]');
        console.log(`Found ${links.length} agent profile links`);

        links.forEach(link => {
            try {
                const href = link.href;
                const name = link.textContent.trim().split('\n')[0];

                if (href && name && !seen.has(href) && name.length > 2) {
                    agents.push({
                        name: name,
                        link: href,
                        brokerage: '',
                        teamSales: 0,
                        phone: '',
                        email: ''
                    });

                    seen.add(href);
                    console.log(`Extracted: ${name}`);
                }
            } catch (e) {
                console.warn('Error processing link:', e);
            }
        });
    } catch (e) {
        console.error('Error in extractAgents:', e);
    }

    console.log(`Total extracted: ${agents.length}`);
    return agents;
}

/**
 * Extract profile data from agent's profile page
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
    try {
        // Try tel: link
        const telLink = document.querySelector('a[href^="tel:"]');
        if (telLink) {
            const phone = telLink.href.replace('tel:', '').trim();
            return formatPhone(phone);
        }

        // Try regex
        const match = text.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
        if (match) return formatPhone(match[0]);
    } catch (e) {
        console.warn('Error extracting phone:', e);
    }
    return '';
}

function extractEmail(text) {
    try {
        const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        return match ? match[1] : '';
    } catch (e) {
        console.warn('Error extracting email:', e);
    }
    return '';
}

function extractBrokerage(text) {
    try {
        // Look for brokerage name
        const match = text.match(/(?:Brokerage|at):\s*([^\n]+)/i);
        if (match) return match[1].trim();
    } catch (e) {
        console.warn('Error extracting brokerage:', e);
    }
    return '';
}

function formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return '';
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

function clickNextPageAuto() {
    try {
        // Strategy 1: Look for next button with aria-label
        let nextBtn = document.querySelector('[aria-label*="next"], [aria-label*="Next"]');
        if (nextBtn && !nextBtn.disabled) {
            console.log('Clicking next button');
            nextBtn.click();
            return true;
        }

        // Strategy 2: Look for button/link with "next" text
        const allElements = document.querySelectorAll('button, a, [role="button"]');
        for (const el of allElements) {
            const text = el.innerText?.toLowerCase() || el.textContent?.toLowerCase() || '';
            if (text.includes('next') && !el.disabled) {
                console.log('Clicking next via text');
                el.click();
                return true;
            }
        }

        // Strategy 3: Look for pagination arrows
        const rightArrows = document.querySelectorAll('button[aria-label*="right"], a[aria-label*="next"]');
        for (const arrow of rightArrows) {
            if (!arrow.disabled) {
                console.log('Clicking next via arrow');
                arrow.click();
                return true;
            }
        }

        console.log('Could not find next button');
    } catch (e) {
        console.error('Error clicking next:', e);
    }
    return false;
}
