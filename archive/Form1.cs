using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;
using Markdig;

namespace WordpressExtractor
{
    public partial class Form1 : Form
    {
        private SQLiteDataService _dataService;
        private const string DATABASE_NAME = "wordpress_extracted_data.db";
        private int _selectedPostId = -1; // To keep track of the currently selected post ID

        // Declare controls
        private TabControl tabControlMain;
        private TabPage tabPagePosts;
        private TabPage tabPageAuthors;
        private TabPage tabPageCategories;
        private TabPage tabPageTags;
        private TabPage tabPageComments;
        private TabPage tabPagePostMeta;

        private SplitContainer splitContainerPosts;
        private Panel panelPostSearch;
        private TextBox searchTextBox;
        private Button searchButton;
        private Button exportMarkdownButton;
        private DataGridView dataGridViewPosts;
        private WebBrowser webBrowserPostContent;
        private DataGridView dataGridViewAuthors;
        private DataGridView dataGridViewCategories;
        private DataGridView dataGridViewTags;
        private DataGridView dataGridViewComments;
        private DataGridView dataGridViewPostMeta;


        public Form1()
        {
            InitializeComponent();
            this.Text = "WordPress Extractor";
            this.MinimumSize = new System.Drawing.Size(1000, 600);
            this.Size = new System.Drawing.Size(1000, 600);

            // Initialize data service
            try
            {
                _dataService = new SQLiteDataService(DATABASE_NAME);
            }
            catch (FileNotFoundException ex)
            {
                MessageBox.Show(ex.Message, "Database Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                // Optionally close the application if the database is critical
                // Application.Exit();
            }

            SetupUIControls(); // Call a method to setup all controls
            this.Load += Form1_Load;
        }

        private void SetupUIControls()
        {
            // Main Tab Control
            tabControlMain = new TabControl();
            tabControlMain.Dock = DockStyle.Fill;
            tabControlMain.SelectedIndexChanged += tabControlMain_SelectedIndexChanged;
            this.Controls.Add(tabControlMain);

            // TabPage Posts & Pages
            tabPagePosts = new TabPage("Posts & Pages");
            tabControlMain.Controls.Add(tabPagePosts);

            // SplitContainer for Posts & Pages tab
            splitContainerPosts = new SplitContainer();
            splitContainerPosts.Dock = DockStyle.Fill;
            splitContainerPosts.Orientation = Orientation.Vertical;
            splitContainerPosts.SplitterDistance = 350;
            tabPagePosts.Controls.Add(splitContainerPosts);

            // Panel for search controls
            panelPostSearch = new Panel();
            panelPostSearch.Dock = DockStyle.Top;
            panelPostSearch.Height = 35;
            splitContainerPosts.Panel1.Controls.Add(panelPostSearch);

            searchTextBox = new TextBox();
            searchTextBox.Dock = DockStyle.Fill;
            searchTextBox.Location = new System.Drawing.Point(6, 7);
            searchTextBox.Size = new System.Drawing.Size(136, 23);
            panelPostSearch.Controls.Add(searchTextBox);

            searchButton = new Button();
            searchButton.Text = "Search";
            searchButton.Dock = DockStyle.Right;
            searchButton.Width = 75;
            searchButton.Click += searchButton_Click;
            panelPostSearch.Controls.Add(searchButton);
            
            exportMarkdownButton = new Button();
            exportMarkdownButton.Text = "Export to Markdown";
            exportMarkdownButton.Dock = DockStyle.Right;
            exportMarkdownButton.Width = 115;
            exportMarkdownButton.Click += exportMarkdownButton_Click;
            panelPostSearch.Controls.Add(exportMarkdownButton);


            // DataGridView for Posts
            dataGridViewPosts = new DataGridView();
            dataGridViewPosts.Dock = DockStyle.Fill;
            dataGridViewPosts.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewPosts.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewPosts.ReadOnly = true;
            dataGridViewPosts.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewPosts.MultiSelect = false;
            dataGridViewPosts.RowHeadersVisible = false;
            dataGridViewPosts.Location = new System.Drawing.Point(0, 35); // Below search panel
            dataGridViewPosts.SelectionChanged += dataGridViewPosts_SelectionChanged;
            splitContainerPosts.Panel1.Controls.Add(dataGridViewPosts);


            // WebBrowser for Post Content
            webBrowserPostContent = new WebBrowser();
            webBrowserPostContent.Dock = DockStyle.Fill;
            splitContainerPosts.Panel2.Controls.Add(webBrowserPostContent);

            // TabPage Authors
            tabPageAuthors = new TabPage("Authors");
            tabControlMain.Controls.Add(tabPageAuthors);
            dataGridViewAuthors = new DataGridView();
            dataGridViewAuthors.Dock = DockStyle.Fill;
            dataGridViewAuthors.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewAuthors.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewAuthors.ReadOnly = true;
            dataGridViewAuthors.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewAuthors.MultiSelect = false;
            dataGridViewAuthors.RowHeadersVisible = false;
            tabPageAuthors.Controls.Add(dataGridViewAuthors);

            // TabPage Categories
            tabPageCategories = new TabPage("Categories");
            tabControlMain.Controls.Add(tabPageCategories);
            dataGridViewCategories = new DataGridView();
            dataGridViewCategories.Dock = DockStyle.Fill;
            dataGridViewCategories.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewCategories.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewCategories.ReadOnly = true;
            dataGridViewCategories.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewCategories.MultiSelect = false;
            dataGridViewCategories.RowHeadersVisible = false;
            tabPageCategories.Controls.Add(dataGridViewCategories);

            // TabPage Tags
            tabPageTags = new TabPage("Tags");
            tabControlMain.Controls.Add(tabPageTags);
            dataGridViewTags = new DataGridView();
            dataGridViewTags.Dock = DockStyle.Fill;
            dataGridViewTags.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewTags.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewTags.ReadOnly = true;
            dataGridViewTags.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewTags.MultiSelect = false;
            dataGridViewTags.RowHeadersVisible = false;
            tabPageTags.Controls.Add(dataGridViewTags);

            // TabPage Comments
            tabPageComments = new TabPage("Comments");
            tabControlMain.Controls.Add(tabPageComments);
            dataGridViewComments = new DataGridView();
            dataGridViewComments.Dock = DockStyle.Fill;
            dataGridViewComments.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewComments.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewComments.ReadOnly = true;
            dataGridViewComments.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewComments.MultiSelect = false;
            dataGridViewComments.RowHeadersVisible = false;
            tabPageComments.Controls.Add(dataGridViewComments);

            // TabPage Post Meta
            tabPagePostMeta = new TabPage("Post Meta");
            tabControlMain.Controls.Add(tabPagePostMeta);
            dataGridViewPostMeta = new DataGridView();
            dataGridViewPostMeta.Dock = DockStyle.Fill;
            dataGridViewPostMeta.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewPostMeta.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewPostMeta.ReadOnly = true;
            dataGridViewPostMeta.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewPostMeta.MultiSelect = false;
            dataGridViewPostMeta.RowHeadersVisible = false;
            tabPagePostMeta.Controls.Add(dataGridViewPostMeta);
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            if (_dataService != null)
            {
                // Load initial data for the first tab (Posts & Pages)
                LoadPosts();
            }
        }

        private void tabControlMain_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (_dataService == null) return;

            switch (tabControlMain.SelectedTab.Text)
            {
                case "Posts & Pages":
                    LoadPosts();
                    break;
                case "Authors":
                    LoadAuthors();
                    break;
                case "Categories":
                    LoadCategories();
                    break;
                case "Tags":
                    LoadTags();
                    break;
                case "Comments":
                    if (_selectedPostId != -1)
                        LoadCommentsForPost(_selectedPostId);
                    else
                        dataGridViewComments.DataSource = null; // Clear if no post selected
                    break;
                case "Post Meta":
                    if (_selectedPostId != -1)
                        LoadPostMetaForPost(_selectedPostId);
                    else
                        dataGridViewPostMeta.DataSource = null; // Clear if no post selected
                    break;
            }
        }

