/**
 * Simple content script - just extract agent data from Zillow pages
 * Uses both JSON-LD structured data and DOM selectors for reliability
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
});

/**
 * Extract all agents from this page using JSON-LD structured data + DOM fallback
 */
function extractAgents() {
    const agents = [];
    const seen = new Set();

    // First, try to extract from JSON-LD structured data (most reliable)
    const jsonLdAgents = extractAgentsFromJsonLD();

    // If JSON-LD found agents, use those
    if (jsonLdAgents.length > 0) {
        console.log(`Found ${jsonLdAgents.length} agents from JSON-LD structured data`);
        return jsonLdAgents;
    }

    // Fallback: Use DOM extraction
    console.log('No JSON-LD data found, trying DOM extraction...');

    // Get all links to agent profiles
    let links = document.querySelectorAll('a[href*="/profile/"]');

    if (links.length === 0) {
        links = document.querySelectorAll('a[href*="agent"]');
    }

    console.log(`Found ${links.length} potential agent links via DOM`);

    links.forEach(link => {
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
            console.log(`Extracted agent: ${name}`);
        }
    });

    console.log(`Total agents extracted: ${agents.length}`);
    return agents;
}

/**
 * Extract agents from JSON-LD structured data in the page
 */
function extractAgentsFromJsonLD() {
    const agents = [];
    const seen = new Set();

    // Find all script tags containing JSON-LD structured data
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    scripts.forEach(script => {
        try {
            const data = JSON.parse(script.textContent);

            // Handle both single objects and arrays
            const items = Array.isArray(data) ? data : (data['@graph'] || [data]);

            items.forEach(item => {
                // Look for RealEstateAgent or Person with agent-like properties
                if (item['@type'] === 'RealEstateAgent' ||
                    item['@type'] === 'Person' ||
                    (Array.isArray(item['@type']) && item['@type'].includes('RealEstateAgent'))) {

                    const name = item.name || item.givenName || '';
                    const phone = item.telephone || '';
                    const email = item.email || '';
                    const url = item.url || '';

                    // Look for broker/agency name
                    let brokerage = '';
                    if (item.workLocation && item.workLocation.name) {
                        brokerage = item.workLocation.name;
                    } else if (item.affiliation && item.affiliation.name) {
                        brokerage = item.affiliation.name;
                    }

                    if (name && url && !seen.has(url)) {
                        agents.push({
                            name: name,
                            link: url,
                            brokerage: brokerage,
                            teamSales: 0,
                            phone: phone,
                            email: email
                        });
                        seen.add(url);
                        console.log(`Extracted from JSON-LD: ${name}`);
                    }
                }
            });
        } catch (e) {
            // Skip invalid JSON
        }
    });

    return agents;
}

/**
 * Extract profile data from agent's profile page
 */
function extractProfile() {
    // Try to get from JSON-LD first
    const jsonLdData = extractProfileFromJsonLD();
    if (jsonLdData.phone || jsonLdData.email) {
        return jsonLdData;
    }

    // Fallback to DOM/text extraction
    const pageText = document.body.innerText;

    return {
        phone: extractPhone(pageText),
        email: extractEmail(pageText),
        brokerage: extractBrokerage(pageText)
    };
}

/**
 * Extract profile data from JSON-LD structured data
 */
function extractProfileFromJsonLD() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of scripts) {
        try {
            const data = JSON.parse(script.textContent);
            const items = Array.isArray(data) ? data : (data['@graph'] || [data]);

            for (const item of items) {
                if (item['@type'] === 'RealEstateAgent' ||
                    item['@type'] === 'Person' ||
                    (Array.isArray(item['@type']) && item['@type'].includes('RealEstateAgent'))) {

                    let brokerage = '';
                    if (item.workLocation && item.workLocation.name) {
                        brokerage = item.workLocation.name;
                    } else if (item.affiliation && item.affiliation.name) {
                        brokerage = item.affiliation.name;
                    }

                    const phone = item.telephone ? formatPhone(item.telephone) : '';
                    const email = item.email || '';

                    if (phone || email || brokerage) {
                        console.log(`Extracted profile from JSON-LD: ${item.name}`);
                        return { phone, email, brokerage };
                    }
                }
            }
        } catch (e) {
            // Skip invalid JSON
        }
    }

    return { phone: '', email: '', brokerage: '' };
}

