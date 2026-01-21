import xml.etree.ElementTree as ET
import csv

# --- CONFIGURATION ---
INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'seo_audit.csv'

def extract_seo_data(xml_file):
    print(f"Auditing SEO data from {xml_file}...")
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except Exception as e:
        print(f"Error: {e}")
        return

    namespaces = {'wp': 'http://wordpress.org/export/1.2/'}
    
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Post Title', 'SEO Title', 'SEO Description', 'SEO Keywords'])
        
        channel = root.find('channel')
        
        for item in channel.findall('item'):
            post_type = item.find('wp:post_type', namespaces)
            if post_type is not None and post_type.text == 'post':
                title = item.find('title').text
                
                # Default values
                seo_title = ""
                seo_desc = ""
                seo_keywords = ""

                # Iterate over all meta keys for this post
                for meta in item.findall('wp:postmeta', namespaces):
                    key = meta.find('wp:meta_key', namespaces).text
                    val = meta.find('wp:meta_value', namespaces).text
                    
                    if key == '_aioseo_title':
                        seo_title = val
                    elif key == '_aioseo_description':
                        seo_desc = val
                    elif key == '_aioseo_keywords':
                        seo_keywords = val
                
                # Only write if we found at least one piece of SEO data or if it's a post
                writer.writerow([title, seo_title, seo_desc, seo_keywords])

    print(f"SEO Audit saved to '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    extract_seo_data(INPUT_FILENAME)