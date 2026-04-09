# Zillow Agent Phone Scraper

Automated extraction of phone numbers from Zillow agent profiles.

## Quick Start

### 1. Prepare Your CSV
Your VA should export a CSV from Zillow with agent data, including a **"Zillow Link"** column pointing to each agent's profile page.

Example format (tab-separated):
```
Full Name	Zillow Link	Rating	Brokerage	...
John Smith	https://www.zillow.com/profile/john-smith	4.8	ABC Realty	...
Jane Doe	https://www.zillow.com/profile/jane-doe	4.9	XYZ Realty	...
```

### 2. Run the Scraper

Place `agents.csv` in this directory, then:

**On Mac/Linux:**
```bash
./run_scraper.sh
```

**On Windows:**
```bash
python3 scrape_phones.py
```

The script will:
- Read `agents.csv`
- Extract phone numbers from each Zillow profile
- Create `agents_with_phones.csv` with results
- Display a summary of extracted phones

### 3. Monitor Progress

Open `dashboard.html` in your web browser to see:
- Total agents processed
- Number of phones successfully extracted
- Extraction rate (percentage)
- Searchable table with all agent data
- Download button to export results

The dashboard auto-refreshes every 5 seconds to show live progress while scraping.

## Files Explained

| File | Purpose |
|------|---------|
| `scrape_phones.py` | Main scraper using Playwright browser automation |
| `run_scraper.sh` | Launcher script (Mac/Linux) - easier than running Python directly |
| `dashboard.html` | Web dashboard - open in browser to monitor progress |
| `agents.csv` | Input file - place your CSV here before running |
| `agents_with_phones.csv` | Output file - generated after scraping completes |

## Requirements

- Python 3.7+
- pandas
- playwright

### Install Dependencies

```bash
pip install pandas playwright
playwright install
```

## How It Works

1. **Playwright Browser Automation** - Loads each agent's Zillow profile in a headless Chrome browser
2. **Dynamic Content Loading** - Waits for JavaScript to render, scrolls to trigger lazy loading
3. **Pattern Matching** - Searches page content for phone numbers in various formats
4. **Data Aggregation** - Adds extracted phones to your original CSV

## Tips

- **First run:** Scraping 100+ agents may take 20-30 minutes depending on Zillow's loading times
- **Network:** Ensure stable internet connection - Zillow loads content dynamically
- **Browser:** Uses headless Chrome (installed automatically by Playwright)
- **Resume:** You can export partial results from the dashboard at any time

## Troubleshooting

**0 phones extracted?**
- Zillow may have updated their page layout
- Check one profile manually to see where the phone number appears
- Contact support with a screenshot of a profile page

**Script crashes?**
- Ensure `agents.csv` is properly formatted (tab-separated)
- Check that all agents have valid Zillow profile links
- Try with a small test batch (5-10 agents) first

**Slow extraction?**
- Normal - Zillow loads dynamically, takes 2-3 seconds per agent
- Parallel processing planned for future updates

## Support

For issues, check the Zillow profile pages manually to verify:
1. Phone numbers are visible when you load the page
2. They're in a consistent location
3. No authentication is required
