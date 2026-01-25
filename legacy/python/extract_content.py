import xml.etree.ElementTree as ET
import os
import re

# --- CONFIGURATION ---
INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
POSTS_FOLDER = 'all_blog_posts'
PAGES_FOLDER = 'all_pages'

def sanitize_filename(title):
    # Removes characters that are illegal in filenames (like / : * ? " < > |)
    clean_name = re.sub(r'[\\/*?:"<>|]', "", title)
    return clean_name.strip()[:100]  # Limit length to 100 chars to avoid errors

def extract_content(xml_file):
    print(f"Reading {xml_file}...")
    
    # Create output folders if they don't exist
    if not os.path.exists(POSTS_FOLDER):
        os.makedirs(POSTS_FOLDER)
    if not os.path.exists(PAGES_FOLDER):
        os.makedirs(PAGES_FOLDER)

    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except Exception as e:
        print(f"Error reading XML: {e}")
        return

    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'content': 'http://purl.org/rss/1.0/modules/content/'
    }

    channel = root.find('channel')
    
    post_count = 0
    page_count = 0

    for item in channel.findall('item'):
        title = item.find('title').text
        if not title:
            title = "Untitled"
            
        # Determine if it is a Post or a Page
        post_type_obj = item.find('wp:post_type', namespaces)
        post_type = post_type_obj.text if post_type_obj is not None else 'unknown'

        # Get the full body content
        content_obj = item.find('content:encoded', namespaces)
        body_content = content_obj.text if content_obj is not None else ""

        if body_content is None: 
            body_content = ""

        # Prepare filename
        safe_filename = sanitize_filename(title) + ".html" # saving as .html preserves formatting tags

        if post_type == 'post':
            # Save to Posts Folder
            with open(os.path.join(POSTS_FOLDER, safe_filename), 'w', encoding='utf-8') as f:
                f.write(f"<h1>{title}</h1>\n\n")
                f.write(body_content)
            post_count += 1
            
        elif post_type == 'page':
            # Save to Pages Folder
            with open(os.path.join(PAGES_FOLDER, safe_filename), 'w', encoding='utf-8') as f:
                f.write(f"<h1>{title}</h1>\n\n")
                f.write(body_content)
            page_count += 1

    print("-" * 30)
    print(f"Done! Extracted {post_count} posts into '/{POSTS_FOLDER}'")
    print(f"Done! Extracted {page_count} pages into '/{PAGES_FOLDER}'")

if __name__ == "__main__":
    extract_content(INPUT_FILENAME)