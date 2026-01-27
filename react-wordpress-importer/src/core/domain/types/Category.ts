// react-wordpress-importer/src/types/Category.ts

export interface Category {
    TermId: number;
    Nicename: string;
    Parent: string;
    Name: string;
    Description: string;
    PostCount: number; // Added this in C# model
    // Add other properties as needed
}
