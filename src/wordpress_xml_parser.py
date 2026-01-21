import xml.etree.ElementTree as ET
import os
import re
import sqlite3
from urllib.parse import urlparse

# --- XML Namespaces ---
NAMESPACES = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/rss/1.0/modules/excerpt/',
    'dc': 'http://purl.org/dc/elements/1.1/',
}

def register_all_namespaces(filename):
    """Register namespaces found in the XML to handle them gracefully."""
    for event, elem in ET.iterparse(filename, events=('start-ns',)):
        prefix, uri = elem
        NAMESPACES[prefix] = uri
    # Add any missing standard ones
    if 'wp' not in NAMESPACES:
        NAMESPACES['wp'] = 'http://wordpress.org/export/1.2/'
    if 'content' not in NAMESPACES:
        NAMESPACES['content'] = 'http://purl.org/rss/1.0/modules/content/'
    if 'excerpt' not in NAMESPACES:
        NAMESPACES['excerpt'] = 'http://wordpress.org/rss/1.0/modules/excerpt/'
    if 'dc' not in NAMESPACES:
        NAMESPACES['dc'] = 'http://purl.org/dc/elements/1.1/'

def get_tag_text(element, tag_name, namespace_prefix=''):
    """Helper to get text from a tag, handling namespaces and CDATA."""
    full_tag = f"{{{NAMESPACES.get(namespace_prefix, '')}}}{tag_name}"
    node = element.find(full_tag)
    if node is not None and node.text:
        return node.text.strip()
    return None

def get_wp_tag_text(element, tag_name):
    """Helper for WordPress specific tags."""
    return get_tag_text(element, tag_name, 'wp')

def normalize_url_path(url):
    """Strips http/https and trailing slashes to make matching easier for internal links"""
    if not url: return ""
    parsed = urlparse(url)
    # We only care about the path (e.g., /tutorials/git-gitlab/)
    path = parsed.path.strip("/")
    return path

