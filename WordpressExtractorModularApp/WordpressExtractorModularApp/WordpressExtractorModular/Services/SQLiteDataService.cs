using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using WordpressExtractor.Models;

namespace WordpressExtractor.Services
{
    public class SQLiteDataService
    {
        private readonly string _databasePath;

        public SQLiteDataService(string databaseName)
        {
            _databasePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..\\..\\..\\..\\", databaseName);
            _databasePath = Path.GetFullPath(_databasePath);

            InitializeDatabaseSchema();
        }

        private SqliteConnection GetConnection() => new SqliteConnection($"Data Source={_databasePath}");

        private void InitializeDatabaseSchema()
        {
            var dir = Path.GetDirectoryName(_databasePath);
            if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            using var connection = GetConnection();
            connection.Open();

            using var transaction = connection.BeginTransaction();
            using var command = connection.CreateCommand();
            command.Transaction = transaction;

            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS authors (
                    author_id INTEGER PRIMARY KEY,
                    login TEXT,
                    email TEXT,
                    display_name TEXT,
                    first_name TEXT,
                    last_name TEXT
                );

                CREATE TABLE IF NOT EXISTS categories (
                    term_id INTEGER PRIMARY KEY,
                    nicename TEXT,
                    parent TEXT,
                    name TEXT,
                    description TEXT
                );

                CREATE TABLE IF NOT EXISTS tags (
                    term_id INTEGER PRIMARY KEY,
                    nicename TEXT,
                    name TEXT,
                    description TEXT
                );

                -- Minimal columns required for your current Post model + UI
                CREATE TABLE IF NOT EXISTS posts (
                    post_id INTEGER PRIMARY KEY,
                    title TEXT,
                    link TEXT,
                    post_type TEXT,
                    post_date TEXT,
                    post_name TEXT,
                    cleaned_html_source TEXT,
                    content_encoded TEXT,
                    creator TEXT,
                    status TEXT
                );

                CREATE TABLE IF NOT EXISTS post_categories (
                    post_id INTEGER,
                    category_term_id INTEGER,
                    FOREIGN KEY (post_id) REFERENCES posts(post_id),
                    FOREIGN KEY (category_term_id) REFERENCES categories(term_id),
                    PRIMARY KEY (post_id, category_term_id)
                );

                CREATE TABLE IF NOT EXISTS post_tags (
                    post_id INTEGER,
                    tag_term_id INTEGER,
                    FOREIGN KEY (post_id) REFERENCES posts(post_id),
                    FOREIGN KEY (tag_term_id) REFERENCES tags(term_id),
                    PRIMARY KEY (post_id, tag_term_id)
                );

                CREATE TABLE IF NOT EXISTS post_meta (
                    meta_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER,
                    meta_key TEXT,
                    meta_value TEXT,
                    FOREIGN KEY (post_id) REFERENCES posts(post_id)
                );

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
                );

                CREATE TABLE IF NOT EXISTS attachments (
                    post_id INTEGER PRIMARY KEY,
                    title TEXT,
                    url TEXT,
                    mime_type TEXT,
                    post_name TEXT,
                    guid TEXT,
                    parent_id INTEGER,
                    description TEXT,
                    content TEXT
                );

                CREATE TABLE IF NOT EXISTS internal_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_post_id INTEGER,
                    target_post_id INTEGER,
                    anchor_text TEXT,
                    FOREIGN KEY (source_post_id) REFERENCES posts(post_id),
                    FOREIGN KEY (target_post_id) REFERENCES posts(post_id)
                );

                CREATE TABLE IF NOT EXISTS site_info (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            ";

            command.ExecuteNonQuery();

            // Non-destructive upgrades (safe if columns already exist)
            TryAddColumn(connection, transaction, "posts", "link", "TEXT");
            TryAddColumn(connection, transaction, "posts", "cleaned_html_source", "TEXT");

            transaction.Commit();
        }

        private static void TryAddColumn(SqliteConnection connection, SqliteTransaction transaction, string table, string column, string type)
        {
            using var cmd = connection.CreateCommand();
            cmd.Transaction = transaction;
            cmd.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {type};";

            try { cmd.ExecuteNonQuery(); }
            catch (SqliteException ex)
            {
                if (ex.Message.IndexOf("duplicate column name", StringComparison.OrdinalIgnoreCase) >= 0)
                    return;
                throw;
            }
        }

