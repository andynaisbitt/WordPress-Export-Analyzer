import re
import os

def clean_wordpress_tags(html_content):
    """
    Removes WordPress-specific block comments from HTML content.
    E.g., <!-- wp:paragraph -->, <!-- /wp:list -->, <!-- wp:heading {"level":3} -->
    """
    # This regex looks for HTML comments starting with 'wp:' or '/wp:'
    # It handles potential attributes within the comment as well (e.g., {"level":3})
    pattern = r'<!--\s*/?wp:.*?-->'
    cleaned_content = re.sub(pattern, '', html_content, flags=re.DOTALL)
    return cleaned_content

def process_directory(directory_path):
    """
    Processes all HTML files in the given directory to remove WordPress tags.
    """
    print(f"Processing files in: {directory_path}")
    for root, _, files in os.walk(directory_path):
        for file_name in files:
            if file_name.endswith('.html'):
                file_path = os.path.join(root, file_name)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    cleaned_content = clean_wordpress_tags(content)
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(cleaned_content)
                    print(f"Cleaned: {file_path}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    blog_posts_dir = os.path.join(current_dir, 'all_blog_posts')
    pages_dir = os.path.join(current_dir, 'all_pages')

    if os.path.exists(blog_posts_dir):
        process_directory(blog_posts_dir)
    else:
        print(f"Directory not found: {blog_posts_dir}")

    if os.path.exists(pages_dir):
        process_directory(pages_dir)
    else:
        print(f"Directory not found: {pages_dir}")

    print("WordPress tag cleaning complete.")
