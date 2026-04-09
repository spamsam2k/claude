/**
 * Content script for extracting agent data from Zillow Find an Agent page
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractAgents') {
        const agents = extractAgentLinksFromPage(request.minDeals || 0);
        sendResponse({ agents });
    } else if (request.action === 'extractPhone') {
        const data = extractPhoneFromProfile();
        sendResponse(data);
    } else if (request.action === 'extractProfile') {
        const data = extractProfileData(request.fields || {});
        sendResponse(data);
    } else if (request.action === 'clickNext') {
        const success = clickNext();
        sendResponse({ success });
    } else if (request.action === 'hasNextPage') {
        const hasNext = detectNextPageButton();
        sendResponse({ hasNext });
    }
});

/**
 * Extract agent links and data from the Find an Agent page
 */
function extractAgentLinksFromPage(minDeals = 0) {
    const agents = [];
    const seen = new Set();

    // Look for agent profile links
    const profileLinks = document.querySelectorAll('a[href*="/profile/"]');

    profileLinks.forEach(link => {
        const href = link.href;
        const text = link.textContent.trim();

        if (href && text && !seen.has(href)) {
            // Find the agent card container
            const cardContainer = link.closest('[class*="agent"], div[class*="card"], article, section');

            if (cardContainer) {
                const agentData = extractAgentCardData(cardContainer, link, minDeals);

                if (agentData) {
                    agents.push(agentData);
                    seen.add(href);
                }
            }
        }
    });

    return agents;
}

/**
 * Extract all data from agent card
 */
function extractAgentCardData(cardContainer, link, minDeals) {
    const href = link.href;
    const text = link.textContent.trim().split('\n')[0];

    if (!href.includes('zillow.com') || text.length < 2) {
        return null;
    }

    // Extract deals number (matches "team sales" or just "sales")
    const dealsMatch = cardContainer.innerText.match(/(\d+)\s*(?:team\s+)?sales last 12 months/i);
    const deals = dealsMatch ? parseInt(dealsMatch[1]) : 0;

    // Filter by minimum deals
    if (deals < minDeals) {
        return null;
    }

    // Extract brokerage name
    const brokerageMatch = cardContainer.innerText.match(/([A-Z][^-\n]*(?:Realty|Real Estate|Broker|Agency)[^-\n]*?)(?:\n|$|team|sales|price)/i);
    const brokerage = brokerageMatch ? brokerageMatch[1].trim() : '';

    return {
        name: text,
        link: href,
        brokerage: brokerage,
        teamSales: deals,
        phone: '',
        email: '',
        bio: '',
        experience: '',
        totalSales: ''
    };
}

/**
 * Extract profile data from agent's profile page
 */
function extractProfileData(fields) {
    const data = {
        name: '',
        phone: '',
        email: '',
        brokerage: '',
        bio: '',
        experience: '',
        totalSales: ''
    };

    // Extract name
    const nameEl = document.querySelector('h1, [class*="name"], [data-test*="name"]');
    if (nameEl) {
        data.name = nameEl.textContent.trim().split('\n')[0];
    }

    // Extract phone
    if (fields.phone !== false) {
        data.phone = extractPhone();
    }

    // Extract email
    if (fields.email !== false) {
        data.email = extractEmail();
    }

    // Extract brokerage
    if (fields.brokerage !== false) {
        data.brokerage = extractBrokerage();
    }

    // Extract bio
    if (fields.bio !== false) {
        data.bio = extractBio();
    }

    // Extract experience
    if (fields.experience !== false) {
        data.experience = extractExperience();
    }

    // Extract total sales
    if (fields.totalSales !== false) {
        data.totalSales = extractTotalSales();
    }

    return data;
}

/**
 * Extract phone number
 */
function extractPhone() {
    // Strategy 1: tel: link
    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
        return cleanPhone(telLink.href.replace('tel:', ''));
    }

    // Strategy 2: Look in page text
    const pageText = document.body.innerText;
    const phoneMatch = pageText.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    if (phoneMatch) {
        return cleanPhone(phoneMatch[0]);
    }

    return '';
}

/**
 * Extract email address
 */
function extractEmail() {
    // Strategy 1: Look for mailto links
    const mailtoLink = document.querySelector('a[href^="mailto:"]');
    if (mailtoLink) {
        return mailtoLink.href.replace('mailto:', '').trim();
    }

    // Strategy 2: Regex in page text
    const emailMatch = document.body.innerText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
        return emailMatch[1];
    }

    return '';
}

/**
 * Extract brokerage name
 */
function extractBrokerage() {
    // Look for brokerage text on the page
    const pageText = document.body.innerText;

    // Common patterns
    const patterns = [
        /(?:Brokerage|Brokered by|Licensed with):\s*([^\n]+)/i,
        /\b([A-Z][^-\n]*(?:Realty|Real Estate|Broker|Agency)[^-\n]*?)\s*$/m
    ];

    for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return '';
}

/**
 * Extract bio/description
 */
function extractBio() {
    // Look for bio section
    const bioElements = document.querySelectorAll('[class*="bio"], [class*="about"], [class*="description"]');

    for (const el of bioElements) {
        const text = el.innerText.trim();
        if (text.length > 20) {
            return text.substring(0, 500); // Limit to 500 chars
        }
    }

    // Try looking for text after "About" heading
    const aboutMatch = document.body.innerText.match(/About[\s\n]+([^About]*?)(?=Years|Experience|Total|$)/i);
    if (aboutMatch) {
        return aboutMatch[1].trim().substring(0, 500);
    }

    return '';
}

/**
 * Extract years of experience
 */
function extractExperience() {
    const pageText = document.body.innerText;

    // Look for experience mentions
    const patterns = [
        /(\d+)\s*(?:years?|yrs?)?\s*(?:of\s+)?(?:real\s+)?estate\s+experience/i,
        /experience:\s*(\d+)\s*(?:years?|yrs?)/i,
        /since\s+(\d{4})/i
    ];

    for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return '';
}

/**
 * Extract total sales
 */
function extractTotalSales() {
    const pageText = document.body.innerText;

    // Look for total sales numbers
    const patterns = [
        /total sales?\s*(?::|in\s+)?(?:of\s+)?([0-9,]+)(?:\s+(?:homes?|properties))?/i,
        /(\d+)\s+total\s+(?:homes?|properties)\s+sold/i,
        /sales in [^:]+:\s*([0-9,]+)/i
    ];

    for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
            return match[1].replace(/,/g, '');
        }
    }

    return '';
}

/**
 * Click the Next button to go to the next page
 */
function clickNext() {
    const nextButton = findNextButton();
    if (nextButton) {
        nextButton.click();
        return true;
    }
    return false;
}

/**
 * Find the Next page button
 */
function findNextButton() {
    const selectors = [
        'a[aria-label*="Next"]',
        'button[aria-label*="Next"]',
        'a[rel="next"]',
        '[class*="next"]',
        'button:contains("Next")'
    ];

    for (const selector of selectors) {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
            return button;
        }
    }

    // Fallback: look for pagination buttons
    const allButtons = document.querySelectorAll('a, button');
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('next') && !btn.disabled) {
            return btn;
        }
    }

    return null;
}

/**
 * Detect if next page button exists
 */
function detectNextPageButton() {
    return findNextButton() !== null;
}

/**
 * Clean and validate phone number
 */
function cleanPhone(phone) {
    if (!phone) return '';

    phone = phone.replace(/^tel:/, '').trim();
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 10) return '';

    const match = digits.match(/(\d{3})(\d{3})(\d{4})/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    return phone;
}
