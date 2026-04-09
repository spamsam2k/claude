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

        # Wait a bit for any dynamic content to load
        await page.wait_for_timeout(2000)

        # Get all text from the page
        page_text = await page.content()

        # Look for phone number patterns (xxx) xxx-xxxx or xxx-xxx-xxxx
        phone_patterns = [
            r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',  # (123) 456-7890
            r'\d{3}[-.]?\d{3}[-.]?\d{4}',     # 123-456-7890 or 123.456.7890
        ]

        for pattern in phone_patterns:
            matches = re.findall(pattern, page_text)
            if matches:
                return matches[0]

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