        private void LoadPosts(string searchTerm = "")
        {
            if (_dataService == null) return;
            var posts = _dataService.GetPosts(searchTerm);
            dataGridViewPosts.DataSource = posts;
            // Optionally hide columns that are not relevant for initial display or too long
            if (dataGridViewPosts.Columns.Contains("CleanedHtmlSource"))
                dataGridViewPosts.Columns["CleanedHtmlSource"].Visible = false;
            if (dataGridViewPosts.Columns.Contains("ContentEncoded"))
                dataGridViewPosts.Columns["ContentEncoded"].Visible = false;
            if (dataGridViewPosts.Columns.Contains("PostName"))
                dataGridViewPosts.Columns["PostName"].Visible = false;
            if (dataGridViewPosts.Columns.Contains("PostId"))
                dataGridViewPosts.Columns["PostId"].Visible = false; // Hide ID column
        }

        private void LoadAuthors()
        {
            if (_dataService == null) return;
            var authors = _dataService.GetAuthors();
            dataGridViewAuthors.DataSource = authors;
            if (dataGridViewAuthors.Columns.Contains("AuthorId"))
                dataGridViewAuthors.Columns["AuthorId"].Visible = false; // Hide ID
        }

        private void LoadCategories()
        {
            if (_dataService == null) return;
            var categories = _dataService.GetCategories();
            dataGridViewCategories.DataSource = categories;
            if (dataGridViewCategories.Columns.Contains("TermId"))
                dataGridViewCategories.Columns["TermId"].Visible = false; // Hide ID
        }

