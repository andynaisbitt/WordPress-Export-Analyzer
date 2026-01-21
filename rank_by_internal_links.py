import xml.etree.ElementTree as ET
import csv
import re
from urllib.parse import urlparse

# --- CONFIGURATION ---
INPUT_FILENAME = 'theitapprentice.WordPress.2024-08-17.xml'
OUTPUT_FILENAME = 'posts_ranked_by_internal_links.csv'
YOUR_DOMAIN = 'theitapprentice.com'  # Used to filter external links

def normalize_url(url):
    """Strips http/https and trailing slashes to make matching easier"""
    if not url: return ""
    parsed = urlparse(url)
    # We only care about the path (e.g., /tutorials/git-gitlab/)
    path = parsed.path.strip("/")
    return path

def rank_internal_links(xml_file):
    print(f"Calculating Internal PageRank...")
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except Exception as e:
        print(f"Error: {e}")
        return

    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'content': 'http://purl.org/rss/1.0/modules/content/'
    }
    
    # Step 1: Build a map of { URL_Path : Post_Title }
    # This lets us know that "/tutorials/git/" belongs to "Git Guide"
    url_map = {}
    
    items = root.find('channel').findall('item')
    
    for item in items:
        post_type = item.find('wp:post_type', namespaces).text
        if post_type in ['post', 'page']:
            title = item.find('title').text
            link = item.find('link').text
            if link:
                path = normalize_url(link)
                url_map[path] = {'title': title, 'count': 0, 'full_link': link}

    print(f"Indexed {len(url_map)} posts/pages for linking.")

    # Step 2: Scan Content for Links
    # Regex to find href="..."
    link_pattern = re.compile(r'href=["\']([^"\']+)["\']')

    for item in items:
        content_obj = item.find('content:encoded', namespaces)
        if content_obj is not None and content_obj.text:
            found_links = link_pattern.findall(content_obj.text)
            
            for found_link in found_links:
                # Check if it's an internal link
                if YOUR_DOMAIN in found_link:
                    found_path = normalize_url(found_link)
                    
                    # If this link path matches one of our posts, score it!
                    if found_path in url_map:
                        url_map[found_path]['count'] += 1

    # Step 3: Sort and Export
    # Convert dict to list
    ranked_posts = []
    for path, data in url_map.items():
        # Only include if it has at least 1 backlink
        if data['count'] > 0:
            ranked_posts.append((data['title'], data['count'], data['full_link']))

    # Sort by Count (Highest first)
    ranked_posts.sort(key=lambda x: x[1], reverse=True)

    with open(OUTPUT_FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Post Title', 'Internal Backlinks', 'Link'])
        writer.writerows(ranked_posts)

    print(f"Done! Check '{OUTPUT_FILENAME}'. The top posts are your 'Cornerstone Content'.")

if __name__ == "__main__":
    rank_internal_links(INPUT_FILENAME)