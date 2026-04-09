/**
 * Content script for extracting agent data from Zillow search results
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractAgents') {
        const agents = extractAgentsFromPage();
        sendResponse({ agents });
    } else if (request.action === 'clickNext') {
        clickNext();
        sendResponse({ success: true });
    } else if (request.action === 'extractPhone') {
        const phone = extractPhoneFromProfile();
        sendResponse({ phone });
    }
});

/**
 * Extract agent data from current search results page
 */
function extractAgentsFromPage() {
    const agents = [];

    // Look for agent cards in the search results
    // Zillow uses various selectors for agent info
    const agentCards = document.querySelectorAll(
        '[data-test="agentCardCell"], .agent-card, [class*="agentCard"]'
    );

    // If no cards found, try alternative selectors
    if (agentCards.length === 0) {
        // Look for all listings and check if they have agent info
        const listings = document.querySelectorAll(
            '[data-test*="listing"], [class*="listing-card"], article'
        );

        listings.forEach(listing => {
            const agentData = extractAgentFromListing(listing);
            if (agentData && agentData.name) {
                agents.push(agentData);
            }
        });
    } else {
        agentCards.forEach(card => {
            const agentData = extractAgentFromCard(card);
            if (agentData && agentData.name) {
                agents.push(agentData);
            }
        });
    }

    // Deduplicate by name + link
    const seen = new Set();
    return agents.filter(agent => {
        const key = `${agent.name}|${agent.link}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Extract agent info from a card element
 */
function extractAgentFromCard(card) {
    try {
        const nameEl = card.querySelector(
            '[class*="agentName"], [data-test*="agent"], a[href*="/profile/"]'
        );
        const linkEl = card.querySelector('a[href*="/profile/"]');
        const brokerageEl = card.querySelector('[class*="brokerage"]');
        const ratingEl = card.querySelector('[class*="rating"]');

        if (!nameEl || !linkEl) return null;

        return {
            name: (nameEl.textContent || '').trim(),
            link: linkEl.href || '',
            brokerage: (brokerageEl?.textContent || '').trim(),
            rating: (ratingEl?.textContent || '').trim(),
            phone: ''
        };
    } catch (e) {
        return null;
    }
}

/**
 * Extract agent info from a listing element
 */
function extractAgentFromListing(listing) {
    try {
        // Look for agent-related elements
        const agentLink = listing.querySelector('a[href*="/profile/"]');
        if (!agentLink) return null;

        const agentName = agentLink.textContent.trim();
        const agentUrl = agentLink.href;

        // Try to find additional agent info nearby
        const brokerageEl = listing.querySelector('[class*="brokerage"]') ||
                           listing.querySelector('span:contains("Brokerage")');

        return {
            name: agentName,
            link: agentUrl,
            brokerage: (brokerageEl?.textContent || '').trim(),
            rating: '',
            phone: ''
        };
    } catch (e) {
        return null;
    }
}

/**
 * Click the "Next" button to go to the next page of results
 */
function clickNext() {
    // Try various selectors for the Next button
    const nextSelectors = [
        'a[aria-label*="Next"]',
        'button[aria-label*="Next"]',
        'a[rel="next"]',
        '[class*="next-page"]',
        'a:contains("Next")',
        'button:contains("Next")'
    ];

    for (const selector of nextSelectors) {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
            button.click();
            return;
        }
    }

    // Fallback: look for pagination links
    const paginationLinks = document.querySelectorAll('a, button');
    for (const link of paginationLinks) {
        if ((link.textContent.includes('Next') || link.getAttribute('aria-label')?.includes('Next')) && !link.disabled) {
            link.click();
            return;
        }
    }
}

/**
 * Extract phone number from an agent's profile page
 */
function extractPhoneFromProfile() {
    // Multiple strategies to find phone number

    // Strategy 1: Look for tel: links
    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
        const phone = telLink.href.replace('tel:', '').trim();
        if (phone) return cleanPhone(phone);
    }

    // Strategy 2: Look for data attributes
    const phoneElements = document.querySelectorAll(
        '[data-phone], [data-number], [phone], [class*="phone-number"]'
    );

    for (const el of phoneElements) {
        const phone = el.getAttribute('data-phone') ||
                     el.getAttribute('data-number') ||
                     el.getAttribute('phone') ||
                     el.textContent;
        if (phone && isValidPhone(phone)) {
            return cleanPhone(phone);
        }
    }

    // Strategy 3: Regex search in page text
    const pageText = document.body.innerText;
    const phonePatterns = [
        /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/,
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
        /\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    ];

    for (const pattern of phonePatterns) {
        const match = pageText.match(pattern);
        if (match) {
            return cleanPhone(match[0]);
        }
    }

    // Strategy 4: Look in HTML for phone patterns
    const htmlText = document.documentElement.innerHTML;
    for (const pattern of phonePatterns) {
        const match = htmlText.match(pattern);
        if (match) {
            return cleanPhone(match[0]);
        }
    }

    return '';
}

/**
 * Clean and validate phone number
 */
function cleanPhone(phone) {
    if (!phone) return '';

    // Remove tel: prefix
    phone = phone.replace(/^tel:/, '').trim();

    // Extract digits
    const digits = phone.replace(/\D/g, '');

    // Must be 10+ digits (for US)
    if (digits.length < 10) return '';

    // Format as (XXX) XXX-XXXX
    const match = digits.match(/(\d{3})(\d{3})(\d{4})/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    return phone;
}

/**
 * Check if string looks like a phone number
 */
function isValidPhone(str) {
    if (!str) return false;
    const digits = str.replace(/\D/g, '');
    return digits.length >= 10;
}
