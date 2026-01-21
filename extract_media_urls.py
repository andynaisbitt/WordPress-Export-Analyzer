import xml.etree.ElementTree as ET
import csv

INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'media_library_list.csv'

def extract_media(xml_file):
    print(f"Extracting media list...")
    tree = ET.parse(xml_file)
    root = tree.getroot()
    namespaces = {'wp': 'http://wordpress.org/export/1.2/'}
    
    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Filename', 'File Type', 'Upload Date', 'Original URL'])
        
        count = 0
        for item in root.find('channel').findall('item'):
            post_type = item.find('wp:post_type', namespaces).text
            
            # We are looking for attachments specifically
            if post_type == 'attachment':
                title = item.find('title').text
                pub_date = item.find('pubDate').text
                
                # The URL is usually in <wp:attachment_url>
                att_url_obj = item.find('wp:attachment_url', namespaces)
                url = att_url_obj.text if att_url_obj is not None else "No URL Found"
                
                # Guess file type from URL extension
                file_type = url.split('.')[-1] if '.' in url else "Unknown"

                writer.writerow([title, file_type, pub_date, url])
                count += 1

    print(f"Found {count} media files. List saved to '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    extract_media(INPUT_FILENAME)