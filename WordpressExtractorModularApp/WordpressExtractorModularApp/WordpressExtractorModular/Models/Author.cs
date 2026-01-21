namespace WordpressExtractor.Models
{
    public class Author
    {
        public int AuthorId { get; set; }
        public string Login { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

        public override string ToString()
        {
            return DisplayName;
        }
    }
}
