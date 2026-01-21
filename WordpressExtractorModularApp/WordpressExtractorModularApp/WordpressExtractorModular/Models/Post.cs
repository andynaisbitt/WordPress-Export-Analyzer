using System;
using System.Collections.Generic; // Added for Post and its relationships if any

namespace WordpressExtractor.Models
{
    public class Post
    {
        public int PostId { get; set; }
        public string Title { get; set; } = string.Empty; // Initialize to avoid CS8618 warnings
        public string PostType { get; set; } = string.Empty;
        public DateTime? PostDate { get; set; }
        public string PostName { get; set; } = string.Empty;
        public string CleanedHtmlSource { get; set; } = string.Empty;
        public string ContentEncoded { get; set; } = string.Empty;
        public string Creator { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        
        // Navigation properties (not directly mapped to DB columns but useful for UI/logic)
        public List<Comment> Comments { get; set; } = new List<Comment>();
        public List<PostMeta> PostMeta { get; set; } = new List<PostMeta>();
        public List<Category> Categories { get; set; } = new List<Category>(); // Associated categories
        public List<Tag> Tags { get; set; } = new List<Tag>(); // Associated tags

        public override string ToString()
        {
            return Title;
        }
    }
}
