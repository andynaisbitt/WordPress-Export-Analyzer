import xml.etree.ElementTree as ET
import csv

INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'content_audit.csv'

def audit_content(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()
    namespaces = {'wp': 'http://wordpress.org/export/1.2/'}
    
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Title', 'Type', 'Status', 'Date'])
        
        for item in root.find('channel').findall('item'):
            title = item.find('title').text
            post_type = item.find('wp:post_type', namespaces).text
            status = item.find('wp:status', namespaces).text
            pub_date = item.find('pubDate').text
            
            # We filter out attachments/nav_items to keep the list clean
            if post_type in ['post', 'page']:
                writer.writerow([title, post_type, status, pub_date])

    print(f"Audit complete. Check '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    audit_content(INPUT_FILENAME)