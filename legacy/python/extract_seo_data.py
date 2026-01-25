import xml.etree.ElementTree as ET
import csv

# --- CONFIGURATION ---
INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'seo_metadata_export.csv'

def extract_seo(xml_file):
    print(f"Extracting AIOSEO data from {xml_file}...")
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # WordPress XML Namespaces
    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'content': 'http://purl.org/rss/1.0/modules/content/'
    }
    
    data_rows = []

    channel = root.find('channel')
    
    for item in channel.findall('item'):
        post_type = item.find('wp:post_type', namespaces).text
        
        # We only care about published Posts and Pages
        if post_type in ['post', 'page']:
            title = item.find('title').text
            link = item.find('link').text
            
            # Default values
            seo_title = ""
            seo_desc = ""
            seo_keywords = ""
            
            # Search through the meta tags for AIOSEO keys
            for meta in item.findall('wp:postmeta', namespaces):
                key = meta.find('wp:meta_key', namespaces).text
                val = meta.find('wp:meta_value', namespaces).text
                
                if key == '_aioseo_title':
                    seo_title = val
                elif key == '_aioseo_description':
                    seo_desc = val
                elif key == '_aioseo_keywords':
                    seo_keywords = val

            # Only save if we found at least one SEO field
            if seo_title or seo_desc or seo_keywords:
                data_rows.append([title, post_type, seo_title, seo_desc, seo_keywords, link])

    # Save to CSV
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Post Title', 'Type', 'AIOSEO Title', 'AIOSEO Description', 'AIOSEO Keywords', 'Link'])
        writer.writerows(data_rows)

    print(f"Success! Found SEO data for {len(data_rows)} posts.")
    print(f"Saved to '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    extract_seo(INPUT_FILENAME)