def parse_wordpress_xml(xml_file, db_name, your_domain):
    """
    Parses the WordPress WXR XML file and stores extracted data into an SQLite database.
    Includes SEO data, external links, and internal link counts.
    """
    print(f"Parsing XML file: {xml_file} and storing data into {db_name}")

    # Register namespaces dynamically from the file
    register_all_namespaces(xml_file)

    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # --- Create Tables ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS authors (
            author_id INTEGER PRIMARY KEY,
            login TEXT,
            email TEXT,
            display_name TEXT,
            first_name TEXT,
            last_name TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            term_id INTEGER PRIMARY KEY,
            nicename TEXT,
            parent TEXT,
            name TEXT,
            description TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            term_id INTEGER PRIMARY KEY,
            nicename TEXT,
            name TEXT,
            description TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            post_id INTEGER PRIMARY KEY,
            title TEXT,
            link TEXT,
            pub_date TEXT,
            creator TEXT,
            guid TEXT,
            description TEXT,
            content_encoded TEXT,
            excerpt_encoded TEXT,
            post_date TEXT,
            post_date_gmt TEXT,
            comment_status TEXT,
            ping_status TEXT,
            post_name TEXT,
            status TEXT,
            post_parent INTEGER,
            menu_order INTEGER,
            post_type TEXT,
            post_mime_type TEXT,
            comment_count INTEGER,
            cleaned_html_source TEXT,
            seo_title TEXT,
            seo_description TEXT,
            seo_keywords TEXT,
            internal_backlink_count INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_categories (
            post_id INTEGER,
            category_term_id INTEGER,
            FOREIGN KEY (post_id) REFERENCES posts(post_id),
            FOREIGN KEY (category_term_id) REFERENCES categories(term_id),
            PRIMARY KEY (post_id, category_term_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_tags (
            post_id INTEGER,
            tag_term_id INTEGER,
            FOREIGN KEY (post_id) REFERENCES posts(post_id),
            FOREIGN KEY (tag_term_id) REFERENCES tags(term_id),
            PRIMARY KEY (post_id, tag_term_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_meta (
            meta_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            meta_key TEXT,
            meta_value TEXT,
            FOREIGN KEY (post_id) REFERENCES posts(post_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            comment_id INTEGER PRIMARY KEY,
            post_id INTEGER,
            comment_author TEXT,
            comment_author_email TEXT,
            comment_author_url TEXT,
            comment_author_ip TEXT,
            comment_date TEXT,
            comment_date_gmt TEXT,
            comment_content TEXT,
            comment_approved TEXT,
            comment_type TEXT,
            comment_parent INTEGER,
            comment_user_id INTEGER,
            FOREIGN KEY (post_id) REFERENCES posts(post_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS external_links (
            link_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_post_id INTEGER,
            source_post_title TEXT,
            linked_url TEXT,
            FOREIGN KEY (source_post_id) REFERENCES posts(post_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS site_info (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    conn.commit()

    tree = ET.parse(xml_file)
    root = tree.getroot()
    channel = root.find('channel')

    # --- Site Info Extraction ---
    site_title = get_tag_text(channel, 'title')
    site_description = get_tag_text(channel, 'description')
    
    cursor.execute('INSERT OR REPLACE INTO site_info (key, value) VALUES (?, ?)', ('title', site_title))
    cursor.execute('INSERT OR REPLACE INTO site_info (key, value) VALUES (?, ?)', ('description', site_description))
    
    # --- Plugin Info ---
    # Attempt to find the active_plugins meta value, which is often stored in a specific way
    cursor.execute("DELETE FROM site_info WHERE key LIKE 'plugin_%'") # Clear old plugin data
    
    # Heuristic: Find a wp_options-like structure if it exists
    # This part is highly dependent on the export format and might need adjustment
    # For now, we will add a placeholder for active plugins
    active_plugins_list = "Placeholder: Could not determine active plugins from this XML."
    cursor.execute('INSERT OR REPLACE INTO site_info (key, value) VALUES (?, ?)', ('active_plugins', active_plugins_list))


    # --- Parse Authors ---
    print("Extracting Authors...")
    for author_node in channel.findall('wp:author', NAMESPACES):
        author = {
            'author_id': int(get_wp_tag_text(author_node, 'author_id')),
            'login': get_wp_tag_text(author_node, 'author_login'),
            'email': get_wp_tag_text(author_node, 'author_email'),
            'display_name': get_wp_tag_text(author_node, 'author_display_name'),
            'first_name': get_wp_tag_text(author_node, 'author_first_name'),
            'last_name': get_wp_tag_text(author_node, 'author_last_name'),
        }
        cursor.execute('''
            INSERT OR IGNORE INTO authors (author_id, login, email, display_name, first_name, last_name)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (author['author_id'], author['login'], author['email'], author['display_name'], author['first_name'], author['last_name']))
    conn.commit()

    # --- Parse Categories ---
    print("Extracting Categories...")
    for cat_node in channel.findall('wp:category', NAMESPACES):
        category = {
            'term_id': int(get_wp_tag_text(cat_node, 'term_id')),
            'nicename': get_wp_tag_text(cat_node, 'category_nicename'),
            'parent': get_wp_tag_text(cat_node, 'category_parent'),
            'name': get_wp_tag_text(cat_node, 'cat_name'),
            'description': get_wp_tag_text(cat_node, 'category_description'),
        }
        cursor.execute('''
            INSERT OR IGNORE INTO categories (term_id, nicename, parent, name, description)
            VALUES (?, ?, ?, ?, ?)
        ''', (category['term_id'], category['nicename'], category['parent'], category['name'], category['description']))
    conn.commit()

    # --- Parse Tags ---
    print("Extracting Tags...")
    for tag_node in channel.findall('wp:tag', NAMESPACES):
        # Be more robust in finding the nicename/slug
        nicename = get_wp_tag_text(tag_node, 'tag_nicename')
        if not nicename:
            nicename = get_wp_tag_text(tag_node, 'tag_slug')

        tag = {
            'term_id': int(get_wp_tag_text(tag_node, 'term_id')),
            'nicename': nicename,
            'name': get_wp_tag_text(tag_node, 'tag_name'),
            'description': get_wp_tag_text(tag_node, 'tag_description'),
        }
        cursor.execute('''
            INSERT OR IGNORE INTO tags (term_id, nicename, name, description)
            VALUES (?, ?, ?, ?)
        ''', (tag['term_id'], tag['nicename'], tag['name'], tag['description']))
    conn.commit()

    # --- Prepare for Internal Link Ranking ---
    # Step 1: Build a map of { URL_Path : Post_ID } to quickly lookup target posts
    url_to_post_id = {}
    
    # Pre-parse items to populate url_to_post_id map
    all_items = channel.findall('item')
    for item_node in all_items:
        post_type = get_wp_tag_text(item_node, 'post_type')
        if post_type in ['post', 'page']:
            post_id = int(get_wp_tag_text(item_node, 'post_id'))
            link = get_tag_text(item_node, 'link')
            if link:
                path = normalize_url_path(link)
                url_to_post_id[path] = post_id

    # --- Parse Items (Posts, Pages, Attachments) ---
    print("Extracting Posts, Pages, and Attachments...")
    # Regex to find href="http..."
    external_link_pattern = re.compile(r'href=["\"](http[s]?:\/\/(?:(?!' + re.escape(your_domain) + r')[^"\"]+))["\"]')
    internal_link_pattern = re.compile(r'href=["\"]([^"\"]+)["\"]')


    for item_node in all_items:
        post_type = get_wp_tag_text(item_node, 'post_type')
        post_id = int(get_wp_tag_text(item_node, 'post_id'))
        
        # Determine if it's a post, page, or attachment and process accordingly
        if post_type in ['post', 'page', 'attachment']:
            title = get_tag_text(item_node, 'title')
            content_encoded = get_tag_text(item_node, 'encoded', 'content')

            if not title:
                if content_encoded:
                    match = re.search(r'<h[12]>(.*?)<\/h[12]>', content_encoded)
                    if match:
                        title = match.group(1)
                if not title:
                    title = "Untitled Post"

            link = get_tag_text(item_node, 'link')
            pub_date = get_tag_text(item_node, 'pubDate')
            creator = get_tag_text(item_node, 'creator', 'dc')
            guid = get_tag_text(item_node, 'guid')
            description = get_tag_text(item_node, 'description')
            excerpt_encoded = get_tag_text(item_node, 'encoded', 'excerpt')
            post_date = get_wp_tag_text(item_node, 'post_date')
            post_date_gmt = get_wp_tag_text(item_node, 'post_date_gmt')
            comment_status = get_wp_tag_text(item_node, 'comment_status')
            ping_status = get_wp_tag_text(item_node, 'ping_status')
            post_name = get_wp_tag_text(item_node, 'post_name')
            status = get_wp_tag_text(item_node, 'status')
            post_parent = int(get_wp_tag_text(item_node, 'post_parent') or 0)
            menu_order = int(get_wp_tag_text(item_node, 'menu_order') or 0)
            post_mime_type = get_wp_tag_text(item_node, 'post_mime_type')
            comment_count = int(get_wp_tag_text(item_node, 'comment_count') or 0)

            # --- SEO Data Extraction ---
            seo_title = ""
            seo_description = ""
            seo_keywords = ""
            for meta in item_node.findall('wp:postmeta', NAMESPACES):
                key = get_wp_tag_text(meta, 'meta_key')
                val = get_wp_tag_text(meta, 'meta_value')
                if key == '_aioseo_title':
                    seo_title = val
                elif key == '_aioseo_description':
                    seo_description = val
                elif key == '_aioseo_keywords':
                    seo_keywords = val

            # --- Cleaned HTML Source (from existing files) ---
            cleaned_html_source = None
            if post_type in ['post', 'page']:
                potential_filename = f"{post_name}.html"
                
                # Check blog posts directory
                cleaned_post_path = os.path.join('all_blog_posts', potential_filename)
                if os.path.exists(cleaned_post_path):
                    try:
                        with open(cleaned_post_path, 'r', encoding='utf-8') as f:
                            cleaned_html_source = f.read()
                        # print(f"Found cleaned HTML for post '{post_name}' in all_blog_posts")
                    except Exception as e:
                        print(f"Error reading cleaned HTML for {post_name} from {cleaned_post_path}: {e}")
                
                # If not found in blog posts, check pages directory
                if not cleaned_html_source:
                    cleaned_page_path = os.path.join('all_pages', potential_filename)
                    if os.path.exists(cleaned_page_path):
                        try:
                            with open(cleaned_page_path, 'r', encoding='utf-8') as f:
                                cleaned_html_source = f.read()
                            # print(f"Found cleaned HTML for page '{post_name}' in all_pages")
                        except Exception as e:
                            print(f"Error reading cleaned HTML for {post_name} from {cleaned_page_path}: {e}")

            # --- Insert or Update Post Data ---
            cursor.execute('''
                INSERT INTO posts (
                    post_id, title, link, pub_date, creator, guid, description,
                    content_encoded, excerpt_encoded, post_date, post_date_gmt,
                    comment_status, ping_status, post_name, status, post_parent,
                    menu_order, post_type, post_mime_type, comment_count,
                    cleaned_html_source, seo_title, seo_description, seo_keywords
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(post_id) DO UPDATE SET
                    title = excluded.title,
                    link = excluded.link,
                    pub_date = excluded.pub_date,
                    creator = excluded.creator,
                    guid = excluded.guid,
                    description = excluded.description,
                    content_encoded = excluded.content_encoded,
                    excerpt_encoded = excluded.excerpt_encoded,
                    post_date = excluded.post_date,
                    post_date_gmt = excluded.post_date_gmt,
                    comment_status = excluded.comment_status,
                    ping_status = excluded.ping_status,
                    post_name = excluded.post_name,
                    status = excluded.status,
                    post_parent = excluded.post_parent,
                    menu_order = excluded.menu_order,
                    post_type = excluded.post_type,
                    post_mime_type = excluded.post_mime_type,
                    comment_count = excluded.comment_count,
                    cleaned_html_source = excluded.cleaned_html_source,
                    seo_title = excluded.seo_title,
                    seo_description = excluded.seo_description,
                    seo_keywords = excluded.seo_keywords;
            ''', (
                post_id, title, link, pub_date, creator, guid, description,
                content_encoded, excerpt_encoded, post_date, post_date_gmt,
                comment_status, ping_status, post_name, status, post_parent,
                menu_order, post_type, post_mime_type, comment_count,
                cleaned_html_source, seo_title, seo_description, seo_keywords
            ))

            # Post Categories and Tags
            for category_node in item_node.findall('category'):
                domain = category_node.get('domain')
                nicename = category_node.get('nicename')
                if domain == 'category':
                    cursor.execute('SELECT term_id FROM categories WHERE nicename = ?', (nicename,))
                    cat_id = cursor.fetchone()
                    if cat_id:
                        cursor.execute('INSERT OR IGNORE INTO post_categories (post_id, category_term_id) VALUES (?, ?)', (post_id, cat_id[0]))
                elif domain == 'post_tag':
                    cursor.execute('SELECT term_id FROM tags WHERE nicename = ?', (nicename,))
                    tag_id = cursor.fetchone()
                    if tag_id:
                        cursor.execute('INSERT OR IGNORE INTO post_tags (post_id, tag_term_id) VALUES (?, ?)', (post_id, tag_id[0]))

            # Post Meta (excluding AIOSEO which is now in posts table)
            for postmeta_node in item_node.findall('wp:postmeta', NAMESPACES):
                meta_key = get_wp_tag_text(postmeta_node, 'meta_key')
                if meta_key not in ['_aioseo_title', '_aioseo_description', '_aioseo_keywords']:
                    meta_value = get_wp_tag_text(postmeta_node, 'meta_value')
                    cursor.execute('''
                        INSERT OR IGNORE INTO post_meta (post_id, meta_key, meta_value)
                        VALUES (?, ?, ?)
                    ''', (post_id, meta_key, meta_value))

            # Comments
            for comment_node in item_node.findall('wp:comment', NAMESPACES):
                comment = {
                    'comment_id': int(get_wp_tag_text(comment_node, 'comment_id')),
                    'post_id': post_id,
                    'comment_author': get_wp_tag_text(comment_node, 'comment_author'),
                    'comment_author_email': get_wp_tag_text(comment_node, 'comment_author_email'),
                    'comment_author_url': get_wp_tag_text(comment_node, 'comment_author_url'),
                    'comment_author_ip': get_wp_tag_text(comment_node, 'comment_author_ip'),
                    'comment_date': get_wp_tag_text(comment_node, 'comment_date'),
                    'comment_date_gmt': get_wp_tag_text(comment_node, 'comment_date_gmt'),
                    'comment_content': get_wp_tag_text(comment_node, 'comment_content'),
                    'comment_approved': get_wp_tag_text(comment_node, 'comment_approved'),
                    'comment_type': get_wp_tag_text(comment_node, 'comment_type'),
                    'comment_parent': int(get_wp_tag_text(comment_node, 'comment_parent') or 0),
                    'comment_user_id': int(get_wp_tag_text(comment_node, 'comment_user_id') or 0),
                }
                cursor.execute('''
                    INSERT OR IGNORE INTO comments (
                        comment_id, post_id, comment_author, comment_author_email,
                        comment_author_url, comment_author_ip, comment_date,
                        comment_date_gmt, comment_content, comment_approved,
                        comment_type, comment_parent, comment_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    comment['comment_id'], comment['post_id'], comment['comment_author'],
                    comment['comment_author_email'], comment['comment_author_url'],
                    comment['comment_author_ip'], comment['comment_date'],
                    comment['comment_date_gmt'], comment['comment_content'],
                    comment['comment_approved'], comment['comment_type'],
                    comment['comment_parent'], comment['comment_user_id']
                ))
            
            # --- External Link Scanning ---
            if content_encoded and post_type in ['post', 'page']:
                found_external_links = external_link_pattern.findall(content_encoded)
                for ext_link in found_external_links:
                    cursor.execute('''
                        INSERT OR IGNORE INTO external_links (source_post_id, source_post_title, linked_url)
                        VALUES (?, ?, ?)
                    ''', (post_id, title, ext_link))

    conn.commit()
    print("Initial data extraction complete. Calculating internal backlinks...")

    # --- Calculate Internal Backlinks ---
    # Re-iterate through all posts to count internal backlinks
    for item_node in all_items:
        post_type = get_wp_tag_text(item_node, 'post_type')
        current_post_id = int(get_wp_tag_text(item_node, 'post_id'))
        
        if post_type in ['post', 'page']:
            content_encoded = get_tag_text(item_node, 'encoded', 'content')
            if content_encoded:
                found_internal_links = internal_link_pattern.findall(content_encoded)
                
                for potential_link in found_internal_links:
                    # Check if it's an internal link (contains your_domain) and normalize it
                    if your_domain in potential_link:
                        normalized_found_path = normalize_url_path(potential_link)
                        
                        # If the normalized path corresponds to an extracted post/page
                        if normalized_found_path in url_to_post_id:
                            target_post_id = url_to_post_id[normalized_found_path]
                            # Increment backlink count for the target post
                            cursor.execute('''
                                UPDATE posts
                                SET internal_backlink_count = internal_backlink_count + 1
                                WHERE post_id = ?
                            ''', (target_post_id,))
    
    conn.commit()
    conn.close()
    print("XML parsing and SQLite storage complete, including SEO and link analysis.")

if __name__ == "__main__":
    # Example usage (replace with your actual XML file and domain)
    XML_FILE = 'theitapprentice.WordPress.2024-08-17.xml'
    DB_NAME = 'wordpress_extracted_data.db'
    YOUR_DOMAIN = 'theitapprentice.com'

    # Clean up previous db for fresh run
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)

    parse_wordpress_xml(XML_FILE, DB_NAME, YOUR_DOMAIN)
