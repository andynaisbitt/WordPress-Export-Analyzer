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
        private SQLiteDataService? _dataService;
        public event EventHandler<int>? PostSelected; // Event to notify parent form about selected post

        // Declare controls
        private SplitContainer splitContainerPosts = null!;
        private Panel panelPostSearch = null!;
        private TextBox searchTextBox = null!;
        private Button searchButton = null!;
        private Button exportMarkdownButton = null!;
        private DataGridView dataGridViewPosts = null!;
        private WebBrowser webBrowserPostContent = null!;

        private int currentPage = 1;
        private int pageSize = 20; // Default page size
        private int totalPosts = 0;
        private int totalPages = 0;

        private Panel panelPagination = null!;
        private Button prevButton = null!;
        private Button nextButton = null!;
        private Label pageLabel = null!;
        private ComboBox pageSizeComboBox = null!;

        private ComboBox categoryFilterComboBox = null!;
        private ComboBox tagFilterComboBox = null!;
        private ComboBox authorFilterComboBox = null!;
        private ComboBox statusFilterComboBox = null!;

        private string currentSortColumn = "post_date";
        private string currentSortOrder = "DESC";

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

            // *** Filters Panel ***
            Panel panelFilters = new Panel();
            panelFilters.Dock = DockStyle.Top;
            panelFilters.Height = 35; // Adjusted height for single row of filters
            splitContainerPosts.Panel1.Controls.Add(panelFilters); // Add filters panel first

            categoryFilterComboBox = new ComboBox();
            categoryFilterComboBox.Dock = DockStyle.Left;
            categoryFilterComboBox.Width = 120;
            categoryFilterComboBox.Items.Add("All Categories");
            categoryFilterComboBox.SelectedIndex = 0;
            categoryFilterComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            categoryFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(categoryFilterComboBox);

            tagFilterComboBox = new ComboBox();
            tagFilterComboBox.Dock = DockStyle.Left;
            tagFilterComboBox.Width = 120;
            tagFilterComboBox.Items.Add("All Tags");
            tagFilterComboBox.SelectedIndex = 0;
            tagFilterComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            tagFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(tagFilterComboBox);

            authorFilterComboBox = new ComboBox();
            authorFilterComboBox.Dock = DockStyle.Left;
            authorFilterComboBox.Width = 120;
            authorFilterComboBox.Items.Add("All Authors");
            authorFilterComboBox.SelectedIndex = 0;
            authorFilterComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            authorFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(authorFilterComboBox);

            statusFilterComboBox = new ComboBox();
            statusFilterComboBox.Dock = DockStyle.Left;
            statusFilterComboBox.Width = 120;
            statusFilterComboBox.Items.AddRange(new object[] { "All Statuses", "publish", "draft", "pending", "private" });
            statusFilterComboBox.SelectedIndex = 0;
            statusFilterComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            statusFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(statusFilterComboBox);


            // *** Panel for search and export controls ***
            panelPostSearch = new Panel();
            panelPostSearch.Dock = DockStyle.Top;
            panelPostSearch.Height = 35;
            splitContainerPosts.Panel1.Controls.Add(panelPostSearch); // Add search panel next

            searchTextBox = new TextBox();
            searchTextBox.Dock = DockStyle.Fill;
            searchTextBox.PlaceholderText = "Search posts...";
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
            dataGridViewPosts.Dock = DockStyle.Fill; // Fill the remaining space
            dataGridViewPosts.AutoGenerateColumns = false; // Prevent auto-generation to control columns explicitly
            dataGridViewPosts.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewPosts.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewPosts.ReadOnly = true;
            dataGridViewPosts.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewPosts.MultiSelect = false;
            dataGridViewPosts.RowHeadersVisible = false;
            // Removed dataGridViewPosts.Location as DockStyle.Fill handles placement
            dataGridViewPosts.SelectionChanged += dataGridViewPosts_SelectionChanged;
            dataGridViewPosts.ColumnHeaderMouseClick += dataGridViewPosts_ColumnHeaderMouseClick; 
            splitContainerPosts.Panel1.Controls.Add(dataGridViewPosts);


            // WebBrowser for Post Content
            webBrowserPostContent = new WebBrowser();
            webBrowserPostContent.Dock = DockStyle.Fill;
            splitContainerPosts.Panel2.Controls.Add(webBrowserPostContent);

            // Pagination Panel
            panelPagination = new Panel();
            panelPagination.Dock = DockStyle.Bottom;
            panelPagination.Height = 35;
            splitContainerPosts.Panel1.Controls.Add(panelPagination);

            prevButton = new Button();
            prevButton.Text = "Previous";
            prevButton.Dock = DockStyle.Left;
            prevButton.Click += prevButton_Click;
            panelPagination.Controls.Add(prevButton);

            nextButton = new Button();
            nextButton.Text = "Next";
            nextButton.Dock = DockStyle.Right;
            nextButton.Click += nextButton_Click;
            panelPagination.Controls.Add(nextButton);

            pageLabel = new Label();
            pageLabel.Text = "Page 1 of 1";
            pageLabel.Dock = DockStyle.Fill;
            pageLabel.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            panelPagination.Controls.Add(pageLabel);

            pageSizeComboBox = new ComboBox();
            pageSizeComboBox.Dock = DockStyle.Right;
            pageSizeComboBox.Width = 60;
            pageSizeComboBox.Items.AddRange(new object[] { "10", "20", "50", "100" });
            pageSizeComboBox.SelectedIndex = 1; // Default to 20
            pageSizeComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            pageSizeComboBox.SelectedIndexChanged += pageSizeComboBox_SelectedIndexChanged;
            panelPagination.Controls.Add(pageSizeComboBox);

            // Re-order controls for proper layout
            panelPagination.Controls.SetChildIndex(pageSizeComboBox, 0);
            panelPagination.Controls.SetChildIndex(nextButton, 1);
            panelPagination.Controls.SetChildIndex(pageLabel, 2);
            panelPagination.Controls.SetChildIndex(prevButton, 3);
        }

        private void PopulateFilterComboBoxes()
        {
            if (_dataService == null) return;

            // Categories
            categoryFilterComboBox.Items.Clear();
            categoryFilterComboBox.Items.Add("All Categories");
            foreach (var category in _dataService.GetCategories())
            {
                categoryFilterComboBox.Items.Add(category.Nicename);
            }
            categoryFilterComboBox.SelectedIndex = 0;

            // Tags
            tagFilterComboBox.Items.Clear();
            tagFilterComboBox.Items.Add("All Tags");
            foreach (var tag in _dataService.GetTags())
            {
                tagFilterComboBox.Items.Add(tag.Nicename);
            }
            tagFilterComboBox.SelectedIndex = 0;

            // Authors
            authorFilterComboBox.Items.Clear();
            authorFilterComboBox.Items.Add("All Authors");
            foreach (var author in _dataService.GetAuthors())
            {
                authorFilterComboBox.Items.Add(author.Login); // Using Login for author filter
            }
            authorFilterComboBox.SelectedIndex = 0;

            // Statuses are static, so no need to populate from DB
        }

        private void PostsViewControl_Load(object? sender, EventArgs e) // Made sender nullable
        {
            PopulateFilterComboBoxes(); // Populate filters before loading posts
            LoadPosts();
        }

        public void LoadPosts(string searchTerm = "")
        {
            if (_dataService == null) return;

            // Get filter values from ComboBoxes
            string? categoryNicename = categoryFilterComboBox.SelectedItem?.ToString();
            if (categoryNicename == "All Categories") categoryNicename = null;

            string? tagNicename = tagFilterComboBox.SelectedItem?.ToString();
            if (tagNicename == "All Tags") tagNicename = null;

            string? authorLogin = authorFilterComboBox.SelectedItem?.ToString();
            if (authorLogin == "All Authors") authorLogin = null;

            string? postStatus = statusFilterComboBox.SelectedItem?.ToString();
            if (postStatus == "All Statuses") postStatus = null;

            totalPosts = _dataService.GetPostCount(searchTerm, categoryNicename, tagNicename, authorLogin, postStatus, currentSortColumn, currentSortOrder);
            totalPages = (int)Math.Ceiling((double)totalPosts / pageSize);

            if (currentPage > totalPages && totalPages > 0)
            {
                currentPage = totalPages;
            }
            else if (totalPages == 0)
            {
                currentPage = 0;
            }
            else if (currentPage == 0 && totalPages > 0) // Handle case where currentPage might be 0 initially
            {
                currentPage = 1;
            }

            int offset = (currentPage - 1) * pageSize;
            if (offset < 0) offset = 0; // Ensure offset is not negative

            dataGridViewPosts.Columns.Clear(); // Clear existing columns if any

            // Define columns
            AddOrUpdateColumn(dataGridViewPosts, "Title", "Title", true, 200);
            AddOrUpdateColumn(dataGridViewPosts, "PostType", "Type", true, 80);
            AddOrUpdateColumn(dataGridViewPosts, "PostDate", "Date", true, 120);
            AddOrUpdateColumn(dataGridViewPosts, "Creator", "Author", true, 100);
            AddOrUpdateColumn(dataGridViewPosts, "Status", "Status", true, 80);
            AddOrUpdateColumn(dataGridViewPosts, "PostName", "Slug", true, 150); // Make PostName visible
            AddOrUpdateColumn(dataGridViewPosts, "Link", "Link", false); // Keep Link hidden, but manage it
            AddOrUpdateColumn(dataGridViewPosts, "PostId", "ID", false); // Keep PostId hidden

            // Hide verbose/navigation properties
            AddOrUpdateColumn(dataGridViewPosts, "CleanedHtmlSource", "Cleaned HTML", false);
            AddOrUpdateColumn(dataGridViewPosts, "ContentEncoded", "Content HTML", false);
            AddOrUpdateColumn(dataGridViewPosts, "Comments", "Comments", false);
            AddOrUpdateColumn(dataGridViewPosts, "PostMeta", "Post Meta", false);
            AddOrUpdateColumn(dataGridViewPosts, "Categories", "Categories", false);
            AddOrUpdateColumn(dataGridViewPosts, "Tags", "Tags", false);

            var posts = _dataService.GetPosts(searchTerm, categoryNicename, tagNicename, authorLogin, postStatus, currentSortColumn, currentSortOrder, pageSize, offset);
            dataGridViewPosts.DataSource = posts;

            UpdatePaginationControls();

            // Visually indicate sort order after data binding
            foreach (DataGridViewColumn column in dataGridViewPosts.Columns)
            {
                column.HeaderCell.SortGlyphDirection = SortOrder.None;
            }
            // Find the column by its DataPropertyName
            DataGridViewColumn? targetColumn = null;
            foreach (DataGridViewColumn col in dataGridViewPosts.Columns)
            {
                if (col.DataPropertyName.Equals(currentSortColumn, StringComparison.OrdinalIgnoreCase))
                {
                    targetColumn = col;
                    break;
                }
            }
            if (targetColumn != null)
            {
                targetColumn.HeaderCell.SortGlyphDirection = 
                    (currentSortOrder == "ASC") ? SortOrder.Ascending : SortOrder.Descending;
            }
        }

        private void UpdatePaginationControls()
        {
            pageLabel.Text = totalPages > 0 ? $"Page {currentPage} of {totalPages}" : "No Posts";
            prevButton.Enabled = currentPage > 1;
            nextButton.Enabled = currentPage < totalPages;
        }

        private void dataGridViewPosts_ColumnHeaderMouseClick(object? sender, DataGridViewCellMouseEventArgs e)
        {
            if (e.ColumnIndex >= 0 && dataGridViewPosts.Columns[e.ColumnIndex].DataPropertyName != null)
            {
                string newSortColumn = dataGridViewPosts.Columns[e.ColumnIndex].DataPropertyName;

                // Map UI column names to DB column names if they differ
                // For now, assuming DataPropertyName matches DB column names directly for simplicity
                // A more robust solution might use a dictionary mapping or attributes.
                // Or better, ensure DataPropertyName values match the DB column names used in SQL queries.

                if (currentSortColumn.Equals(newSortColumn, StringComparison.OrdinalIgnoreCase))
                {
                    // Toggle sort order
                    currentSortOrder = (currentSortOrder == "ASC") ? "DESC" : "ASC";
                }
                else
                {
                    // New column selected, default to ascending
                    currentSortColumn = newSortColumn;
                    currentSortOrder = "ASC";
                }
                
                // Reset page to 1 when sorting changes
                currentPage = 1;

                LoadPosts(searchTextBox.Text.Trim()); // Reload posts with new sorting
            }
        }

        private void dataGridViewPosts_SelectionChanged(object? sender, EventArgs e) // Made sender nullable
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

        private void searchButton_Click(object? sender, EventArgs e) // Made sender nullable
        {
            currentPage = 1; // Reset to first page on new search
            LoadPosts(searchTextBox.Text.Trim());
        }

        private void exportMarkdownButton_Click(object? sender, EventArgs e) // Made sender nullable
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

        private void filterComboBox_SelectedIndexChanged(object? sender, EventArgs e)
        {
            currentPage = 1; // Reset to first page on new filter selection
            LoadPosts(searchTextBox.Text.Trim());
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

        private void prevButton_Click(object? sender, EventArgs e)
        {
            if (currentPage > 1)
            {
                currentPage--;
                LoadPosts();
            }
        }

        private void nextButton_Click(object? sender, EventArgs e)
        {
            if (currentPage < totalPages)
            {
                currentPage++;
                LoadPosts();
            }
        }

        private void pageSizeComboBox_SelectedIndexChanged(object? sender, EventArgs e)
        {
            if (pageSizeComboBox.SelectedItem != null)
            {
                if (int.TryParse(pageSizeComboBox.SelectedItem.ToString(), out int newPageSize))
                {
                    pageSize = newPageSize;
                    currentPage = 1; // Reset to first page when page size changes
                    LoadPosts();
                }
            }
        }

        private void AddOrUpdateColumn(DataGridView dgv, string dataPropertyName, string headerText, bool visible, int? width = null)
        {
            if (!dgv.Columns.Contains(dataPropertyName))
            {
                DataGridViewTextBoxColumn column = new DataGridViewTextBoxColumn();
                column.DataPropertyName = dataPropertyName;
                column.HeaderText = headerText;
                column.Name = dataPropertyName; // Use DataPropertyName as Name for easier lookup
                column.Visible = visible;
                if (width.HasValue)
                {
                    column.Width = width.Value;
                    column.AutoSizeMode = DataGridViewAutoSizeColumnMode.None; // Manual width
                }
                else
                {
                    column.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill;
                }
                dgv.Columns.Add(column);
            }
            else
            {
                // Update existing column properties
                dgv.Columns[dataPropertyName]!.HeaderText = headerText;
                dgv.Columns[dataPropertyName]!.Visible = visible;
                if (width.HasValue)
                {
                    dgv.Columns[dataPropertyName]!.Width = width.Value;
                    dgv.Columns[dataPropertyName]!.AutoSizeMode = DataGridViewAutoSizeColumnMode.None;
                }
                else
                {
                    dgv.Columns[dataPropertyName]!.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill;
                }
            }
        }
    }
}
