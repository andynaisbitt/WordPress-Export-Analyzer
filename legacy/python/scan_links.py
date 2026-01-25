import xml.etree.ElementTree as ET
import csv
import re

INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'external_links_audit.csv'

def scan_links(xml_file):
    print("Scanning posts for external links...")
    tree = ET.parse(xml_file)
    root = tree.getroot()
    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'content': 'http://purl.org/rss/1.0/modules/content/'
    }
    
    # Regex to find href="http..."
    link_pattern = re.compile(r'href=["\'](http[s]?://[^"\']+)["\']')
    
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Source Post', 'Linked URL'])
        
        link_count = 0
        
        for item in root.find('channel').findall('item'):
            post_type = item.find('wp:post_type', namespaces)
            if post_type is not None and post_type.text == 'post':
                title = item.find('title').text
                content = item.find('content:encoded', namespaces).text
                
                if content:
                    # Find all links in the content
                    found_links = link_pattern.findall(content)
                    for link in found_links:
                        # Optional: Exclude your own domain if you want only external links
                        if "theitapprentice.com" not in link:
                            writer.writerow([title, link])
                            link_count += 1

    print(f"Found {link_count} external links. Saved to '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    scan_links(INPUT_FILENAME)