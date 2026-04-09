#!/usr/bin/env python3
import pandas as pd
import asyncio
import re
from playwright.async_api import async_playwright
from pathlib import Path

async def extract_phone_number(page, url):
    """Extract phone number from a Zillow profile page"""
    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)

        # Wait for dynamic content and scroll to trigger lazy loading
        await page.wait_for_timeout(3000)

        # Scroll down multiple times to load all content
        for _ in range(3):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)

        # Try to click reveal/contact buttons to show phone
        button_selectors = [
            'button[class*="contact"]',
            'button[class*="phone"]',
            'button[class*="call"]',
            'a[class*="contact"]',
            '[aria-label*="contact" i]',
            '[aria-label*="phone" i]',
            'button:has-text("Contact")',
            'button:has-text("Call")',
            'button:has-text("Phone")',
        ]

        for selector in button_selectors:
            try:
                elements = await page.query_selector_all(selector)
                for element in elements:
                    try:
                        await element.click()
                        await page.wait_for_timeout(800)
                    except:
                        pass
            except:
                pass

        # Extract page content
        page_html = await page.content()
        page_text = await page.inner_text('body')

        # Try multiple extraction strategies

        # Strategy 1: Look for phone in data attributes
        data_attrs = await page.evaluate("""() => {
            const phones = new Set();
            document.querySelectorAll('[data-phone], [data-number], [phone], [data-contact]').forEach(el => {
                const text = el.getAttribute('data-phone') ||
                            el.getAttribute('data-number') ||
                            el.getAttribute('phone') ||
                            el.getAttribute('data-contact') ||
                            el.textContent;
                if(text && /\d{10}|\d{3}[-.]\d{3}[-.]\d{4}/.test(text)) {
                    phones.add(text.trim());
                }
            });
            return Array.from(phones);
        }""")

        if data_attrs and len(data_attrs) > 0:
            for attr in data_attrs:
                cleaned = clean_phone(attr)
                if cleaned:
                    return cleaned

        # Strategy 2: Look for tel: links
        tel_links = await page.evaluate("""() => {
            const phones = new Set();
            document.querySelectorAll('a[href^="tel:"]').forEach(link => {
                const phone = link.href.replace('tel:', '').trim();
                if(phone) phones.add(phone);
            });
            return Array.from(phones);
        }""")

        if tel_links and len(tel_links) > 0:
            for phone in tel_links:
                cleaned = clean_phone(phone)
                if cleaned:
                    return cleaned

        # Strategy 3: Regex patterns on HTML and text
        phone_patterns = [
            r'\+1?[-.\s]?\(?(?=\d{3}[-.\s)])\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # (XXX) XXX-XXXX format
            r'(?<!\d)\d{3}[-.]?\d{3}[-.]?\d{4}(?!\d)',  # XXX-XXX-XXXX
            r'tel:\s*\+?1?[-.\s]?\(?[\d\s\-\(\)\.]{9,}',  # tel: protocol
            r'\b(?:phone|call|contact)[\s:]*(\+?[\d\s\-\(\)\.]{10,})\b',  # after label
        ]

        for pattern in phone_patterns:
            matches = re.findall(pattern, page_html + '\n' + page_text, re.IGNORECASE)
            if matches:
                for match in matches:
                    cleaned = clean_phone(match)
                    if cleaned:
                        return cleaned

        return None
    except Exception as e:
        print(f"Error extracting phone from {url}: {e}")
        return None


def clean_phone(phone_str):
    """Clean and validate phone number string"""
    if not phone_str:
        return None

    # Remove common prefixes
    phone = re.sub(r'^tel:', '', phone_str).strip()

    # Extract just digits and common separators
    digits = re.findall(r'\d', phone)

    # Must have at least 10 digits (US phone numbers)
    if len(digits) >= 10:
        # Return first 10 digits in a standard format
        phone_digits = ''.join(digits[:10])
        # Format as (XXX) XXX-XXXX
        return f"({phone_digits[:3]}) {phone_digits[3:6]}-{phone_digits[6:10]}"

    return None

async def scrape_phones(csv_path):
    """Main scraper function"""
    # Read the CSV
    df = pd.read_csv(csv_path, sep='\t')

    print(f"Found {len(df)} agents to scrape")

    # Add phone number column
    phone_numbers = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        for idx, row in df.iterrows():
            url = row['Zillow Link']
            print(f"[{idx+1}/{len(df)}] Scraping {url}...")

            phone = await extract_phone_number(page, url)
            phone_numbers.append(phone if phone else "")

            print(f"  → Found: {phone if phone else 'No phone found'}")

        await browser.close()

    # Add the phone column to the far right
    df['Phone Number'] = phone_numbers

    # Save the updated CSV
    output_path = csv_path.replace('.csv', '_with_phones.csv')
    df.to_csv(output_path, sep='\t', index=False)

    print(f"\n✓ Done! Saved to: {output_path}")
    print(f"Successfully extracted: {sum(1 for p in phone_numbers if p)} phone numbers")

if __name__ == '__main__':
    csv_file = '/home/user/claude/agents.csv'
    asyncio.run(scrape_phones(csv_file))
