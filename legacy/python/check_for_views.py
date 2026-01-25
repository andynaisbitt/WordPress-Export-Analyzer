import xml.etree.ElementTree as ET
from collections import Counter

INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'

def find_possible_view_keys(xml_file):
    print(f"Scanning {xml_file} for hidden view stats...")
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except Exception as e:
        print(f"Error: {e}")
        return

    namespaces = {'wp': 'http://wordpress.org/export/1.2/'}
    
    # We will count how many times each key appears
    meta_keys_found = Counter()
    
    for item in root.find('channel').findall('item'):
        for meta in item.findall('wp:postmeta', namespaces):
            key = meta.find('wp:meta_key', namespaces).text
            if key:
                # We are looking for specific keywords that suggest analytics
                if any(x in key.lower() for x in ['view', 'count', 'visit', 'hit', 'stats']):
                    meta_keys_found[key] += 1

    print("-" * 40)
    if not meta_keys_found:
        print("RESULT: No view-count data found in this file.")
        print("This means your view stats were likely stored in Google Analytics")
        print("or a plugin that didn't export its data to this XML.")
    else:
        print("RESULT: Potential view data found!")
        print("Here are the keys (and how many posts have them):")
        for key, count in meta_keys_found.most_common():
            print(f" - {key}: found in {count} posts")
            
        print("\nIf you see a key like 'post_views_count', we can extract it!")

if __name__ == "__main__":
    find_possible_view_keys(INPUT_FILENAME)