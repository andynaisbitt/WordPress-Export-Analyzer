from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

Base = declarative_base()

class Author(Base):
    __tablename__ = 'authors'
    author_id = Column(Integer, primary_key=True)
    login = Column(String)
    email = Column(String)
    display_name = Column(String)
    first_name = Column(String)
    last_name = Column(String)

    posts = relationship("Post", back_populates="author")

    def __repr__(self):
        return f"<Author(display_name='{self.display_name}')>"

class Category(Base):
    __tablename__ = 'categories'
    term_id = Column(Integer, primary_key=True)
    nicename = Column(String)
    parent = Column(String)
    name = Column(String)
    description = Column(Text)

    posts = relationship("PostCategory", back_populates="category")

    def __repr__(self):
        return f"<Category(name='{self.name}')>"

class Tag(Base):
    __tablename__ = 'tags'
    term_id = Column(Integer, primary_key=True)
    nicename = Column(String)
    name = Column(String)
    description = Column(Text)

    posts = relationship("PostTag", back_populates="tag")

    def __repr__(self):
        return f"<Tag(name='{self.name}')>"

class PostCategory(Base):
    __tablename__ = 'post_categories'
    post_id = Column(Integer, ForeignKey('posts.post_id'), primary_key=True)
    category_term_id = Column(Integer, ForeignKey('categories.term_id'), primary_key=True)

    post = relationship("Post", back_populates="post_categories")
    category = relationship("Category", back_populates="posts")

class PostTag(Base):
    __tablename__ = 'post_tags'
    post_id = Column(Integer, ForeignKey('posts.post_id'), primary_key=True)
    tag_term_id = Column(Integer, ForeignKey('tags.term_id'), primary_key=True)

    post = relationship("Post", back_populates="post_tags")
    tag = relationship("Tag", back_populates="posts")

class PostMeta(Base):
    __tablename__ = 'post_meta'
    meta_id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey('posts.post_id'))
    meta_key = Column(String)
    meta_value = Column(Text)

    post = relationship("Post", back_populates="post_meta")

class Comment(Base):
    __tablename__ = 'comments'
    comment_id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('posts.post_id'))
    comment_author = Column(String)
    comment_author_email = Column(String)
    comment_author_url = Column(String)
    comment_author_ip = Column(String)
    comment_date = Column(String)
    comment_date_gmt = Column(String)
    comment_content = Column(Text)
    comment_approved = Column(String)
    comment_type = Column(String)
    comment_parent = Column(Integer)
    comment_user_id = Column(Integer)

    post = relationship("Post", back_populates="comments")

class ExternalLink(Base):
    __tablename__ = 'external_links'
    link_id = Column(Integer, primary_key=True, autoincrement=True)
    source_post_id = Column(Integer, ForeignKey('posts.post_id'))
    source_post_title = Column(String)
    linked_url = Column(Text)

    post = relationship("Post", back_populates="external_links")

class SiteInfo(Base):
    __tablename__ = 'site_info'
    key = Column(String, primary_key=True)
    value = Column(Text)

    def __repr__(self):
        return f"<SiteInfo(key='{self.key}', value='{self.value[:50]}...')>"

class Post(Base):
    __tablename__ = 'posts'
    post_id = Column(Integer, primary_key=True)
    title = Column(String)
    link = Column(String)
    pub_date = Column(String)
    creator = Column(String, ForeignKey('authors.login'))  # Link to Author login
    guid = Column(String)
    description = Column(Text)
    content_encoded = Column(Text)
    excerpt_encoded = Column(Text)
    post_date = Column(String)
    post_date_gmt = Column(String)
    comment_status = Column(String)
    ping_status = Column(String)
    post_name = Column(String)
    status = Column(String)
    post_parent = Column(Integer)
    menu_order = Column(Integer)
    post_type = Column(String)
    post_mime_type = Column(String)
    comment_count = Column(Integer)
    cleaned_html_source = Column(Text)
    seo_title = Column(String)
    seo_description = Column(Text)
    seo_keywords = Column(Text)
    internal_backlink_count = Column(Integer, default=0)

    author = relationship("Author", back_populates="posts", foreign_keys=[creator], primaryjoin="Author.login == Post.creator")
    post_categories = relationship("PostCategory", back_populates="post", cascade="all, delete-orphan")
    post_tags = relationship("PostTag", back_populates="post", cascade="all, delete-orphan")
    post_meta = relationship("PostMeta", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    external_links = relationship("ExternalLink", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Post(title='{self.title}', type='{self.post_type}')>"

def create_database(db_path):
    engine = create_engine(f'sqlite:///{db_path}')
    Base.metadata.create_all(engine)
    return engine

if __name__ == '__main__':
    # This block is for testing the model creation
    DB_NAME = 'test_wordpress_data.db'
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
    
    engine = create_database(DB_NAME)
    print(f"Test database '{DB_NAME}' created with tables: {Base.metadata.tables.keys()}")

    # Example of adding data (optional, for verification)
    Session = sessionmaker(bind=engine)
    session = Session()

    new_author = Author(login='testuser', display_name='Test User')
    session.add(new_author)
    session.commit()

    new_post = Post(
        post_id=1,
        title='Test Post',
        link='http://example.com/test-post',
        post_type='post',
        creator='testuser',
        seo_title='Test SEO Title',
        internal_backlink_count=5
    )
    session.add(new_post)
    session.commit()

    new_external_link = ExternalLink(
        source_post_id=new_post.post_id,
        source_post_title=new_post.title,
        linked_url='http://external.com/some-page'
    )
    session.add(new_external_link)
    session.commit()

    print(f"Added author: {session.query(Author).first()}")
    print(f"Added post: {session.query(Post).first()}")
    print(f"Added external link: {session.query(ExternalLink).first()}")

    session.close()
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
        print(f"Test database '{DB_NAME}' removed.")