function extractPhone(text) {
    // Try tel: link first
    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
        const phone = telLink.href.replace('tel:', '').trim();
        return formatPhone(phone);
    }

    // Try data attributes
    const phoneEl = document.querySelector('[data-phone], [data-telephone], [aria-label*="phone"]');
    if (phoneEl) {
        const phone = phoneEl.textContent || phoneEl.value || phoneEl.getAttribute('data-phone');
        if (phone) return formatPhone(phone);
    }

    // Try regex patterns
    const phonePatterns = [
        /\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/,
        /\((\d{3})\)\s*(\d{3})-(\d{4})/,
        /(\d{3})[.\-](\d{3})[.\-](\d{4})/
    ];

    for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match) return formatPhone(match[0]);
    }

    return '';
}

function extractEmail(text) {
    // Try mailto: link first
    const mailLink = document.querySelector('a[href^="mailto:"]');
    if (mailLink) {
        const email = mailLink.href.replace('mailto:', '').split('?')[0];
        return email;
    }

    // Try data attributes
    const emailEl = document.querySelector('[data-email], [aria-label*="email"]');
    if (emailEl) {
        const email = emailEl.textContent || emailEl.value || emailEl.getAttribute('data-email');
        if (email) return email;
    }

    // Try regex
    const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
}

function extractBrokerage(text) {
    // Look for common brokerage patterns
    const patterns = [
        /(?:Brokerage|at|with):\s*([^\n]+)/i,
        /with\s+([^\n]*(?:Realty|Estate|Broker|Group)[^\n]*)/i,
        /^([^\n]*(?:Realty|Estate|Broker|Group)[^\n]*?)$/im
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
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
    // Strategy 1: Look for next button with aria-label (most reliable)
    let nextBtn = document.querySelector('[aria-label*="next" i]');
    if (nextBtn && !nextBtn.disabled) {
        console.log('Clicking next button via aria-label');
        nextBtn.click();
        return true;
    }

    // Strategy 2: Look for pagination with specific aria-label patterns
    const paginationBtn = document.querySelector(
        '[aria-label*="next page" i], [aria-label*="go to next" i], [data-testid*="next"]'
    );
    if (paginationBtn && !paginationBtn.disabled) {
        console.log('Clicking next button via pagination selector');
        paginationBtn.click();
        return true;
    }

    // Strategy 3: Look for button/link with "next" text (case-insensitive)
    const allElements = document.querySelectorAll('button, a, [role="button"]');
    for (const el of allElements) {
        const text = el.innerText?.toLowerCase() || el.textContent?.toLowerCase() || '';
        if (text.trim() === 'next' || text.includes('next page')) {
            if (!el.disabled && el.offsetHeight > 0) {  // Make sure it's visible
                console.log('Clicking next button via text content');
                el.click();
                return true;
            }
        }
    }

    // Strategy 4: Look for pagination arrow buttons (right arrow, chevron, etc)
    const rightArrows = document.querySelectorAll(
        'button[aria-label*="right" i], a[aria-label*="right" i], button[data-testid*="right"]'
    );
    for (const arrow of rightArrows) {
        if (!arrow.disabled && arrow.offsetHeight > 0) {
            console.log('Clicking next button via arrow/chevron');
            arrow.click();
            return true;
        }
    }

    // Strategy 5: Look for links in pagination sections
    const paginationSection = document.querySelector('[class*="pagination"], [class*="pager"], nav[aria-label*="pagination" i]');
    if (paginationSection) {
        const nextLink = paginationSection.querySelector('a:last-child, button:last-child');
        if (nextLink && !nextLink.disabled && nextLink.offsetHeight > 0) {
            console.log('Clicking next button via pagination section');
            nextLink.click();
            return true;
        }
    }

    console.log('Could not find next button');
    return false;
}
