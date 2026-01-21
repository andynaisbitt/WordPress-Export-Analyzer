from flask import Flask, render_template, request, redirect, url_for, flash, make_response
from sqlalchemy.orm import sessionmaker
from sqlalchemy import or_
from src.models import Base, create_database, Post, Author, Category, Tag, ExternalLink, PostCategory, PostTag, PostMeta, Comment, SiteInfo
from src.wordpress_xml_parser import parse_wordpress_xml
import os
import csv
import json
from io import StringIO

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['DATABASE_FILE'] = 'wordpress_extracted_data.db'
app.config['YOUR_DOMAIN'] = 'theitapprentice.com' # Configure your domain for internal link detection
app.config['SECRET_KEY'] = 'supersecretkey' # Replace with a strong secret key

# Ensure upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Database setup
DATABASE_PATH = os.path.join(os.getcwd(), app.config['DATABASE_FILE'])
engine = create_database(DATABASE_PATH)
Session = sessionmaker(bind=engine)

@app.before_request
def create_session():
    request.session = Session()

@app.teardown_request
def shutdown_session(exception=None):
    if hasattr(request, 'session'):
        request.session.close()

@app.route('/')
def index():
    session = request.session
    total_posts = session.query(Post).filter_by(post_type='post').count()
    total_pages = session.query(Post).filter_by(post_type='page').count()
    total_authors = session.query(Author).count()
    total_categories = session.query(Category).count()
    total_tags = session.query(Tag).count()
    total_external_links = session.query(ExternalLink).count()

    return render_template('index_stats.html',
                           total_posts=total_posts,
                           total_pages=total_pages,
                           total_authors=total_authors,
                           total_categories=total_categories,
                           total_tags=total_tags,
                           total_external_links=total_external_links)

@app.route('/posts')
def posts_list():
    session = request.session
    
    search_query = request.args.get('search', '')
    post_type_filter = request.args.get('post_type_filter', 'all')

    query = session.query(Post).filter(Post.post_type.in_(['post', 'page']))

    if search_query:
        query = query.filter(or_(
            Post.title.ilike(f'%{search_query}%'),
            Post.content_encoded.ilike(f'%{search_query}%'),
            Post.cleaned_html_source.ilike(f'%{search_query}%')
        ))

    if post_type_filter != 'all':
        query = query.filter(Post.post_type == post_type_filter)

    posts = query.order_by(Post.post_date.desc()).all()
    
    # Get distinct post types for filter dropdown
    distinct_post_types = [row[0] for row in session.query(Post.post_type).distinct().all() if row[0] in ['post', 'page']]

    return render_template('posts.html', posts=posts, search_query=search_query,
                           post_type_filter=post_type_filter, distinct_post_types=distinct_post_types)

@app.route('/post/<int:post_id>')
def post_detail(post_id):
    session = request.session
    post = session.query(Post).filter_by(post_id=post_id).first()

    if post is None:
        return render_template('404.html'), 404

    display_content = post.cleaned_html_source if post.cleaned_html_source else post.content_encoded
    
    # Fetch categories, tags, and external links for the post
    categories = [pc.category for pc in post.post_categories]
    tags = [pt.tag for pt in post.post_tags]
    external_links = post.external_links

    return render_template('post_detail.html', post=post, display_content=display_content,
                           categories=categories, tags=tags, external_links=external_links)

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file part', 'error')
            return redirect(request.url)
        file = request.files['file']
        if file.filename == '':
            flash('No selected file', 'error')
            return redirect(request.url)
        if file:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            
            # The data deletion logic has been removed to support dynamic updates.
            # The parsing script (`wordpress_xml_parser.py`) should handle duplicates.

            try:
                parse_wordpress_xml(filepath, app.config['DATABASE_FILE'], app.config['YOUR_DOMAIN'])
                flash('XML file successfully uploaded and processed!', 'success')
                return redirect(url_for('index'))
            except Exception as e:
                flash(f'Error processing XML file: {e}', 'error')
                return redirect(request.url)
    return render_template('upload.html')

