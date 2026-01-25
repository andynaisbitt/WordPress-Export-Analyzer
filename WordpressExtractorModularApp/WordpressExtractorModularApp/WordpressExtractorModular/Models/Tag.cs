namespace WordpressExtractor.Models
{
    public class Tag
    {
        public int TermId { get; set; }
        public string Nicename { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int PostCount { get; set; } // Added PostCount property

        public override string ToString()
        {
            return Name;
        }
    }
}
