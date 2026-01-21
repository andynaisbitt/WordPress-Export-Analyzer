using System;

namespace WordpressExtractor.Models
{
    public class Comment
    {
        public int CommentId { get; set; }
        public int PostId { get; set; }
        public string Author { get; set; } = string.Empty;
        public string AuthorEmail { get; set; } = string.Empty;
        public string AuthorUrl { get; set; } = string.Empty;
        public string AuthorIp { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
        public DateTime? DateGmt { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Approved { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Parent { get; set; }
        public int UserId { get; set; }

        public override string ToString()
        {
            return $"Comment by {Author} on {Date?.ToShortDateString()}";
        }
    }
}