@app.route('/authors')
def authors_list():
    session = request.session
    authors = session.query(Author).all()
    return render_template('authors.html', authors=authors)

@app.route('/categories')
def categories_list():
    session = request.session
    categories = session.query(Category).all()
    return render_template('categories.html', categories=categories)

@app.route('/tags')
def tags_list():
    session = request.session
    tags = session.query(Tag).all()
    return render_template('tags.html', tags=tags)

@app.route('/internal_link_rankings')
def internal_link_rankings():
    session = request.session
    ranked_posts = session.query(Post).filter(Post.post_type.in_(['post', 'page'])).order_by(Post.internal_backlink_count.desc()).all()
    return render_template('internal_link_rankings.html', ranked_posts=ranked_posts)

@app.route('/external_links_audit')
def external_links_audit():
    session = request.session
    external_links = session.query(ExternalLink).order_by(ExternalLink.source_post_title).all()
    return render_template('external_links_audit.html', external_links=external_links)

@app.route('/export/posts/csv')
def export_posts_csv():
    session = request.session
    si = StringIO()
    cw = csv.writer(si)

    posts = session.query(Post).all()

    # Write header
    cw.writerow([
        'post_id', 'title', 'link', 'pub_date', 'creator', 'guid', 'description',
        'content_encoded', 'excerpt_encoded', 'post_date', 'post_date_gmt',
        'comment_status', 'ping_status', 'post_name', 'status', 'post_parent',
        'menu_order', 'post_type', 'post_mime_type', 'comment_count',
        'seo_title', 'seo_description', 'seo_keywords', 'internal_backlink_count'
    ])

    # Write data
    for post in posts:
        cw.writerow([
            post.post_id, post.title, post.link, post.pub_date, post.creator, post.guid, post.description,
            post.content_encoded, post.excerpt_encoded, post.post_date, post.post_date_gmt,
            post.comment_status, post.ping_status, post.post_name, post.status, post.post_parent,
            post.menu_order, post.post_type, post.post_mime_type, post.comment_count,
            post.seo_title, post.seo_description, post.seo_keywords, post.internal_backlink_count
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=wordpress_posts.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/export/posts/json')
def export_posts_json():
    session = request.session
    posts = session.query(Post).all()
    
    posts_data = []
    for post in posts:
        posts_data.append({
            'post_id': post.post_id,
            'title': post.title,
            'link': post.link,
            'pub_date': post.pub_date,
            'creator': post.creator,
            'guid': post.guid,
            'description': post.description,
            'content_encoded': post.content_encoded,
            'excerpt_encoded': post.excerpt_encoded,
            'post_date': post.post_date,
            'post_date_gmt': post.post_date_gmt,
            'comment_status': post.comment_status,
            'ping_status': post.ping_status,
            'post_name': post.post_name,
            'status': post.status,
            'post_parent': post.post_parent,
            'menu_order': post.menu_order,
            'post_type': post.post_type,
            'post_mime_type': post.post_mime_type,
            'comment_count': post.comment_count,
            'seo_title': post.seo_title,
            'seo_description': post.seo_description,
            'seo_keywords': post.seo_keywords,
            'internal_backlink_count': post.internal_backlink_count,
            'categories': [c.category.name for c in post.post_categories],
            'tags': [t.tag.name for t in post.post_tags],
            'external_links': [link.linked_url for link in post.external_links]
        })
    
    response = make_response(json.dumps(posts_data, indent=4))
    response.headers["Content-Disposition"] = "attachment; filename=wordpress_posts.json"
    response.headers["Content-type"] = "application/json"
    return response

    response.headers["Content-type"] = "application/json"
    return response

def get_site_info():
    session = Session()
    site_info = {}
    try:
        for info in session.query(SiteInfo).all():
            site_info[info.key] = info.value
    finally:
        session.close()
    return site_info

@app.route('/analysis')
def analysis():
    site_info = get_site_info()
    return render_template('analysis.html', site_info=site_info)

if __name__ == '__main__':
    app.run(debug=True)