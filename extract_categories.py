import xml.etree.ElementTree as ET
import csv
from collections import Counter

INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'category_stats.csv'

def analyze_categories(xml_file):
    print(f"Analyzing categories in {xml_file}...")
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except Exception as e:
        print(f"Error: {e}")
        return

    channel = root.find('channel')
    category_counter = Counter()

    for item in channel.findall('item'):
        # Only count actual posts, not pages or attachments
        post_type = item.find('wp:post_type', {'wp': 'http://wordpress.org/export/1.2/'}).text
        if post_type == 'post':
            for cat in item.findall('category'):
                # Ensure it's a category, not a tag
                if cat.get('domain') == 'category':
                    category_counter[cat.text] += 1

    # Write to CSV
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Category Name', 'Post Count']) # Header
        
        # Sort by count (highest first)
        for category, count in category_counter.most_common():
            writer.writerow([category, count])

    print(f"Success! Category stats saved to '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    analyze_categories(INPUT_FILENAME)
    