        // ----------------------------
        // SAVE (matches YOUR Post model)
        // ----------------------------
        public void SavePost(Post post)
        {
            using var connection = GetConnection();
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                INSERT OR REPLACE INTO posts (
                    post_id, title, link, post_type, post_date, post_name,
                    cleaned_html_source, content_encoded, creator, status
                ) VALUES (
                    @PostId, @Title, @Link, @PostType, @PostDate, @PostName,
                    @CleanedHtmlSource, @ContentEncoded, @Creator, @Status
                );
            ";

            command.Parameters.AddWithValue("@PostId", post.PostId);
            command.Parameters.AddWithValue("@Title", post.Title ?? string.Empty);
            command.Parameters.AddWithValue("@Link", post.Link ?? string.Empty);
            command.Parameters.AddWithValue("@PostType", post.PostType ?? string.Empty);

            // ✅ FIX: DateTime? -> string
            command.Parameters.AddWithValue("@PostDate", post.PostDate?.ToString("o") ?? string.Empty);

            command.Parameters.AddWithValue("@PostName", post.PostName ?? string.Empty);
            command.Parameters.AddWithValue("@CleanedHtmlSource", post.CleanedHtmlSource ?? string.Empty);
            command.Parameters.AddWithValue("@ContentEncoded", post.ContentEncoded ?? string.Empty);
            command.Parameters.AddWithValue("@Creator", post.Creator ?? string.Empty);
            command.Parameters.AddWithValue("@Status", post.Status ?? string.Empty);

            command.ExecuteNonQuery();
        }

