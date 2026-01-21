import xml.etree.ElementTree as ET
import os
import re
import json
import sqlite3

# --- Configuration ---
XML_FILE = 'theitapprentice.WordPress.2024-08-17.xml'
DB_NAME = 'wordpress_extracted_data.db'
CLEANED_BLOG_POSTS_DIR = 'all_blog_posts'
CLEANED_PAGES_DIR = 'all_pages'

# --- XML Namespaces ---
NAMESPACES = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
    'dc': 'http://purl.org/dc/elements/1.1/',
    '': 'http://purl.org/rss/1.0/modules/content/', # Default namespace for content:encoded
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
        NAMESPACES['excerpt'] = 'http://wordpress.org/export/1.2/excerpt/'
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

def parse_xml_to_sqlite(xml_file, db_name):
    """
    Parses the WordPress WXR XML file and stores extracted data into an SQLite database.
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
            cleaned_html_source TEXT
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
    conn.commit()

    tree = ET.parse(xml_file)
    root = tree.getroot()
    channel = root.find('channel')

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
        tag = {
            'term_id': int(get_wp_tag_text(tag_node, 'term_id')),
            'nicename': get_wp_tag_text(tag_node, 'tag_nicename'),
            'name': get_wp_tag_text(tag_node, 'tag_name'),
            'description': get_wp_tag_text(tag_node, 'tag_description'),
        }
        cursor.execute('''
            INSERT OR IGNORE INTO tags (term_id, nicename, name, description)
            VALUES (?, ?, ?, ?)
        ''', (tag['term_id'], tag['nicename'], tag['name'], tag['description']))
    conn.commit()

    # --- Parse Items (Posts, Pages, Attachments) ---
    print("Extracting Posts, Pages, and Attachments...")
    for item_node in channel.findall('item'):
        post_type = get_wp_tag_text(item_node, 'post_type')
        post_id = int(get_wp_tag_text(item_node, 'post_id'))
        
        # Determine if it's a post, page, or attachment and process accordingly
        if post_type in ['post', 'page', 'attachment']:
            title = get_tag_text(item_node, 'title')
            link = get_tag_text(item_node, 'link')
            pub_date = get_tag_text(item_node, 'pubDate')
            creator = get_tag_text(item_node, 'creator', 'dc')
            guid = get_tag_text(item_node, 'guid')
            description = get_tag_text(item_node, 'description')
            content_encoded = get_tag_text(item_node, 'encoded', 'content')
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

            # --- Integrate with existing cleaned HTML files ---
            cleaned_html_source = None
            if post_type in ['post', 'page']:
                # Try to find a matching cleaned HTML file based on post_name (slug)
                # This assumes the file names in all_blog_posts/all_pages are derived from post_name
                # E.g., 'my-awesome-post' -> 'my-awesome-post.html'
                potential_filename = f"{post_name}.html"
                
                # Check blog posts directory
                cleaned_post_path = os.path.join(CLEANED_BLOG_POSTS_DIR, potential_filename)
                if os.path.exists(cleaned_post_path):
                    try:
                        with open(cleaned_post_path, 'r', encoding='utf-8') as f:
                            cleaned_html_source = f.read()
                        print(f"Found cleaned HTML for post '{post_name}' in {CLEANED_BLOG_POSTS_DIR}")
                    except Exception as e:
                        print(f"Error reading cleaned HTML for {post_name} from {cleaned_post_path}: {e}")
                
                # If not found in blog posts, check pages directory
                if not cleaned_html_source:
                    cleaned_page_path = os.path.join(CLEANED_PAGES_DIR, potential_filename)
                    if os.path.exists(cleaned_page_path):
                        try:
                            with open(cleaned_page_path, 'r', encoding='utf-8') as f:
                                cleaned_html_source = f.read()
                            print(f"Found cleaned HTML for page '{post_name}' in {CLEANED_PAGES_DIR}")
                        except Exception as e:
                            print(f"Error reading cleaned HTML for {post_name} from {cleaned_page_path}: {e}")

            cursor.execute('''
                INSERT INTO posts (
                    post_id, title, link, pub_date, creator, guid, description,
                    content_encoded, excerpt_encoded, post_date, post_date_gmt,
                    comment_status, ping_status, post_name, status, post_parent,
                    menu_order, post_type, post_mime_type, comment_count, cleaned_html_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                post_id, title, link, pub_date, creator, guid, description,
                content_encoded, excerpt_encoded, post_date, post_date_gmt,
                comment_status, ping_status, post_name, status, post_parent,
                menu_order, post_type, post_mime_type, comment_count, cleaned_html_source
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

            # Post Meta
            for postmeta_node in item_node.findall('wp:postmeta', NAMESPACES):
                meta_key = get_wp_tag_text(postmeta_node, 'meta_key')
                meta_value = get_wp_tag_text(postmeta_node, 'meta_value')
                cursor.execute('''
                    INSERT INTO post_meta (post_id, meta_key, meta_value)
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
                    INSERT INTO comments (
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
    
    conn.commit()
    conn.close()
    print("XML parsing and SQLite storage complete.")

if __name__ == "__main__":
    parse_xml_to_sqlite(XML_FILE, DB_NAME)
