// react-wordpress-importer/src/types/Post.ts

export interface Post {
    PostId: number;
    Title: string;
    Link: string;
    PostType: string;
    PostDate: Date | null;
    PostName: string;
    CleanedHtmlSource: string;
    ContentEncoded: string;
    Excerpt?: string;
    CategorySlugs?: string[];
    TagSlugs?: string[];
    Markdown?: string;
    Creator: string;
    Status: string;
    // Add other properties as needed from the C# Post model
}
