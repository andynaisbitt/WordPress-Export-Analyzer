using System;

namespace WordpressExtractor.Models
{
    public class Attachment
    {
        public int PostId { get; set; } // This is the attachment's own PostId from XML
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string MimeType { get; set; } = string.Empty;
        public string PostName { get; set; } = string.Empty; // slug
        public string Guid { get; set; } = string.Empty;
        public int ParentId { get; set; } // If attached to a post/page
        public string Description { get; set; } = string.Empty; // From XML description
        public string Content { get; set; } = string.Empty; // From content:encoded
        
        public override string ToString()
        {
            return Title;
        }
    }
}
