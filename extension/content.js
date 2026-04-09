/**
 * Content script for extracting agent data from Zillow Find an Agent page
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractAgents') {
        const agents = extractAgentLinksFromPage();
        sendResponse({ agents });
    } else if (request.action === 'extractPhone') {
        const data = extractPhoneFromProfile();
        sendResponse(data);
    }
});

/**
 * Extract agent links from the Find an Agent page
 */
function extractAgentLinksFromPage() {
    const agents = [];

    // Look for agent cards on the Find an Agent page
    // Usually they're in divs with agent info
    const agentCards = document.querySelectorAll('[class*="agent"], [class*="Agent"], .agent-card, [data-test*="agent"]');

    // More specific: look for clickable agent elements
    const allElements = document.querySelectorAll('a, div');

    allElements.forEach(el => {
        // Check if this element links to an agent profile
        const href = el.href || el.onclick?.toString() || '';

        if (href.includes('/profile/') || el.textContent.match(/Profile|View|Agent/i)) {
            const link = el.href || el.querySelector('a')?.href;
            const name = el.textContent?.trim() || el.querySelector('h1, h2, h3, span')?.textContent?.trim();

            if (link && name && link.includes('zillow.com')) {
                agents.push({
                    name: name.split('\n')[0], // Get first line only
                    link: link
                });
            }
        }
    });

    // Deduplicate by link
    const seen = new Set();
    return agents.filter(agent => {
        if (seen.has(agent.link)) return false;
        seen.add(agent.link);
        return agent.link && agent.name && agent.name.length > 2;
    }).slice(0, 100); // Limit to 100 to avoid too many
}

/**
 * Extract phone number and full name from agent's profile page
 */
function extractPhoneFromProfile() {
    // Get agent name from page
    const nameEl = document.querySelector('h1, [class*="name"], [data-test*="name"]') ||
                   document.querySelector('span[class*="Name"]');
    const fullName = nameEl?.textContent?.trim() || '';

    // Multiple strategies to find phone number

    // Strategy 1: Look for tel: links (most reliable)
    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
        const phone = telLink.href.replace('tel:', '').trim();
        if (phone) {
            const cleaned = cleanPhone(phone);
            if (cleaned) return { name: fullName, phone: cleaned };
        }
    }

    // Strategy 2: Look for data attributes
    const phoneElements = document.querySelectorAll(
        '[data-phone], [data-number], [phone], [class*="phone-number"], [class*="Phone"]'
    );

    for (const el of phoneElements) {
        const phone = el.getAttribute('data-phone') ||
                     el.getAttribute('data-number') ||
                     el.getAttribute('phone') ||
                     el.textContent;
        if (phone && isValidPhone(phone)) {
            const cleaned = cleanPhone(phone);
            if (cleaned) return { name: fullName, phone: cleaned };
        }
    }

    // Strategy 3: Look for "Call" or "Phone" buttons with contact info
    const contactButtons = document.querySelectorAll('button, a, span');
    for (const btn of contactButtons) {
        const text = btn.textContent;
        if (text && (text.includes('Call') || text.includes('Phone'))) {
            const parent = btn.closest('div, section');
            if (parent) {
                const phoneMatch = parent.innerText.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
                if (phoneMatch) {
                    return { name: fullName, phone: cleanPhone(phoneMatch[0]) };
                }
            }
        }
    }

    // Strategy 4: Regex search in visible text
    const pageText = document.body.innerText;
    const phonePatterns = [
        /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/,
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
        /\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    ];

    for (const pattern of phonePatterns) {
        const match = pageText.match(pattern);
        if (match) {
            return { name: fullName, phone: cleanPhone(match[0]) };
        }
    }

    // Strategy 5: Look in HTML source
    const htmlText = document.documentElement.innerHTML;
    for (const pattern of phonePatterns) {
        const match = htmlText.match(pattern);
        if (match) {
            return { name: fullName, phone: cleanPhone(match[0]) };
        }
    }

    return { name: fullName, phone: '' };
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
