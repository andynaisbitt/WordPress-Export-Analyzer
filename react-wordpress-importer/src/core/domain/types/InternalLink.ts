// react-wordpress-importer/src/types/InternalLink.ts

export interface InternalLink {
    Id?: number;
    SourcePostId: number;
    TargetPostId: number;
    AnchorText: string;
    SourcePostTitle: string;
    TargetPostTitle: string;
    TargetPostName: string;
    TargetPostStatus: string;
    // Add other properties as needed
}
