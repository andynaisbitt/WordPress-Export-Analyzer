namespace WordpressExtractor.Models
{
    public class InternalLink
    {
        public int Id { get; set; } // Primary Key
        public int SourcePostId { get; set; }
        public int TargetPostId { get; set; }
        public string AnchorText { get; set; } = string.Empty;
        public string SourcePostTitle { get; set; } = string.Empty; // For easier display
        public string TargetPostTitle { get; set; } = string.Empty; // For easier display
        public string TargetPostName { get; set; } = string.Empty; // For easier display/lookup
        public string TargetPostStatus { get; set; } = string.Empty; // Added TargetPostStatus property

        public override string ToString()
        {
            return $"{SourcePostTitle} --[{AnchorText}]--> {TargetPostTitle}";
        }
    }
}