        // ----------------------------
        // READ helpers (fix CS0029)
        // ----------------------------
        private static DateTime? ParseDateOrNull(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            // Prefer ISO 8601 (what we save)
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dtIso))
                return dtIso;

            // Fallback parse
            if (DateTime.TryParse(value, out var dt))
                return dt;

            return null;
        }

        // ----------------------------
        // POSTS (used by PostsViewControl)
        // ----------------------------
        public List<Post> GetPosts(
            string searchTerm = null,
            string categoryNicename = null,
            string tagNicename = null,
            string authorLogin = null,
            string postStatus = null,
            string sortColumn = "post_date",
            string sortOrder = "DESC",
            int limit = 0,
            int offset = 0)
        {
            var posts = new List<Post>();

            using var connection = GetConnection();
            connection.Open();

            var qb = new StringBuilder();
            qb.Append("SELECT DISTINCT p.post_id, p.title, p.link, p.post_type, p.post_date, p.post_name, p.cleaned_html_source, p.content_encoded, p.creator, p.status FROM posts p");

            if (!string.IsNullOrWhiteSpace(categoryNicename))
                qb.Append(" JOIN post_categories pc ON p.post_id = pc.post_id JOIN categories c ON pc.category_term_id = c.term_id");

            if (!string.IsNullOrWhiteSpace(tagNicename))
                qb.Append(" JOIN post_tags pt ON p.post_id = pt.post_id JOIN tags t ON pt.tag_term_id = t.term_id");

            if (!string.IsNullOrWhiteSpace(authorLogin))
                qb.Append(" JOIN authors a ON p.creator = a.login");

            qb.Append(" WHERE p.post_type IN ('post', 'page')");

            // NOTE: this is not parameterized in your original; leaving it consistent for now.
            // (You can upgrade later to parameterized LIKE queries)
            if (!string.IsNullOrWhiteSpace(searchTerm))
                qb.Append($" AND (p.title LIKE '%{searchTerm}%' OR p.content_encoded LIKE '%{searchTerm}%')");

            if (!string.IsNullOrWhiteSpace(categoryNicename))
                qb.Append($" AND c.nicename = '{categoryNicename}'");

            if (!string.IsNullOrWhiteSpace(tagNicename))
                qb.Append($" AND t.nicename = '{tagNicename}'");

            if (!string.IsNullOrWhiteSpace(authorLogin))
                qb.Append($" AND a.login = '{authorLogin}'");

            if (!string.IsNullOrWhiteSpace(postStatus))
                qb.Append($" AND p.status = '{postStatus}'");

            var validColumns = new HashSet<string> { "post_id", "title", "post_type", "post_date", "post_name", "creator", "status", "link" };
            if (!validColumns.Contains(sortColumn.ToLower()))
                sortColumn = "post_date";

            if (!sortOrder.Equals("ASC", StringComparison.OrdinalIgnoreCase) && !sortOrder.Equals("DESC", StringComparison.OrdinalIgnoreCase))
                sortOrder = "DESC";

            qb.Append($" ORDER BY p.{sortColumn} {sortOrder}");

            if (limit > 0)
                qb.Append($" LIMIT {limit} OFFSET {offset}");

            using var command = connection.CreateCommand();
            command.CommandText = qb.ToString();

            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                posts.Add(new Post
                {
                    PostId = reader.GetInt32(0),
                    Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Link = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    PostType = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),

                    // ✅ FIX: DB has TEXT, model expects DateTime?
                    PostDate = reader.IsDBNull(4) ? (DateTime?)null : ParseDateOrNull(reader.GetString(4)),

                    PostName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                    CleanedHtmlSource = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                    ContentEncoded = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                    Creator = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                    Status = reader.IsDBNull(9) ? string.Empty : reader.GetString(9)
                });
            }

            return posts;
        }

        public int GetPostCount(
            string searchTerm = null,
            string categoryNicename = null,
            string tagNicename = null,
            string authorLogin = null,
            string postStatus = null,
            string sortColumn = "post_date",
            string sortOrder = "DESC",
            int limit = 0,
            int offset = 0)
        {
            using var connection = GetConnection();
            connection.Open();

            var qb = new StringBuilder();
            qb.Append("SELECT COUNT(DISTINCT p.post_id) FROM posts p");

            if (!string.IsNullOrWhiteSpace(categoryNicename))
                qb.Append(" JOIN post_categories pc ON p.post_id = pc.post_id JOIN categories c ON pc.category_term_id = c.term_id");

            if (!string.IsNullOrWhiteSpace(tagNicename))
                qb.Append(" JOIN post_tags pt ON p.post_id = pt.post_id JOIN tags t ON pt.tag_term_id = t.term_id");

            if (!string.IsNullOrWhiteSpace(authorLogin))
                qb.Append(" JOIN authors a ON p.creator = a.login");

            qb.Append(" WHERE p.post_type IN ('post', 'page')");

            if (!string.IsNullOrWhiteSpace(searchTerm))
                qb.Append($" AND (p.title LIKE '%{searchTerm}%' OR p.content_encoded LIKE '%{searchTerm}%')");

            if (!string.IsNullOrWhiteSpace(categoryNicename))
                qb.Append($" AND c.nicename = '{categoryNicename}'");

            if (!string.IsNullOrWhiteSpace(tagNicename))
                qb.Append($" AND t.nicename = '{tagNicename}'");

            if (!string.IsNullOrWhiteSpace(authorLogin))
                qb.Append($" AND a.login = '{authorLogin}'");

            if (!string.IsNullOrWhiteSpace(postStatus))
                qb.Append($" AND p.status = '{postStatus}'");

            using var cmd = connection.CreateCommand();
            cmd.CommandText = qb.ToString();
            return Convert.ToInt32(cmd.ExecuteScalar());
        }

        // ----------------------------
        // UI-required Get methods
        // ----------------------------

        public List<PostMeta> GetPostMetaByPostId(int postId)
        {
            var list = new List<PostMeta>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"SELECT meta_id, post_id, meta_key, meta_value FROM post_meta WHERE post_id = @PostId ORDER BY meta_id;";
            cmd.Parameters.AddWithValue("@PostId", postId);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new PostMeta
                {
                    MetaId = reader.GetInt32(0),
                    PostId = reader.GetInt32(1),
                    MetaKey = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    MetaValue = reader.IsDBNull(3) ? string.Empty : reader.GetString(3)
                });
            }

            return list;
        }

        public List<Comment> GetCommentsByPostId(int postId)
        {
            var list = new List<Comment>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
                SELECT
                    comment_id, post_id, comment_author, comment_author_email, comment_author_url,
                    comment_author_ip, comment_date, comment_date_gmt, comment_content,
                    comment_approved, comment_type, comment_parent, comment_user_id
                FROM comments
                WHERE post_id = @PostId
                ORDER BY comment_date;
            ";
            cmd.Parameters.AddWithValue("@PostId", postId);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new Comment
                {
                    CommentId = reader.GetInt32(0),
                    PostId = reader.GetInt32(1),
                    Author = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    AuthorEmail = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    AuthorUrl = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                    AuthorIp = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                    Date = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                    DateGmt = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                    Content = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                    Approved = reader.IsDBNull(9) ? string.Empty : reader.GetString(9),
                    Type = reader.IsDBNull(10) ? string.Empty : reader.GetString(10),
                    Parent = reader.IsDBNull(11) ? 0 : reader.GetInt32(11),
                    UserId = reader.IsDBNull(12) ? 0 : reader.GetInt32(12)
                });
            }

            return list;
        }

        public List<Attachment> GetAttachments(int limit = 0, int offset = 0)
        {
            var list = new List<Attachment>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();

            var sql = new StringBuilder();
            sql.Append("SELECT post_id, title, url, mime_type, post_name, guid, parent_id, description, content FROM attachments ORDER BY post_id DESC");
            if (limit > 0)
            {
                sql.Append(" LIMIT @Limit OFFSET @Offset");
                cmd.Parameters.AddWithValue("@Limit", limit);
                cmd.Parameters.AddWithValue("@Offset", offset);
            }

            cmd.CommandText = sql.ToString();

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new Attachment
                {
                    PostId = reader.GetInt32(0),
                    Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Url = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    MimeType = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    PostName = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                    Guid = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                    ParentId = reader.IsDBNull(6) ? 0 : reader.GetInt32(6),
                    Description = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                    Content = reader.IsDBNull(8) ? string.Empty : reader.GetString(8)
                });
            }

            return list;
        }

        public int GetInternalLinksCount()
        {
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM internal_links;";
            return Convert.ToInt32(cmd.ExecuteScalar());
        }

        public List<InternalLink> GetInternalLinks(int limit = 0, int offset = 0)
        {
            var list = new List<InternalLink>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();

            var sql = new StringBuilder();
            sql.Append("SELECT id, source_post_id, target_post_id, anchor_text FROM internal_links ORDER BY id DESC");
            if (limit > 0)
            {
                sql.Append(" LIMIT @Limit OFFSET @Offset");
                cmd.Parameters.AddWithValue("@Limit", limit);
                cmd.Parameters.AddWithValue("@Offset", offset);
            }

            cmd.CommandText = sql.ToString();

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new InternalLink
                {
                    Id = reader.GetInt32(0),
                    SourcePostId = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
                    TargetPostId = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                    AnchorText = reader.IsDBNull(3) ? string.Empty : reader.GetString(3)
                });
            }

            return list;
        }

        public List<Category> GetCategories()
        {
            var list = new List<Category>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT term_id, nicename, parent, name, description FROM categories ORDER BY name;";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new Category
                {
                    TermId = reader.GetInt32(0),
                    Nicename = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Parent = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    Name = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    Description = reader.IsDBNull(4) ? string.Empty : reader.GetString(4)
                });
            }

            return list;
        }

        public List<Tag> GetTags()
        {
            var list = new List<Tag>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT term_id, nicename, name, description FROM tags ORDER BY name;";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new Tag
                {
                    TermId = reader.GetInt32(0),
                    Nicename = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Name = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    Description = reader.IsDBNull(3) ? string.Empty : reader.GetString(3)
                });
            }

            return list;
        }

        public List<Author> GetAuthors()
        {
            var list = new List<Author>();
            using var connection = GetConnection();
            connection.Open();

            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT author_id, login, email, display_name, first_name, last_name FROM authors ORDER BY display_name;";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new Author
                {
                    AuthorId = reader.GetInt32(0),
                    Login = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Email = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    DisplayName = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    FirstName = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                    LastName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5)
                });
            }

            return list;
        }
    }
}
