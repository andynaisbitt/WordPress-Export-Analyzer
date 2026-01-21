namespace WordpressExtractor.Models
{
    public class Category
    {
        public int TermId { get; set; }
        public string Nicename { get; set; } = string.Empty;
        public string Parent { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public override string ToString()
        {
            return Name;
        }
    }
}
