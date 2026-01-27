// react-wordpress-importer/src/types/Tag.ts

export interface Tag {
    TermId: number;
    Nicename: string;
    Name: string;
    Description: string;
    PostCount: number; // Added this in C# model
    // Add other properties as needed
}
