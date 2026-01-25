using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class PostsViewControl : UserControl
    {
        private SQLiteDataService? _dataService;
        public event EventHandler<int>? PostSelected;

        // Declare controls
        private SplitContainer splitContainerPosts = null!;
        private Panel panelPostSearch = null!;
        private TextBox searchTextBox = null!;
        private Button searchButton = null!;
        private Button exportMarkdownButton = null!;
        private DataGridView dataGridViewPosts = null!;
        private WebBrowser webBrowserPostContent = null!;

        private int currentPage = 1;
        private int pageSize = 20;
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
            InitializeComponent();
            SetupUIControls();
            this.Load += PostsViewControl_Load;

            // Fallback init if not provided by MainForm
            if (_dataService == null)
            {
                try
                {
                    _dataService = new SQLiteDataService("wordpress_extracted_data.db");
                }
                catch (Exception ex)
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
            // SplitContainer
            splitContainerPosts = new SplitContainer
            {
                Dock = DockStyle.Fill,
                Orientation = Orientation.Vertical,
                SplitterDistance = 350
            };
            this.Controls.Add(splitContainerPosts);

            // Filters panel
            Panel panelFilters = new Panel
            {
                Dock = DockStyle.Top,
                Height = 35
            };
            splitContainerPosts.Panel1.Controls.Add(panelFilters);

            categoryFilterComboBox = new ComboBox
            {
                Dock = DockStyle.Left,
                Width = 140,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            categoryFilterComboBox.Items.Add("All Categories");
            categoryFilterComboBox.SelectedIndex = 0;
            categoryFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(categoryFilterComboBox);

            tagFilterComboBox = new ComboBox
            {
                Dock = DockStyle.Left,
                Width = 120,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            tagFilterComboBox.Items.Add("All Tags");
            tagFilterComboBox.SelectedIndex = 0;
            tagFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(tagFilterComboBox);

            authorFilterComboBox = new ComboBox
            {
                Dock = DockStyle.Left,
                Width = 120,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            authorFilterComboBox.Items.Add("All Authors");
            authorFilterComboBox.SelectedIndex = 0;
            authorFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(authorFilterComboBox);

            statusFilterComboBox = new ComboBox
            {
                Dock = DockStyle.Left,
                Width = 120,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            statusFilterComboBox.Items.AddRange(new object[] { "All Statuses", "publish", "draft", "pending", "private" });
            statusFilterComboBox.SelectedIndex = 0;
            statusFilterComboBox.SelectedIndexChanged += filterComboBox_SelectedIndexChanged;
            panelFilters.Controls.Add(statusFilterComboBox);

            // Search + Export panel
            panelPostSearch = new Panel
            {
                Dock = DockStyle.Top,
                Height = 35
            };
            splitContainerPosts.Panel1.Controls.Add(panelPostSearch);

            searchTextBox = new TextBox
            {
                Dock = DockStyle.Fill,
                PlaceholderText = "Search posts..."
            };
            panelPostSearch.Controls.Add(searchTextBox);

            exportMarkdownButton = new Button
            {
                Text = "Export MD",
                Dock = DockStyle.Right,
                Width = 90
            };
            exportMarkdownButton.Click += exportMarkdownButton_Click;
            panelPostSearch.Controls.Add(exportMarkdownButton);

            searchButton = new Button
            {
                Text = "Search",
                Dock = DockStyle.Right,
                Width = 80
            };
            searchButton.Click += searchButton_Click;
            panelPostSearch.Controls.Add(searchButton);

            // Ensure layout order
            panelPostSearch.Controls.SetChildIndex(searchButton, 0);
            panelPostSearch.Controls.SetChildIndex(exportMarkdownButton, 1);
            panelPostSearch.Controls.SetChildIndex(searchTextBox, 2);

            // DataGridView
            dataGridViewPosts = new DataGridView
            {
                Dock = DockStyle.Fill,
                AutoGenerateColumns = false,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize,
                ReadOnly = true,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect,
                MultiSelect = false,
                RowHeadersVisible = false
            };
            dataGridViewPosts.SelectionChanged += dataGridViewPosts_SelectionChanged;
            dataGridViewPosts.ColumnHeaderMouseClick += dataGridViewPosts_ColumnHeaderMouseClick;
            dataGridViewPosts.CellContentClick += dataGridViewPosts_CellContentClick;
            splitContainerPosts.Panel1.Controls.Add(dataGridViewPosts);

            // WebBrowser
            webBrowserPostContent = new WebBrowser { Dock = DockStyle.Fill };
            splitContainerPosts.Panel2.Controls.Add(webBrowserPostContent);

            // Pagination
            panelPagination = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 35
            };
            splitContainerPosts.Panel1.Controls.Add(panelPagination);

            prevButton = new Button
            {
                Text = "Previous",
                Dock = DockStyle.Left,
                Width = 90
            };
            prevButton.Click += prevButton_Click;
            panelPagination.Controls.Add(prevButton);

            nextButton = new Button
            {
                Text = "Next",
                Dock = DockStyle.Right,
                Width = 90
            };
            nextButton.Click += nextButton_Click;
            panelPagination.Controls.Add(nextButton);

            pageSizeComboBox = new ComboBox
            {
                Dock = DockStyle.Right,
                Width = 70,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            pageSizeComboBox.Items.AddRange(new object[] { "10", "20", "50", "100" });
            pageSizeComboBox.SelectedIndex = 1;
            pageSizeComboBox.SelectedIndexChanged += pageSizeComboBox_SelectedIndexChanged;
            panelPagination.Controls.Add(pageSizeComboBox);

            pageLabel = new Label
            {
                Text = "Page 1 of 1",
                Dock = DockStyle.Fill,
                TextAlign = System.Drawing.ContentAlignment.MiddleCenter
            };
            panelPagination.Controls.Add(pageLabel);

            // Ensure layout order
            panelPagination.Controls.SetChildIndex(pageSizeComboBox, 0);
            panelPagination.Controls.SetChildIndex(nextButton, 1);
            panelPagination.Controls.SetChildIndex(pageLabel, 2);
            panelPagination.Controls.SetChildIndex(prevButton, 3);
        }

        private void PostsViewControl_Load(object? sender, EventArgs e)
        {
            PopulateFilterComboBoxes();
            LoadPosts();
        }

        private void PopulateFilterComboBoxes()
        {
            // Always ensure base entries exist
            categoryFilterComboBox.Items.Clear();
            categoryFilterComboBox.Items.Add("All Categories");
            categoryFilterComboBox.SelectedIndex = 0;

            tagFilterComboBox.Items.Clear();
            tagFilterComboBox.Items.Add("All Tags");
            tagFilterComboBox.SelectedIndex = 0;

            authorFilterComboBox.Items.Clear();
            authorFilterComboBox.Items.Add("All Authors");
            authorFilterComboBox.SelectedIndex = 0;

            // If service is missing methods, just skip silently for now.
            if (_dataService == null) return;

            try
            {
                // These methods may not exist yet in your SQLiteDataService.
                // Add them later and this will start working automatically.
                var categories = TryGetCategories();
                foreach (var c in categories)
                    categoryFilterComboBox.Items.Add(c.Nicename);

                var tags = TryGetTags();
                foreach (var t in tags)
                    tagFilterComboBox.Items.Add(t.Nicename);

                var authors = TryGetAuthors();
                foreach (var a in authors)
                    authorFilterComboBox.Items.Add(a.Login);
            }
            catch
            {
                // Intentionally ignore until the service supports these.
            }
        }

        // ---- Main load logic ----
        public void LoadPosts(string searchTerm = "")
        {
            if (_dataService == null) return;

            string? categoryNicename = categoryFilterComboBox.SelectedItem?.ToString();
            if (categoryNicename == "All Categories") categoryNicename = null;

            string? tagNicename = tagFilterComboBox.SelectedItem?.ToString();
            if (tagNicename == "All Tags") tagNicename = null;

            string? authorLogin = authorFilterComboBox.SelectedItem?.ToString();
            if (authorLogin == "All Authors") authorLogin = null;

            string? postStatus = statusFilterComboBox.SelectedItem?.ToString();
            if (postStatus == "All Statuses") postStatus = null;

            // Ensure currentPage always valid
            totalPosts = _dataService.GetPostCount(searchTerm, categoryNicename, tagNicename, authorLogin, postStatus, currentSortColumn, currentSortOrder);
            totalPages = (int)Math.Ceiling((double)totalPosts / pageSize);

            if (totalPages <= 0)
                currentPage = 0;
            else if (currentPage <= 0)
                currentPage = 1;
            else if (currentPage > totalPages)
                currentPage = totalPages;

            int offset = (currentPage - 1) * pageSize;
            if (offset < 0) offset = 0;

            dataGridViewPosts.Columns.Clear();

            AddOrUpdateColumn(dataGridViewPosts, "Title", "Title", true, 220);
            AddOrUpdateColumn(dataGridViewPosts, "PostType", "Type", true, 70);
            AddOrUpdateColumn(dataGridViewPosts, "PostDate", "Date", true, 120);
            AddOrUpdateColumn(dataGridViewPosts, "Creator", "Author", true, 110);
            AddOrUpdateColumn(dataGridViewPosts, "Status", "Status", true, 80);
            AddOrUpdateColumn(dataGridViewPosts, "PostName", "Slug", true, 170);

            // Hidden
            AddOrUpdateColumn(dataGridViewPosts, "Link", "Link", false);
            AddOrUpdateColumn(dataGridViewPosts, "PostId", "ID", false);
            AddOrUpdateColumn(dataGridViewPosts, "CleanedHtmlSource", "Cleaned HTML", false);
            AddOrUpdateColumn(dataGridViewPosts, "ContentEncoded", "Content HTML", false);
            AddOrUpdateColumn(dataGridViewPosts, "Comments", "Comments", false);
            AddOrUpdateColumn(dataGridViewPosts, "PostMeta", "Post Meta", false);
            AddOrUpdateColumn(dataGridViewPosts, "Categories", "Categories", false);
            AddOrUpdateColumn(dataGridViewPosts, "Tags", "Tags", false);

            var posts = _dataService.GetPosts(searchTerm, categoryNicename, tagNicename, authorLogin, postStatus, currentSortColumn, currentSortOrder, pageSize, offset);
            dataGridViewPosts.DataSource = posts;

            UpdatePaginationControls();

            foreach (DataGridViewColumn column in dataGridViewPosts.Columns)
                column.HeaderCell.SortGlyphDirection = SortOrder.None;

            // Show glyph on current sort column if present
            foreach (DataGridViewColumn col in dataGridViewPosts.Columns)
            {
                if (col.DataPropertyName.Equals(currentSortColumn, StringComparison.OrdinalIgnoreCase))
                {
                    col.HeaderCell.SortGlyphDirection = (currentSortOrder == "ASC")
                        ? SortOrder.Ascending
                        : SortOrder.Descending;
                    break;
                }
            }
        }

        private void UpdatePaginationControls()
        {
            pageLabel.Text = totalPages > 0 ? $"Page {currentPage} of {totalPages}" : "No Posts";
            prevButton.Enabled = currentPage > 1;
            nextButton.Enabled = currentPage > 0 && currentPage < totalPages;
        }

        // ---- Events ----
        private void filterComboBox_SelectedIndexChanged(object? sender, EventArgs e)
        {
            currentPage = 1;
            LoadPosts(searchTextBox.Text.Trim());
        }

        private void pageSizeComboBox_SelectedIndexChanged(object? sender, EventArgs e)
        {
            if (int.TryParse(pageSizeComboBox.SelectedItem?.ToString(), out int newSize))
            {
                pageSize = newSize;
                currentPage = 1;
                LoadPosts(searchTextBox.Text.Trim());
            }
        }

        private void prevButton_Click(object? sender, EventArgs e)
        {
            if (currentPage > 1)
            {
                currentPage--;
                LoadPosts(searchTextBox.Text.Trim());
            }
        }

        private void nextButton_Click(object? sender, EventArgs e)
        {
            if (currentPage < totalPages)
            {
                currentPage++;
                LoadPosts(searchTextBox.Text.Trim());
            }
        }

        private void searchButton_Click(object? sender, EventArgs e)
        {
            currentPage = 1;
            LoadPosts(searchTextBox.Text.Trim());
        }

        private void dataGridViewPosts_ColumnHeaderMouseClick(object? sender, DataGridViewCellMouseEventArgs e)
        {
            if (e.ColumnIndex < 0) return;

            var col = dataGridViewPosts.Columns[e.ColumnIndex];
            if (col.DataPropertyName == null) return;

            string newSortColumn = col.DataPropertyName;

            if (currentSortColumn.Equals(newSortColumn, StringComparison.OrdinalIgnoreCase))
                currentSortOrder = (currentSortOrder == "ASC") ? "DESC" : "ASC";
            else
            {
                currentSortColumn = newSortColumn;
                currentSortOrder = "ASC";
            }

            currentPage = 1;
            LoadPosts(searchTextBox.Text.Trim());
        }

        private void dataGridViewPosts_SelectionChanged(object? sender, EventArgs e)
        {
            if (dataGridViewPosts.SelectedRows.Count <= 0)
            {
                PostSelected?.Invoke(this, -1);
                webBrowserPostContent.DocumentText = "";
                return;
            }

            var selectedPost = dataGridViewPosts.SelectedRows[0].DataBoundItem as Post;
            if (selectedPost == null) return;

            PostSelected?.Invoke(this, selectedPost.PostId);

            string contentToDisplay = selectedPost.CleanedHtmlSource;
            if (string.IsNullOrWhiteSpace(contentToDisplay))
                contentToDisplay = selectedPost.ContentEncoded;

            webBrowserPostContent.DocumentText = !string.IsNullOrWhiteSpace(contentToDisplay)
                ? contentToDisplay
                : "<html><body><h3>No content available.</h3></body></html>";
        }

        private void dataGridViewPosts_CellContentClick(object? sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0 || e.ColumnIndex < 0) return;

            DataGridViewColumn column = dataGridViewPosts.Columns[e.ColumnIndex];
            var val = dataGridViewPosts[e.ColumnIndex, e.RowIndex].Value;
            if (val == null || column.DataPropertyName == null) return;

            string cellValue = val.ToString() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(cellValue) || cellValue.Equals("N/A", StringComparison.OrdinalIgnoreCase))
                return;

            // Reset filters
            categoryFilterComboBox.SelectedIndex = 0;
            tagFilterComboBox.SelectedIndex = 0;
            authorFilterComboBox.SelectedIndex = 0;
            statusFilterComboBox.SelectedIndex = 0;

            switch (column.DataPropertyName)
            {
                case "Creator":
                    {
                        int idx = authorFilterComboBox.FindStringExact(cellValue);
                        if (idx != ListBox.NoMatches) authorFilterComboBox.SelectedIndex = idx;
                        break;
                    }
                case "Status":
                    {
                        int idx = statusFilterComboBox.FindStringExact(cellValue);
                        if (idx != ListBox.NoMatches) statusFilterComboBox.SelectedIndex = idx;
                        break;
                    }
                // NOTE: Categories/Tags display depends on how your Post model binds these.
            }

            currentPage = 1;
            LoadPosts(searchTextBox.Text.Trim());
        }

        private void exportMarkdownButton_Click(object? sender, EventArgs e)
        {
            if (dataGridViewPosts.SelectedRows.Count <= 0)
            {
                MessageBox.Show("Select a post first.", "Export", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            var selectedPost = dataGridViewPosts.SelectedRows[0].DataBoundItem as Post;
            if (selectedPost == null)
                return;

            string htmlContent = selectedPost.CleanedHtmlSource;
            if (string.IsNullOrWhiteSpace(htmlContent))
                htmlContent = selectedPost.ContentEncoded;

            if (string.IsNullOrWhiteSpace(htmlContent))
            {
                MessageBox.Show("This post has no content to export.", "Export", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string markdownContent = ConvertHtmlToMarkdownSimple(htmlContent);

            using (SaveFileDialog saveFileDialog = new SaveFileDialog())
            {
                saveFileDialog.Filter = "Markdown files (*.md)|*.md|Text files (*.txt)|*.txt|All files (*.*)|*.*";
                saveFileDialog.FileName = $"{SafeFileName(selectedPost.PostName ?? selectedPost.Title ?? "post")}.md";
                saveFileDialog.Title = "Save Markdown File";

                if (saveFileDialog.ShowDialog() == DialogResult.OK)
                {
                    try
                    {
                        File.WriteAllText(saveFileDialog.FileName, markdownContent, Encoding.UTF8);
                        MessageBox.Show("Export successful!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(
                            "An error occurred while saving the Markdown file.\n\n" + ex.Message,
                            "Export Error",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                    }
                }
            }
        }

        // ---- Helpers ----
        private static void AddOrUpdateColumn(DataGridView grid, string dataPropertyName, string headerText, bool visible, int? width = null)
        {
            var col = new DataGridViewTextBoxColumn
            {
                DataPropertyName = dataPropertyName,
                HeaderText = headerText,
                Name = dataPropertyName,
                Visible = visible,
                ReadOnly = true
            };

            if (width.HasValue)
                col.Width = width.Value;

            grid.Columns.Add(col);
        }

        /// <summary>
        /// Simple HTML -> Markdown-ish conversion (not perfect, but good enough until you add a real converter).
        /// </summary>
        private static string ConvertHtmlToMarkdownSimple(string html)
        {
            if (string.IsNullOrWhiteSpace(html)) return string.Empty;

            string text = html;

            // Basic block tags -> newlines
            text = Regex.Replace(text, @"<(br|BR)\s*/?>", "\n");
            text = Regex.Replace(text, @"</(p|div|h1|h2|h3|h4|h5|h6)>", "\n\n", RegexOptions.IgnoreCase);

            // Headings
            text = Regex.Replace(text, @"<h1[^>]*>(.*?)</h1>", "# $1\n\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            text = Regex.Replace(text, @"<h2[^>]*>(.*?)</h2>", "## $1\n\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            text = Regex.Replace(text, @"<h3[^>]*>(.*?)</h3>", "### $1\n\n", RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // Bold / italic
            text = Regex.Replace(text, @"<(strong|b)[^>]*>(.*?)</(strong|b)>", "**$2**", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            text = Regex.Replace(text, @"<(em|i)[^>]*>(.*?)</(em|i)>", "*$2*", RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // Links
            text = Regex.Replace(text, @"<a[^>]*href\s*=\s*[""']([^""']+)[""'][^>]*>(.*?)</a>", "[$2]($1)", RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // Strip remaining tags
            text = Regex.Replace(text, @"<[^>]+>", string.Empty);

            // Decode common entities
            text = System.Net.WebUtility.HtmlDecode(text);

            // Normalize whitespace
            text = Regex.Replace(text, @"\n{3,}", "\n\n");
            return text.Trim();
        }

        private static string SafeFileName(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "post";
            foreach (char c in Path.GetInvalidFileNameChars())
                raw = raw.Replace(c, '_');
            return raw.Trim();
        }

        // These are placeholders until your SQLiteDataService implements them.
        private List<Category> TryGetCategories()
        {
            // If you later add _dataService.GetCategories(), replace this method body.
            return new List<Category>();
        }

        private List<Tag> TryGetTags()
        {
            // If you later add _dataService.GetTags(), replace this method body.
            return new List<Tag>();
        }

        private List<Author> TryGetAuthors()
        {
            // If you later add _dataService.GetAuthors(), replace this method body.
            return new List<Author>();
        }
    }
}