        private void LoadTags()
        {
            if (_dataService == null) return;
            var tags = _dataService.GetTags();
            dataGridViewTags.DataSource = tags;
            if (dataGridViewTags.Columns.Contains("TermId"))
                dataGridViewTags.Columns["TermId"].Visible = false; // Hide ID
        }

        private void LoadCommentsForPost(int postId)
        {
            if (_dataService == null || postId == -1)
            {
                dataGridViewComments.DataSource = null;
                return;
            }
            var comments = _dataService.GetCommentsByPostId(postId);
            dataGridViewComments.DataSource = comments;
        }

        private void LoadPostMetaForPost(int postId)
        {
            if (_dataService == null || postId == -1)
            {
                dataGridViewPostMeta.DataSource = null;
                return;
            }
            var postMeta = _dataService.GetPostMetaByPostId(postId);
            dataGridViewPostMeta.DataSource = postMeta;
        }

        private void dataGridViewPosts_SelectionChanged(object sender, EventArgs e)
        {
            if (dataGridViewPosts.SelectedRows.Count > 0)
            {
                var selectedPost = dataGridViewPosts.SelectedRows[0].DataBoundItem as Post;
                if (selectedPost != null)
                {
                    _selectedPostId = selectedPost.PostId; // Update selected post ID
                    string contentToDisplay = selectedPost.CleanedHtmlSource;
                    if (string.IsNullOrWhiteSpace(contentToDisplay))
                    {
                        contentToDisplay = selectedPost.ContentEncoded;
                    }

                    if (!string.IsNullOrWhiteSpace(contentToDisplay))
                    {
                        webBrowserPostContent.DocumentText = contentToDisplay;
                    }
                    else
                    {
                        webBrowserPostContent.DocumentText = "<html><body><h1>No content available.</h1></body></html>";
                    }

                    // Also load comments and post meta for the newly selected post if those tabs are active
                    if (tabControlMain.SelectedTab == tabPageComments)
                    {
                         LoadCommentsForPost(_selectedPostId);
                    }
                    if (tabControlMain.SelectedTab == tabPagePostMeta)
                    {
                        LoadPostMetaForPost(_selectedPostId);
                    }
                }
            }
            else
            {
                _selectedPostId = -1; // No post selected
                webBrowserPostContent.DocumentText = ""; // Clear content if no post is selected
                dataGridViewComments.DataSource = null; // Clear comments
                dataGridViewPostMeta.DataSource = null; // Clear post meta
            }
        }

        private void searchButton_Click(object sender, EventArgs e)
        {
            string searchTerm = searchTextBox.Text.Trim();
            LoadPosts(searchTerm); // Reload posts with search filter
        }

        private void exportMarkdownButton_Click(object sender, EventArgs e)
        {
            if (dataGridViewPosts.SelectedRows.Count > 0)
            {
                var selectedPost = dataGridViewPosts.SelectedRows[0].DataBoundItem as Post;
                if (selectedPost != null)
                {
                    string htmlContent = selectedPost.CleanedHtmlSource;
                    if (string.IsNullOrWhiteSpace(htmlContent))
                    {
                        htmlContent = selectedPost.ContentEncoded;
                    }

                    if (!string.IsNullOrWhiteSpace(htmlContent))
                    {
                        // Convert HTML to Markdown
                        string markdownContent = Markdown.ToMarkdown(htmlContent, new MarkdownPipelineBuilder().Build());

                        using (SaveFileDialog saveFileDialog = new SaveFileDialog())
                        {
                            saveFileDialog.Filter = "Markdown files (*.md)|*.md|All files (*.*)|*.*";
                            saveFileDialog.FileName = $"{selectedPost.PostName}.md";
                            saveFileDialog.Title = "Save Markdown File";

                            if (saveFileDialog.ShowDialog() == DialogResult.OK)
                            {
                                try
                                {
                                    File.WriteAllText(saveFileDialog.FileName, markdownContent);
                                    MessageBox.Show("Export successful!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                                }
                                catch (Exception ex)
                                {
                                    MessageBox.Show($"Error saving file: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                                }
                            }
                        }
                    }
                    else
                    {
                        MessageBox.Show("No content available to export for the selected post.", "Information", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                }
            }
            else
            {
                MessageBox.Show("Please select a post to export.", "Information", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
    }
}
