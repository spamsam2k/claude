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

        # Scroll down to load more content
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)

        # Look for contact button or phone reveal elements
        try:
            # Try to find and click "Contact Agent" or similar buttons
            contact_buttons = await page.query_selector_all('[class*="contact"], [class*="phone"], [class*="call"]')
            for button in contact_buttons:
                try:
                    await button.click()
                    await page.wait_for_timeout(1000)
                except:
                    pass
        except:
            pass

        # Get all text from the page (including data attributes)
        page_text = await page.content()

        # Look for phone number patterns - expanded patterns
        phone_patterns = [
            r'\b\(?\d{3}\)?\s*[-.]?\s*\d{3}\s*[-.]?\s*\d{4}\b',  # Various formats
            r'\+1?\s*\(?\d{3}\)?\s*[-.]?\s*\d{3}\s*[-.]?\s*\d{4}',  # With country code
            r'tel:[\s]*(\+?[\d\s\-\(\)]{10,})',  # tel: protocol
        ]

        for pattern in phone_patterns:
            matches = re.findall(pattern, page_text)
            if matches:
                # Clean up the match
                phone = matches[0].strip()
                if phone.startswith('tel:'):
                    phone = phone[4:].strip()
                # Only return if it looks like a valid phone
                if re.search(r'\d{3}.*\d{3}.*\d{4}', phone):
                    return phone

        return None
    except Exception as e:
        print(f"Error extracting phone from {url}: {e}")
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
