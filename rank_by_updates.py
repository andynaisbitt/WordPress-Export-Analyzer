import xml.etree.ElementTree as ET
import csv
from datetime import datetime

INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'posts_by_last_updated.csv'

def rank_by_updates(xml_file):
    print("Checking for updated content...")
    tree = ET.parse(xml_file)
    root = tree.getroot()
    namespaces = {'wp': 'http://wordpress.org/export/1.2/'}
    
    data = []
    
    for item in root.find('channel').findall('item'):
        post_type = item.find('wp:post_type', namespaces).text
        if post_type == 'post':
            title = item.find('title').text
            
            # Get Dates
            pub_date_str = item.find('pubDate').text
            post_date_str = item.find('wp:post_date', namespaces).text
            mod_date_str = item.find('wp:post_modified', namespaces).text
            
            # Calculate difference (Requires parsing dates, simplistic check here)
            # We will just export the raw dates so you can sort in Excel
            
            status = item.find('wp:status', namespaces).text
            if status == 'publish':
                data.append([title, post_date_str, mod_date_str])

    # Save to CSV
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Title', 'Original Publish Date', 'Last Modified Date'])
        writer.writerows(data)

    print(f"Done! Open '{OUTPUT_FILENAME}' and sort by 'Last Modified Date' to see what you worked on most recently.")

if __name__ == "__main__":
    rank_by_updates(INPUT_FILENAME)