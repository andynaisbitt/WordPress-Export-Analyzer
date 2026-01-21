namespace WordpressExtractor.Models
{
    public class PostMeta
    {
        public int MetaId { get; set; }
        public int PostId { get; set; }
        public string MetaKey { get; set; } = string.Empty;
        public string MetaValue { get; set; } = string.Empty;

        public override string ToString()
        {
            return $"{MetaKey}: {MetaValue}";
        }
    }
}
