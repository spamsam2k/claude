# Zillow Agent Scraper Chrome Extension

A powerful Chrome extension that extracts agent data and phone numbers directly from Zillow search results.

## Features

✨ **Automatic Data Extraction**
- Extracts agent names, profiles links, brokerage, and ratings
- Auto-clicks "Next" to scan all pages of search results
- Deduplicates agents automatically

📞 **Phone Number Extraction**
- Automatically opens each agent's profile page
- Extracts phone numbers from profile pages
- Tries multiple detection strategies (tel: links, data attributes, regex patterns)
- Formats phone numbers consistently

📊 **Real-time Progress**
- Live stats: pages scanned, agents found, phones extracted
- Animated progress bar
- Current action display

📥 **Easy Export**
- Download results as CSV (tab-separated)
- Includes all agent info and extracted phones
- Filename includes date for easy organization

## Installation

### Developer Mode

1. Clone or download this folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select this `extension` folder
6. The extension will appear in your toolbar

### First Use

1. Go to [Zillow.com](https://www.zillow.com)
2. Search for homes in your target area
3. Click the **Zillow Agent Scraper** icon in your Chrome toolbar
4. Click **Start Extraction**
5. The extension will:
   - Extract all agents from the current page
   - Click "Next" to go to the next page
   - Repeat until all pages are processed
   - Open each agent's profile and extract their phone number
   - Show real-time progress

## How It Works

### Data Extraction Phase
- Scans the current search results page for agent information
- Clicks the "Next" button to move to the next page
- Collects agents from all pages
- Automatically deduplicates

### Phone Extraction Phase
- Opens each agent's profile page (in the background)
- Tries 4 strategies to extract phone numbers:
  1. Looks for `tel:` protocol links
  2. Searches for phone data attributes
  3. Uses regex patterns on visible text
  4. Searches HTML content

- Closes the tab and moves to the next agent
- Formats phone numbers as (XXX) XXX-XXXX

### CSV Export
- Downloads results with columns:
  - Full Name
  - Zillow Link
  - Phone Number
  - Brokerage
  - Rating

## Tips for Best Results

⏱️ **Timing**: Processing 50+ agents can take 10-15 minutes. The extension opens each profile to extract the phone number.

🌐 **Network**: Ensure you have a stable internet connection. Zillow profiles load dynamically.

🔍 **Search**: Start with a focused search (specific city/area) to get relevant results.

⏸️ **Stop**: You can click the Stop button at any time. Partial results can still be downloaded.

🔄 **Resume**: If extraction stops, you can start again. Results are cumulative.

## Troubleshooting

### "0 phones extracted"
- Zillow may have changed their page layout
- Some agent profiles may not have phone numbers visible
- Try checking one profile manually to see where the phone appears

### Extension not loading pages
- Check that you're on a Zillow search results page (url contains `/homes/for_sale/`)
- Try refreshing the page before starting extraction
- Check Chrome console for errors (right-click → Inspect)

### Extraction is very slow
- This is normal - the extension waits for each page to load fully
- Network speed affects extraction time
- ~15-30 seconds per agent is typical

### Some phones not found
- Not all agents have phone numbers visible on their profile
- Some may require interaction (clicking reveal buttons)
- The extension tries multiple detection strategies but some formats may be missed

## Data Privacy

This extension:
- Only accesses Zillow.com pages while you're using it
- Doesn't collect or send data anywhere
- Stores data only in your browser (deleted when you clear extension data)
- Has no tracking or analytics
- Runs entirely locally on your computer

## Updates & Support

To update the extension:
1. Download the latest version
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Zillow Scraper extension
4. Or unload and reload the extension from the updated folder

For issues:
- Check the Chrome developer console (right-click → Inspect → Console tab)
- Make sure you're on a Zillow search results page
- Try with a smaller search area first (10-20 agents) to test

## Features Coming Soon

🔜 Parallel phone extraction (faster processing)
🔜 Save progress between sessions
🔜 Filter/search extracted data before export
🔜 Direct upload to Google Sheets
🔜 Support for other real estate sites

---

Enjoy scraping! 🏠
