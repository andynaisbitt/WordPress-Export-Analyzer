from flask import Flask, render_template, request, redirect, url_for, flash, make_response
from sqlalchemy.orm import sessionmaker
from collections import defaultdict
from sqlalchemy import or_, func
from src.models import Base, create_database, Post, Author, Category, Tag, ExternalLink, PostCategory, PostTag, PostMeta, Comment, SiteInfo
from src.wordpress_xml_parser import parse_wordpress_xml
import os
import csv
import json
import math
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
    
    # New metrics
    total_comments = session.query(func.sum(Post.comment_count)).filter(Post.post_type.in_(['post', 'page'])).scalar() or 0
    total_attachments = session.query(Post).filter_by(post_type='attachment').count()

    return render_template('index_stats.html',
                           total_posts=total_posts,
                           total_pages=total_pages,
                           total_authors=total_authors,
                           total_categories=total_categories,
                           total_tags=total_tags,
                           total_external_links=total_external_links,
                           total_comments=total_comments,
                           total_attachments=total_attachments)

@app.route('/posts')
def posts_list():
    session = request.session
    
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search_query = request.args.get('search', '')
    category_filter = request.args.get('category', '')
    tag_filter = request.args.get('tag', '') # New tag filter
    post_type_filter = 'post' # Only show posts

    query = session.query(Post).filter(Post.post_type == post_type_filter)

    if search_query:
        query = query.filter(or_(
            Post.title.ilike(f'%{search_query}%'),
            Post.content_encoded.ilike(f'%{search_query}%')
        ))

    if category_filter:
        query = query.join(PostCategory).join(Category).filter(Category.name == category_filter)
        
    if tag_filter: # Apply tag filter
        query = query.join(PostTag).join(Tag).filter(Tag.name == tag_filter)

    # Data for filter dropdowns
    all_categories = session.query(Category).order_by(Category.name).all()
    all_tags = session.query(Tag).order_by(Tag.name).all() # New: all tags for filter dropdown
    
    total = query.count()
    posts = query.order_by(Post.post_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return render_template('posts.html', 
                           posts=posts, 
                           page=page, 
                           total_pages=total_pages, 
                           search_query=search_query,
                           post_type_filter=post_type_filter,
                           all_categories=all_categories, 
                           category_filter=category_filter,
                           all_tags=all_tags,              # New
                           tag_filter=tag_filter)          # New

@app.route('/pages')
def pages_list():
    session = request.session
    
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search_query = request.args.get('search', '')
    post_type_filter = 'page' # Only show pages

    query = session.query(Post).filter(Post.post_type == post_type_filter)

    if search_query:
        query = query.filter(or_(
            Post.title.ilike(f'%{search_query}%'),
            Post.content_encoded.ilike(f'%{search_query}%'),
            Post.cleaned_html_source.ilike(f'%{search_query}%')
        ))

    total = query.count()
    pages = query.order_by(Post.post_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return render_template('pages.html', posts=pages, page=page, total_pages=total_pages, search_query=search_query, post_type_filter=post_type_filter)


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
    
    sort_by = request.args.get('sort_by', 'post_count') # Default sort by post_count
    sort_order = request.args.get('sort_order', 'desc') # Default sort order descending

    query = session.query(
        Category,
        func.count(PostCategory.post_id).label('post_count')
    ).outerjoin(PostCategory).group_by(Category.term_id)

    if sort_by == 'name':
        if sort_order == 'asc':
            query = query.order_by(Category.name.asc())
        else:
            query = query.order_by(Category.name.desc())
    elif sort_by == 'post_count':
        if sort_order == 'asc':
            query = query.order_by(func.count(PostCategory.post_id).asc())
        else:
            query = query.order_by(func.count(PostCategory.post_id).desc())
            
    categories_with_counts = query.all()

    return render_template('categories.html', 
                           categories_with_counts=categories_with_counts,
                           sort_by=sort_by,
                           sort_order=sort_order)

@app.route('/tags')
def tags_list():
    session = request.session
    
    sort_by = request.args.get('sort_by', 'post_count')  # Default sort by post_count
    sort_order = request.args.get('sort_order', 'desc') # Default sort order descending

    query = session.query(
        Tag,
        func.count(PostTag.post_id).label('post_count')
    ).outerjoin(PostTag).group_by(Tag.term_id)

    if sort_by == 'name':
        if sort_order == 'asc':
            query = query.order_by(Tag.name.asc())
        else:
            query = query.order_by(Tag.name.desc())
    elif sort_by == 'post_count':
        if sort_order == 'asc':
            query = query.order_by(func.count(PostTag.post_id).asc())
        else:
            query = query.order_by(func.count(PostTag.post_id).desc())
            
    tags_with_counts = query.all()

    return render_template('tags.html', 
                           tags_with_counts=tags_with_counts,
                           sort_by=sort_by,
                           sort_order=sort_order)

@app.route('/internal_link_rankings')
def internal_link_rankings():
    session = request.session
    
    page = request.args.get('page', 1, type=int)
    per_page = 20
    sort_by = request.args.get('sort_by', 'internal_backlink_count')
    sort_order = request.args.get('sort_order', 'desc')

    query = session.query(Post).filter(Post.post_type.in_(['post', 'page']))

    if sort_by == 'title':
        if sort_order == 'asc':
            query = query.order_by(Post.title.asc())
        else:
            query = query.order_by(Post.title.desc())
    elif sort_by == 'type':
        if sort_order == 'asc':
            query = query.order_by(Post.post_type.asc())
        else:
            query = query.order_by(Post.post_type.desc())
    elif sort_by == 'status':
        if sort_order == 'asc':
            query = query.order_by(Post.status.asc())
        else:
            query = query.order_by(Post.status.desc())
    elif sort_by == 'internal_backlink_count':
        if sort_order == 'asc':
            query = query.order_by(Post.internal_backlink_count.asc())
        else:
            query = query.order_by(Post.internal_backlink_count.desc())
            
    total = query.count()
    ranked_posts = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return render_template('internal_link_rankings.html', 
                           ranked_posts=ranked_posts,
                           page=page,
                           total_pages=total_pages,
                           sort_by=sort_by,
                           sort_order=sort_order)

@app.route('/external_links_audit')
def external_links_audit():
    session = request.session
    
    page = request.args.get('page', 1, type=int)
    per_page = 20
    sort_by = request.args.get('sort_by', 'post_title') # Default sort by post_title
    sort_order = request.args.get('sort_order', 'asc') # Default sort order ascending

    # Fetch all links and their source post data for the current page
    query = session.query(ExternalLink, Post.post_id, Post.title, Post.internal_backlink_count).join(Post, ExternalLink.source_post_id == Post.post_id)
    
    # Order for pagination, initially by title for consistency
    query = query.order_by(Post.title.asc(), ExternalLink.linked_url.asc())

    total = query.count()
    paginated_links_data = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    # Group links by source post
    grouped_links_raw = defaultdict(list)
    for link, post_id, post_title, internal_backlink_count in paginated_links_data:
        grouped_links_raw[(post_id, post_title, internal_backlink_count)].append(link)

    # Convert to list of (key, value) pairs and sort the groups
    if sort_by == 'post_title':
        grouped_links_sorted = sorted(grouped_links_raw.items(), key=lambda x: x[0][1], reverse=(sort_order == 'desc'))
    elif sort_by == 'link_count':
        grouped_links_sorted = sorted(grouped_links_raw.items(), key=lambda x: len(x[1]), reverse=(sort_order == 'desc'))
    else: # Default to post_title sort
        grouped_links_sorted = sorted(grouped_links_raw.items(), key=lambda x: x[0][1], reverse=(sort_order == 'desc'))

    return render_template('external_links_audit.html', 
                           grouped_links=grouped_links_sorted, # Pass sorted list of (key, value)
                           page=page,
                           total_pages=total_pages,
                           sort_by=sort_by,
                           sort_order=sort_order)

@app.route('/export/posts/csv')
def export_posts_csv():
    session = request.session
    si = StringIO()
    posts = session.query(Post).filter_by(post_type='post').all()

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
    posts = session.query(Post).filter_by(post_type='post').all()
    
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

@app.route('/export/pages/csv')
def export_pages_csv():
    session = request.session
    si = StringIO()
    cw = csv.writer(si)

    pages = session.query(Post).filter_by(post_type='page').all()

    # Write header
    cw.writerow([
        'post_id', 'title', 'link', 'pub_date', 'creator', 'guid', 'description',
        'content_encoded', 'excerpt_encoded', 'post_date', 'post_date_gmt',
        'comment_status', 'ping_status', 'post_name', 'status', 'post_parent',
        'menu_order', 'post_type', 'post_mime_type', 'comment_count',
        'seo_title', 'seo_description', 'seo_keywords', 'internal_backlink_count'
    ])

    # Write data
    for page in pages:
        cw.writerow([
            page.post_id, page.title, page.link, page.pub_date, page.creator, page.guid, page.description,
            page.content_encoded, page.excerpt_encoded, page.post_date, page.post_date_gmt,
            page.comment_status, page.ping_status, page.post_name, page.status, page.post_parent,
            page.menu_order, page.post_type, page.post_mime_type, page.comment_count,
            page.seo_title, page.seo_description, page.seo_keywords, page.internal_backlink_count
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=wordpress_pages.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/export/pages/json')
def export_pages_json():
    session = request.session
    pages = session.query(Post).filter_by(post_type='page').all()
    
    pages_data = []
    for page in pages:
        pages_data.append({
            'post_id': page.post_id,
            'title': page.title,
            'link': page.link,
            'pub_date': page.pub_date,
            'creator': page.creator,
            'guid': page.guid,
            'description': page.description,
            'content_encoded': page.content_encoded,
            'excerpt_encoded': page.excerpt_encoded,
            'post_date': page.post_date,
            'post_date_gmt': page.post_date_gmt,
            'comment_status': page.comment_status,
            'ping_status': page.ping_status,
            'post_name': page.post_name,
            'status': page.status,
            'post_parent': page.post_parent,
            'menu_order': page.menu_order,
            'post_type': page.post_type,
            'post_mime_type': page.post_mime_type,
            'comment_count': page.comment_count,
            'seo_title': page.seo_title,
            'seo_description': page.seo_description,
            'seo_keywords': page.seo_keywords,
            'internal_backlink_count': page.internal_backlink_count,
            'categories': [c.category.name for c in page.post_categories],
            'tags': [t.tag.name for t in page.post_tags],
            'external_links': [link.linked_url for link in page.external_links]
        })
    
    response = make_response(json.dumps(pages_data, indent=4))
    response.headers["Content-Disposition"] = "attachment; filename=wordpress_pages.json"
    response.headers["Content-type"] = "application/json"
    return response

@app.route('/export/categories/csv')
def export_categories_csv():
    session = request.session
    si = StringIO()
    cw = csv.writer(si)

    # Query categories with their post counts
    categories_with_counts = session.query(
        Category,
        func.count(PostCategory.post_id).label('post_count')
    ).outerjoin(PostCategory).group_by(Category.term_id).all()

    # Write header
    cw.writerow([
        'term_id', 'nicename', 'name', 'description', 'parent', 'post_count'
    ])

    # Write data
    for category, post_count in categories_with_counts:
        cw.writerow([
            category.term_id,
            category.nicename,
            category.name,
            category.description,
            category.parent,
            post_count
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=wordpress_categories.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/export/categories/json')
def export_categories_json():
    session = request.session
    
    # Query categories with their post counts
    categories_with_counts = session.query(
        Category,
        func.count(PostCategory.post_id).label('post_count')
    ).outerjoin(PostCategory).group_by(Category.term_id).all()
    
    categories_data = []
    for category, post_count in categories_with_counts:
        categories_data.append({
            'term_id': category.term_id,
            'nicename': category.nicename,
            'name': category.name,
            'description': category.description,
            'parent': category.parent,
            'post_count': post_count
        })
    
    response = make_response(json.dumps(categories_data, indent=4))
    response.headers["Content-Disposition"] = "attachment; filename=wordpress_categories.json"
    response.headers["Content-type"] = "application/json"
    return response

@app.route('/export/internal_links/csv')
def export_internal_links_csv():
    session = request.session
    si = StringIO()
    cw = csv.writer(si)

    internal_links = session.query(Post).filter(Post.post_type.in_(['post', 'page'])).order_by(Post.internal_backlink_count.desc()).all()

    cw.writerow([
        'post_id', 'title', 'post_type', 'status', 'internal_backlink_count'
    ])

    for post in internal_links:
        cw.writerow([
            post.post_id,
            post.title,
            post.post_type,
            post.status,
            post.internal_backlink_count
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=wordpress_internal_links.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/export/internal_links/json')
def export_internal_links_json():
    session = request.session
    internal_links = session.query(Post).filter(Post.post_type.in_(['post', 'page'])).order_by(Post.internal_backlink_count.desc()).all()
    
    links_data = []
    for post in internal_links:
        links_data.append({
            'post_id': post.post_id,
            'title': post.title,
            'post_type': post.post_type,
            'status': post.status,
            'internal_backlink_count': post.internal_backlink_count
        })
    
    response = make_response(json.dumps(links_data, indent=4))
    response.headers["Content-Disposition"] = "attachment; filename=wordpress_internal_links.json"
    response.headers["Content-type"] = "application/json"
    return response

@app.route('/export/external_links/csv')
def export_external_links_csv():
    session = request.session
    si = StringIO()
    cw = csv.writer(si)

    # Query all external links with their source post titles and IDs
    export_data = session.query(ExternalLink, Post.title).join(Post, ExternalLink.source_post_id == Post.post_id).order_by(Post.title.asc(), ExternalLink.linked_url.asc()).all()

    cw.writerow([
        'source_post_id', 'source_post_title', 'linked_url'
    ])

    for link, post_title in export_data:
        cw.writerow([
            link.source_post_id,
            post_title,
            link.linked_url
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=wordpress_external_links.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/export/external_links/json')
def export_external_links_json():
    session = request.session
    
    export_data = session.query(ExternalLink, Post.title).join(Post, ExternalLink.source_post_id == Post.post_id).order_by(Post.title.asc(), ExternalLink.linked_url.asc()).all()
    
    links_data = []
    for link, post_title in export_data:
        links_data.append({
            'source_post_id': link.source_post_id,
            'source_post_title': post_title,
            'linked_url': link.linked_url
        })
    
    response = make_response(json.dumps(links_data, indent=4))
    response.headers["Content-Disposition"] = "attachment; filename=wordpress_external_links.json"
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
    session = request.session
    
    site_info = get_site_info()

    # Dashboard-like stats
    total_posts = session.query(Post).filter_by(post_type='post').count()
    total_pages = session.query(Post).filter_by(post_type='page').count()
    total_authors = session.query(Author).count()
    total_categories = session.query(Category).count()
    total_tags = session.query(Tag).count()
    total_external_links = session.query(ExternalLink).count()
    total_comments = session.query(func.sum(Post.comment_count)).filter(Post.post_type.in_(['post', 'page'])).scalar() or 0
    total_attachments = session.query(Post).filter_by(post_type='attachment').count()

    # Posts by Status
    posts_by_status = session.query(Post.status, func.count(Post.status)).filter_by(post_type='post').group_by(Post.status).all()
    pages_by_status = session.query(Post.status, func.count(Post.status)).filter_by(post_type='page').group_by(Post.status).all()

    # Top Authors by Post Count
    top_authors = session.query(Author.display_name, func.count(Post.post_id)).join(Post, Author.login == Post.creator).filter(Post.post_type == 'post').group_by(Author.display_name).order_by(func.count(Post.post_id).desc()).limit(5).all()

    # Top Categories by Post Count
    top_categories = session.query(Category.name, func.count(PostCategory.post_id)).join(PostCategory).group_by(Category.name).order_by(func.count(PostCategory.post_id).desc()).limit(5).all()

    # Top Tags by Post Count
    top_tags = session.query(Tag.name, func.count(PostTag.post_id)).join(PostTag).group_by(Tag.name).order_by(func.count(PostTag.post_id).desc()).limit(5).all()


    return render_template('analysis.html', 
                           site_info=site_info,
                           total_posts=total_posts,
                           total_pages=total_pages,
                           total_authors=total_authors,
                           total_categories=total_categories,
                           total_tags=total_tags,
                           total_external_links=total_external_links,
                           total_comments=total_comments,
                           total_attachments=total_attachments,
                           posts_by_status=posts_by_status,
                           pages_by_status=pages_by_status,
                           top_authors=top_authors,
                           top_categories=top_categories,
                           top_tags=top_tags)

if __name__ == '__main__':
    app.run(debug=True)