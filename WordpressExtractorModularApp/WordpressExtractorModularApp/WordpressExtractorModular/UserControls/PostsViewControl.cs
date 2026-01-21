using System;
using System.Collections.Generic;
using System.IO;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;
using Markdig; // For Markdown export, will add package later

namespace WordpressExtractor.UserControls
{
    public partial class PostsViewControl : UserControl
    {
        private SQLiteDataService _dataService;
        public event EventHandler<int> PostSelected; // Event to notify parent form about selected post

        // Declare controls
        private SplitContainer splitContainerPosts;
        private Panel panelPostSearch;
        private TextBox searchTextBox;
        private Button searchButton;
        private Button exportMarkdownButton;
        private DataGridView dataGridViewPosts;
        private WebBrowser webBrowserPostContent;

        public PostsViewControl()
        {
            InitializeComponent(); // This will be from PostsViewControl.Designer.cs
            SetupUIControls(); // Custom setup of controls
            this.Load += PostsViewControl_Load; // Hook the Load event

            // Initialize data service in the constructor to ensure it's available
            // The MainForm will pass its instance, but for testing or standalone, this is a fallback
            if (_dataService == null) 
            {
                try
                {
                    _dataService = new SQLiteDataService("wordpress_extracted_data.db");
                }
                catch (FileNotFoundException ex)
                {
                    MessageBox.Show(ex.Message, "Database Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        public PostsViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            // Set up SplitContainer
            splitContainerPosts = new SplitContainer();
            splitContainerPosts.Dock = DockStyle.Fill;
            splitContainerPosts.Orientation = Orientation.Vertical;
            splitContainerPosts.SplitterDistance = 300;
            this.Controls.Add(splitContainerPosts);

            // Panel for search and export controls
            panelPostSearch = new Panel();
            panelPostSearch.Dock = DockStyle.Top;
            panelPostSearch.Height = 35;
            splitContainerPosts.Panel1.Controls.Add(panelPostSearch);

            searchTextBox = new TextBox();
            searchTextBox.Dock = DockStyle.Fill;
            searchTextBox.PlaceholderText = "Search posts..."; // Requires .NET 5 or higher
            panelPostSearch.Controls.Add(searchTextBox);

            searchButton = new Button();
            searchButton.Text = "Search";
            searchButton.Dock = DockStyle.Right;
            searchButton.Width = 75;
            searchButton.Click += searchButton_Click;
            panelPostSearch.Controls.Add(searchButton);

            exportMarkdownButton = new Button();
            exportMarkdownButton.Text = "Export MD";
            exportMarkdownButton.Dock = DockStyle.Right;
            exportMarkdownButton.Width = 80;
            exportMarkdownButton.Click += exportMarkdownButton_Click;
            panelPostSearch.Controls.Add(exportMarkdownButton);
            
            // Re-order controls for proper layout (search box left, export then search button right)
            panelPostSearch.Controls.SetChildIndex(searchButton, 0);
            panelPostSearch.Controls.SetChildIndex(exportMarkdownButton, 1);
            panelPostSearch.Controls.SetChildIndex(searchTextBox, 2);


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
        }

        private void PostsViewControl_Load(object sender, EventArgs e)
        {
            LoadPosts();
        }

        public void LoadPosts(string searchTerm = "")
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
            if (dataGridViewPosts.Columns.Contains("Comments"))
                dataGridViewPosts.Columns["Comments"].Visible = false; // Hide navigation property
            if (dataGridViewPosts.Columns.Contains("PostMeta"))
                dataGridViewPosts.Columns["PostMeta"].Visible = false; // Hide navigation property
            if (dataGridViewPosts.Columns.Contains("Categories"))
                dataGridViewPosts.Columns["Categories"].Visible = false; // Hide navigation property
            if (dataGridViewPosts.Columns.Contains("Tags"))
                dataGridViewPosts.Columns["Tags"].Visible = false; // Hide navigation property
        }

        private void dataGridViewPosts_SelectionChanged(object sender, EventArgs e)
        {
            if (dataGridViewPosts.SelectedRows.Count > 0)
            {
                var selectedPost = dataGridViewPosts.SelectedRows[0].DataBoundItem as Post;
                if (selectedPost != null)
                {
                    // Raise the event to notify parent form
                    PostSelected?.Invoke(this, selectedPost.PostId);

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
                }
            }
            else
            {
                PostSelected?.Invoke(this, -1); // Notify no post selected
                webBrowserPostContent.DocumentText = ""; // Clear content if no post is selected
            }
        }

        private void searchButton_Click(object sender, EventArgs e)
        {
            string searchTerm = searchTextBox.Text.Trim();
            LoadPosts(searchTerm);
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
                        // Convert HTML to Markdown (using an external tool/library if Markdig is not suitable)
                        // For now, let's just save the HTML as a text file.
                        // If Markdig was needed, it would be installed here.
                        // string markdownContent = Markdown.ToMarkdown(htmlContent, new MarkdownPipelineBuilder().Build());
                        string markdownContent = ConvertHtmlToMarkdownSimple(htmlContent);


                        using (SaveFileDialog saveFileDialog = new SaveFileDialog())
                        {
                            saveFileDialog.Filter = "Markdown files (*.md)|*.md|Text files (*.txt)|*.txt|All files (*.*)|*.*";
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

        // Simple HTML to Markdown conversion (very basic, can be improved)
        private string ConvertHtmlToMarkdownSimple(string html)
        {
            // Remove HTML tags using regex
            string plainText = System.Text.RegularExpressions.Regex.Replace(html, "<[^>]*>", "");
            // Replace common HTML entities
            plainText = plainText.Replace("&nbsp;", " ").Replace("&amp;", "&").Replace("&lt;", "<").Replace("&gt;", ">");
            return plainText;
        }
    }
}
