#!/usr/bin/env python3
"""
Script to extract historical cash data from Google Sheets and generate SQL import script.
The sheet is publicly accessible, so we can use the CSV export URL.
"""

import csv
import urllib.request
import json

# Google Sheets ID
SHEET_ID = "1xI8hkvxzFxJJQx0r1CtgK_Z-XnFucgPRqSYc0cD-T6o"

# Sheet GIDs for each year (we'll need to extract these from the sheet)
# We'll start by extracting data from the "Graficas" sheet which has aggregated data

def download_sheet_as_csv(sheet_id, gid):
    """Download a Google Sheet as CSV"""
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    with urllib.request.urlopen(url) as response:
        content = response.read().decode('utf-8')
    return content

def parse_graficas_sheet():
    """
    Parse the Graficas sheet to extract monthly data for each year.
    This sheet contains the aggregated historical data we need.
    """
    # GID for "Graficas" sheet (first sheet, usually gid=0 or we need to find it)
    # Let's try gid=759544491 based on the URL we saw earlier
    gid = "759544491"
    
    print(f"Downloading Graficas sheet...")
    csv_content = download_sheet_as_csv(SHEET_ID, gid)
    
    # Save to file for inspection
    with open('/tmp/graficas_raw.csv', 'w') as f:
        f.write(csv_content)
    
    print("Graficas sheet saved to /tmp/graficas_raw.csv")
    print("First 50 lines:")
    lines = csv_content.split('\n')
    for i, line in enumerate(lines[:50]):
        print(f"{i+1}: {line}")

if __name__ == "__main__":
    parse_graficas_sheet()
