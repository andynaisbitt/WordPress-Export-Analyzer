import xml.etree.ElementTree as ET
import csv
import os

# --- CONFIGURATION ---
# Replace this with your actual filename if it changes
INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'blog_posts_export.csv'

def extract_wordpress_data(xml_file, output_csv):
    print(f"Processing {xml_file}...")
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except FileNotFoundError:
        print(f"Error: The file '{xml_file}' was not found.")
        return
    except ET.ParseError:
        print("Error: Could not parse the XML file. It might be corrupted.")
        return

    # Define Namespaces used in WordPress XML
    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'content': 'http://purl.org/rss/1.0/modules/content/'
    }

    # Find the channel element
    channel = root.find('channel')
    if channel is None:
        print("Invalid XML: Could not find <channel> element.")
        return

    # Prepare CSV file
    with open(output_csv, mode='w', newline='', encoding='utf-8') as csv_file:
        writer = csv.writer(csv_file)
        # Header Row
        writer.writerow(['Title', 'Date', 'Author', 'Categories', 'Status', 'Link'])

        count = 0
        
        # Iterate through all items
        for item in channel.findall('item'):
            # specific WP tags require the namespace
            post_type_obj = item.find('wp:post_type', namespaces)
            post_type = post_type_obj.text if post_type_obj is not None else 'unknown'

            # We only want 'post' type (ignoring pages, attachments, nav_items)
            if post_type == 'post':
                # Extract Title
                title = item.find('title').text
                if title is None: title = "(No Title)"

                # Extract Link
                link = item.find('link').text
                if link is None: link = ""

                # Extract Date
                pub_date = item.find('pubDate').text
                
                # Extract Author
                creator = item.find('dc:creator', namespaces)
                author = creator.text if creator is not None else "Unknown"

                # Extract Status (publish, draft, etc)
                status_obj = item.find('wp:status', namespaces)
                status = status_obj.text if status_obj is not None else "unknown"

                # Extract Categories (filter out tags to keep it clean)
                categories = []
                for cat in item.findall('category'):
                    # The 'domain' attribute tells us if it's a category or tag
                    if cat.get('domain') == 'category':
                        if cat.text:
                            categories.append(cat.text)
                
                category_string = ", ".join(categories)

                # Write to CSV
                writer.writerow([title, pub_date, author, category_string, status, link])
                count += 1

    print(f"Success! Extracted {count} blog posts to '{output_csv}'.")

if __name__ == "__main__":
    extract_wordpress_data(INPUT_FILENAME, OUTPUT_FILENAME)