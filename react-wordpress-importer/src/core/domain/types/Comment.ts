// react-wordpress-importer/src/types/Comment.ts

export interface Comment {
    CommentId: number;
    PostId: number;
    Author: string;
    AuthorEmail: string;
    AuthorUrl: string;
    AuthorIp: string;
    Date: Date | null;
    DateGmt: Date | null;
    Content: string;
    Approved: string;
    Type: string;
    Parent: number;
    UserId: number;
    // Add other properties as needed
}
