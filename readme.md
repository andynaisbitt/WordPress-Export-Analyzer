# 🚀 WordPress Export Analyzer & Importer (React Edition)

### *A modern, in-browser toolkit for analyzing, auditing, and converting WordPress XML exports.*

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-In%20Development-blue.svg)
![Tech](https://img.shields.io/badge/Stack-React%20|%20TypeScript%20|%20IndexedDB-orange.svg)

---

## ✨ Overview

**WordPress Export Analyzer** is being modernized into a powerful, client-side toolkit for deeply inspecting, auditing, and transforming **WordPress XML export (`.xml`) files**. This new version is a **Single Page Application (SPA)** built with **React and TypeScript**, running entirely in your browser.

There's **no backend, no server, and no cost**. Your data remains private and is processed on your machine.

This tool is perfect for:
- ✔ **Content and SEO Audits** before a migration.
- ✔ **Analyzing site structure**, internal links, and metadata.
- ✔ **Exporting data** into various formats (Markdown, JSON).
- ✔ **Generating import bundles** for other content management systems, such as **FastReactCMS**.

---

## 🚀 Key Features

### 💻 **Client-Side Processing**
- **100% In-Browser**: All processing happens on your machine. Your data is never uploaded to a server.
- **Cost-Free**: No backend means no hosting costs.
- **Privacy-Focused**: Your data never leaves your computer.

### 🔍 **Deep WordPress XML Extraction**
- **Comprehensive Parsing**: Extracts posts, pages, authors, categories, tags, comments, attachments, and metadata.
- **Client-Side Storage**: Uses **IndexedDB** to store and query large datasets efficiently within your browser.

### 📊 **Analysis & Auditing**
- **Interactive Dashboard**: Get a quick overview of your site's statistics.
- **Data Views**: Browse and search through your posts, pages, tags, and categories.
- **SEO & Link Analysis**: (Planned) Tools for analyzing internal/external links, SEO metadata, and more.

### 📦 **Flexible Exporting**
- **Export to Markdown**: Easily convert your posts and pages to Markdown.
- **JSON Export**: (Planned) Export structured data for use in other applications.
- **CMS Import Bundles**: (Planned) Generate import files for other CMSs, including **FastReactCMS**.

---

## 📁 Proposed Project Structure

```
/
|-- /src/
|   |-- /components/      # Reusable React components (e.g., DataGrid, Button)
|   |-- /views/           # Main application views/pages (e.g., Dashboard, Posts, Tags)
|   |-- /services/        # Application services (e.g., XmlParser.ts, IndexedDBService.ts)
|   |-- /hooks/           # Custom React hooks
|   |-- /store/           # State management store (e.g., Zustand or Redux)
|   |-- /types/           # TypeScript type definitions (e.g., Post, Tag, Category)
|   |-- index.tsx         # Main entry point of the React application
|   |-- App.tsx           # Root component of the application
|
|-- /public/
|   |-- index.html
|   |-- favicon.ico
|
|-- /legacy/
|   |-- /csharp/          # Archived C# WinForms application
|   |-- /python/          # Archived Python scripts
|   |-- /flask/           # Archived Flask application
|
|-- package.json
|-- tsconfig.json
|-- README.md
|-- .gitignore
|-- PROJECT_STATE.md
```

---

## 🔧 Tech Stack

### Modern Stack (In Development)
- **React**
- **TypeScript**
- **IndexedDB** (for client-side storage)
- **Zustand** or **Redux Toolkit** (for state management)
- **fast-xml-parser** (for XML parsing)

### Legacy Components (Archived)
- C# / .NET Framework (WinForms)
- Python 3.x
- Flask Web Framework
- SQLite

---

## 🛠️ Roadmap

### Current Focus
- [x] **Project State Analysis & Modernization Proposal**
- [ ] **Implement New Project Structure**
- [ ] **Set up React/TypeScript Boilerplate**
- [ ] **Develop Core XML Parsing Service**
- [ ] **Implement IndexedDB Data Service**

### Future Features
- [ ] **Build UI Components for all Data Views** (Posts, Pages, Tags, etc.)
- [ ] **Implement Dashboard with Site Statistics**
- [ ] **Add Full Markdown Exporter**
- [ ] **Create One-click FastReactCMS Import Bundle**
- [ ] **Develop Internal/External Link Analysis Tools**

---

## 📜 License
This project is licensed under the **MIT License** — free to use for personal and commercial purposes.

---

## 🤝 Contributing
Pull requests, feature ideas, and bug reports are welcome! As we transition to the new architecture, contributions to the React application are especially appreciated.

---

## ⭐ Support the Project
If this toolkit helps you, consider starring the repo ⭐ — it helps the project grow.