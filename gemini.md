# WordPress Extraction Project - Problem Log

This document tracks issues encountered and solutions implemented during the development of the WordPress Extraction application.

## Current Problems:

### 1. Data Display Issues (Titles showing "None", Incomplete Information)
*   **Description:** On the `/posts` and `/pages` listings, many post titles appeared as "None". Clicking into the post detail showed the correct title within the content, but not as the main post title.
*   **Root Cause:** The original XML parsing logic (`src/wordpress_xml_parser.py`) was not robust enough to handle cases where the `<title>` XML tag was empty or missing for some posts. This resulted in `None` being stored in the database for the `title` field.
*   **Solution Implemented (by Agent):** Modified `src/wordpress_xml_parser.py`. If the XML `<title>` tag is empty, the parser now attempts to extract the title from the `content_encoded` field by searching for the first `<h1>` or `<h2>` tag. If no title is found even there, it defaults to "Untitled Post".
*   **Action Required (by User):** **You MUST re-upload your WordPress XML file** via the `/upload` page in the Flask application for this change to take effect on your existing data.

### 2. "Not all posts are shown"
*   **Description:** The user reported that the total post count (e.g., 144) did not match the number of posts visibly listed on the `/posts` page.
*   **Investigation:** The SQLAlchemy queries (`posts_list` and `pages_list` functions in `flask_app.py`) do not apply any explicit limits. They use `.all()` which should retrieve all matching records.
*   **Possible Causes:**
    *   **Un-reparsed Data:** This issue might be linked to Problem 1. If titles were "None", they might not have been properly displayed or indexed in some views. Re-uploading the XML should resolve this for correctly parsed titles.
    *   **UI Scrolling/Pagination Expectation:** The current UI does not have pagination. All results are displayed on one page. The user might have expected pagination or not scrolled through the entire list.
*   **Action Required (by User):** After re-uploading the XML (as per Problem 1), please verify if all posts are shown. If the issue persists, further investigation into potential implicit filtering or UI rendering limits will be needed.

### 3. Destructive XML Upload Process
*   **Description:** The previous XML upload (`/upload` route) deleted all existing data in the database before processing a new XML file, making it inefficient for updates.
*   **Solution Implemented (by Agent):**
    *   Removed the data deletion code from `flask_app.py`'s `upload_file` function.
    *   Modified `src/wordpress_xml_parser.py` to use `INSERT ... ON CONFLICT(post_id) DO UPDATE SET` logic (upsert). This means new posts are inserted, and existing posts (identified by `post_id`) are updated, preserving other related data.
*   **Action Required (by User):** None. This is handled by the application logic.

### 4. Lack of Dedicated Pages for Posts and Pages
*   **Description:** The `/posts` route previously listed both WordPress posts and pages, confusing the content separation.
*   **Solution Implemented (by Agent):**
    *   Created a dedicated `/posts` route (using `posts_list()` in `flask_app.py`) to display only `post_type='post'`.
    *   Created a new `/pages` route (using `pages_list()` in `flask_app.py`) to display only `post_type='page'`.
    *   Updated the `base.html` navigation to include separate links for "Posts" and "Pages".
*   **Action Required (by User):** None. This is handled by the application logic.

### 5. Missing "Analysis" Page and Navigation
*   **Description:** The new "Analysis" page was not present, and the overall navigation was not updated.
*   **Solution Implemented (by Agent):**
    *   Refactored all templates to extend a central `base.html` for consistent navigation.
    *   Added a "Dashboard" link (new homepage at `/`) and "Analysis" link (`/analysis`) to `base.html`.
*   **Action Required (by User):** None. This is handled by the application logic.
