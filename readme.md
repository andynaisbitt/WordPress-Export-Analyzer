# 📦 WordPress-Export-Analyzer  
### *A full-suite toolkit for extracting, analyzing, auditing, and converting WordPress XML export files.*

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Active-blue.svg)
![Tech](https://img.shields.io/badge/Stack-C%23%20|%20Python%20|%20Flask%20|%20SQLite-orange.svg)

---

## 🚀 Overview

**WordPress-Export-Analyzer** is a modular multi-language toolkit designed to deeply inspect, extract, audit, and transform **WordPress XML export (`.xml`) files**.

It supports everything from **full-site migrations** to **SEO audits**, **content extraction**, **database generation**, and **CMS import pipelines** (including **FastReactCMS**).

This suite includes:

- ✔ **C# WinForms Desktop Application**
- ✔ **Python extraction & audit scripts**
- ✔ **Flask Web Dashboard**
- ✔ **SQLite structured database output**
- ✔ **Static HTML templates & archive builder**
- ✔ **SEO, internal link & external link audits**
- ✔ **Content, media, author, and metadata extraction**
- ✔ **JSON, CSV, Markdown & CMS-ready formats**

---

## ✨ Key Features

### 🔍 **Deep WordPress XML Extraction**
Supports all standard WordPress data types:

- Posts  
- Pages  
- Authors  
- Categories  
- Tags  
- Comments  
- Attachments & Media URLs  
- Post Meta  
- Excerpts  
- Slugs  
- SEO Metadata (Yoast/RankMath)  
- Custom fields  

---

### 📊 **SEO & Link Analysis Tools**
Includes automated audits for:

- Internal link graph
- External & outbound link analysis
- Broken links detection
- SEO metadata extraction
- Title, description & readability analysis
- Category & tag statistics
- Update-frequency ranking
- Internal-link ranking report

---

### 🛠️ **C# WinForms Application**
A fully interactive desktop tool for:

- Browsing posts, pages, authors, media, and metadata  
- Viewing internal/external links  
- Inspecting SEO data  
- Managing parsed XML files  
- Exporting data into JSON/CSV/SQLite  

**Tech:** WinForms, .NET, SQLite

---

### 🌐 **Flask Web Dashboard**
A clean interface for:

- Previewing extracted posts and pages  
- Category & tag browsing  
- Link audit dashboards  
- HTML analysis pages  
- Static archive rendering  
- Visual inspection of structured data  

---

### 📦 **Output Formats**
Choose from multiple export targets:

- **SQLite database** (wordpress_extracted_data.db)
- **CSV exports** (posts, categories, SEO, etc.)
- **JSON bundles** for CMS import
- **Markdown / static HTML** (offline archive)
- **Custom structured content for FastReactCMS**

---

## 📁 Project Structure
WordPress-Export-Analyzer/
│
├── all_blog_posts/
├── all_pages/
├── static/
├── templates/
│ ├── 404.html
│ ├── post_detail.html
│ ├── posts.html
│ ├── categories.html
│ ├── tags.html
│ ├── analysis.html
│ ├── index_stats.html
│ ├── upload.html
│ └── external_links_audit.html
│
├── WordpressExtractorModularApp/ # C# WinForms application
│ ├── Models/
│ ├── Services/
│ ├── UserControls/
│ ├── MainForm.cs
│ └── Program.cs
│
├── python_scripts/
│ ├── extract_posts.py
│ ├── extract_content.py
│ ├── extract_media_urls.py
│ ├── extract_seo.py
│ ├── scan_links.py
│ ├── rank_by_internal_links.py
│ ├── rank_by_updates.py
│ └── clean_wordpress_tags.py
│
├── flask_app.py
├── wordpress_extracted_data.db
├── seo_audit.csv
├── external_links_audit.csv
├── blog_posts_export.csv
└── theitapprentice.WordPress.2024-08-17.xml

---

## 🔧 Tech Stack
- **C# / .NET Framework**  
- **WinForms UI**  
- **Python 3.x**  
- **Flask Web Framework**  
- **SQLite Database Engine**  
- **BeautifulSoup**  
- **Regex Parsing Tools**  
- **XML Parsing Libraries**  

---

## 🛠️ Roadmap
Planned additions:

- [ ] Full Markdown exporter   
- [ ] One-click FastReactCMS import bundle  
- [ ] Media downloader & image validation  
- [ ] Duplicate content detection  
- [ ] Internal link graph visualization (Graphviz/D3)  
- [ ] Automatic static site generator mode  
- [ ] WordPress → JSON API emulator  

---

## 📜 License
This project is licensed under the **MIT License** — free to use for personal and commercial purposes.

---

## 🤝 Contributing
Pull requests, feature ideas, and bug reports are welcome!  
Feel free to fork, submit patches, or request enhancements.

---

## ⭐ Support the Project
If this toolkit helps you migrate a site or run an SEO audit, consider starring the repo ⭐ — it helps the project grow.

