# Project Status: WordPress Data Extractor (React Port)

## 1. Project Overview

This project is a React/TypeScript single-page application (SPA) designed to parse a WordPress XML export file, store the data in the browser's IndexedDB, and provide a user interface for browsing, analyzing, and exporting the content. The project is currently undergoing a significant refactor from a legacy proof-of-concept to a more robust "V2" architecture.

The application is bootstrapped with Vite and leverages web workers for background processing, ensuring the UI remains responsive during heavy data operations.

## 2. Current Architecture

The V2 architecture is organized into distinct, feature-based modules.

-   **`src/app`**: Contains the main application entry point (`main.tsx`), routing configuration (`router.tsx`), and the main layout (`AppLayout.tsx`).
-   **`src/core`**: Defines the core domain types (e.g., `Post`, `Category`) in `src/core/domain/types.ts`.
-   **`src/data`**: Manages all data concerns.
    -   `db`: IndexedDB setup, schema (`schemaV2.ts`), and migrations.
    -   `repositories`: A set of repositories (e.g., `postsRepoV2.ts`) for data access, providing an abstraction layer over the database.
    -   `services`: Contains the `XmlParser.ts` for XML processing and a generic `IndexedDbService.ts`.
-   **`src/features`**: Home to all the top-level screen components, each corresponding to a major feature (e.g., `PostsScreenV2.tsx`, `UploadScreenV2.tsx`).
-   **`src/ui`**: A library of reusable UI components (`VirtualTableV2.tsx`, `ProgressBarV2.tsx`, etc.).
-   **`src/workers`**: Offloads heavy lifting to background threads. `importWorker.ts` is responsible for parsing the XML and populating the database.
-   **`src/store`**: Contains Zustand stores for state management (`importStoreV2.ts`, `uiStoreV2.ts`).
-   **`src/analysis`**: Modules for performing analysis on the imported data, like `internalLinksAnalyzerV2.ts`.
-   **`src/export`**: Handles exporting data to various formats (`markdownExporterV2.ts`, `jsonExporterV2.ts`).

## 3. V1 vs. V2 Status Overview

-   **V1 (Legacy):** The legacy Python/Flask and C# code in the `/legacy` directory should be considered deprecated.
-   **V2 (Current):** The active development is entirely within the `react-wordpress-importer` directory. All new development uses the "V2" naming convention. The routing is fully wired for V2 screens.

## 4. Completed Tasks

-   **Project Scaffolding:** The project is a functional Vite + React + TypeScript application.
-   **Routing:** All primary routes are defined in `src/app/router.tsx` and point to the correct V2 screen components.
-   **Core UI Layout:** A basic `AppLayout.tsx` with a navigation sidebar (`Nav.tsx`) is in place.
-   **Domain Models:** Core data structures are defined in `src/core/domain/types.ts` and sub-folders.
-   **Database Schema:** A comprehensive IndexedDB schema is defined in `src/data/db/schemaV2.ts`.
-   **Component Library:** Several UI components have been created in `src/ui`, including `StepperV2`, `ProgressBarV2`, and `VirtualTableV2`.

## 5. Partially Completed Tasks

-   **XML Upload:** The UI for file upload is implemented in `UploadScreenV2.tsx`. It shows progress, but the actual processing is a simulation using `setTimeout`.
-   **Import Worker:** The `importWorker.ts` is set up to receive the XML file, but it only simulates the parsing and database insertion steps. The real data mapping and saving logic is missing.
-   **Data Repositories:** Repository files exist (`postsRepoV2.ts`, etc.), but their methods are likely stubs and need full implementation.
-   **Feature Screens:** All screens under `src/features` exist and are routed, but they are mostly placeholders and do not yet load or display data from the database.

## 6. Critical Missing Pieces

1.  **Dependency Installation:** The `fast-xml-parser` library is used in `src/data/services/XmlParser.ts` but is not yet listed in `package.json`. It needs to be installed.
2.  **Import Logic Implementation:** The core logic in `importWorker.ts` must be implemented. This involves:
    -   Parsing the XML string via `XmlParser.ts`.
    -   Mapping the parsed JSON objects to the application's domain models (e.g., `Post`, `Author`).
    -   Using the data repositories to save the mapped objects into IndexedDB.
3.  **Data Fetching & Display:** The feature screens (`PostsScreenV2.tsx`, etc.) need to be connected to the data layer to fetch and display data from IndexedDB using the repositories.
4.  **UI Views:** The `*View.tsx` components in `src/ui/components` (e.g., `PostsView.tsx`) need to be implemented to render the actual data passed down from the screens.

## 7. Short-Term V2 Roadmap

1.  **Install Dependencies:** Run `npm install fast-xml-parser`.
2.  **Implement `importWorker.ts`:**
    -   Start by fully implementing the `XmlParser` to extract a simple entity, like `posts`.
    -   Implement the `DataMapper.ts` to transform the parsed data.
    -   Wire the worker to use `postsRepoV2.ts` to save the data.
3.  **Implement `PostsScreenV2.tsx`:**
    -   Use the `postsRepoV2.ts` to fetch all posts from the database.
    -   Pass the fetched data to the `PostsView.tsx` component.
4.  **Implement `PostsView.tsx`:**
    -   Use `VirtualTableV2.tsx` to display the list of posts.
5.  **Connect Other Screens:** Repeat the process for Categories, Tags, and Authors to prove the core data pipeline works.
6.  **Refine UI:** Replace placeholder content across the dashboard and other screens with real data summaries and charts.

## 8. Long-Term Vision

-   **Complete all Analysis Tools:** Fully implement the features in `src/analysis`, including content cleanup, link analysis, and SEO audits.
-   **Implement Export Functionality:** Wire up the `ExportWizardScreenV2.tsx` to use the `jsonExporterV2.ts` and `markdownExporterV2.ts`.
-   **Add Full-Text Search:** Implement a robust search feature using the `searchStoreV2.ts`.
-   **Enhance UI/UX:** Add more sophisticated data visualizations, filtering, and sorting to all data views.
-   **Cross-Browser Testing:** Ensure the IndexedDB implementation and worker scripts are reliable across all modern browsers.
