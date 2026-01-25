using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;
using System.Linq; // Added for sorting later, but useful here too

namespace WordpressExtractor.UserControls
{
    public partial class InternalLinksViewControl : UserControl
    {
        private SQLiteDataService? _dataService;
        private DataGridView dataGridViewInternalLinks = null!;

        // Pagination controls
        private Button btnPrevious = null!;
        private Button btnNext = null!;
        private Label lblPageInfo = null!;

        // Pagination state
        private int _currentPage = 1;
        private int _itemsPerPage = 50; // Default items per page
        private int _totalItems = 0;
        private int _totalPages => (int)Math.Ceiling((double)_totalItems / _itemsPerPage);

        // Sorting state
        private string _sortColumn = "SourcePostTitle"; // Default sort column
        private SortOrder _sortDirection = SortOrder.Ascending; // Default sort direction


        public InternalLinksViewControl()
        {
            InitializeComponent(); // This will be from InternalLinksViewControl.Designer.cs
            SetupUIControls();
            this.Load += InternalLinksViewControl_Load;

            // Fallback for data service, ideally passed from parent
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

        public InternalLinksViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            // DataGridView setup
            dataGridViewInternalLinks = new DataGridView();
            dataGridViewInternalLinks.Dock = DockStyle.Fill;
            dataGridViewInternalLinks.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewInternalLinks.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewInternalLinks.ReadOnly = true;
            dataGridViewInternalLinks.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewInternalLinks.MultiSelect = false;
            dataGridViewInternalLinks.RowHeadersVisible = false;

            // Subscribe to the ColumnHeaderMouseClick event for sorting
            dataGridViewInternalLinks.ColumnHeaderMouseClick += DataGridViewInternalLinks_ColumnHeaderMouseClick;
            //this.Controls.Add(dataGridViewInternalLinks); // Add later with pagination controls

            // Pagination controls setup
            btnPrevious = new Button { Text = "Previous", Enabled = false };
            btnNext = new Button { Text = "Next", Enabled = false };
            lblPageInfo = new Label { Text = "Page X of Y", AutoSize = true };

            btnPrevious.Click += BtnPrevious_Click;
            btnNext.Click += BtnNext_Click;

            // Layout for pagination controls
            var paginationPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Bottom,
                FlowDirection = FlowDirection.RightToLeft, // Align buttons to the right
                Height = 30
            };
            paginationPanel.Controls.Add(btnNext);
            paginationPanel.Controls.Add(lblPageInfo);
            paginationPanel.Controls.Add(btnPrevious);

            // Main layout panel
            var mainPanel = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                RowCount = 2,
                ColumnCount = 1
            };
            mainPanel.RowStyles.Add(new RowStyle(SizeType.Percent, 100)); // DataGridView takes most space
            mainPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 30)); // Pagination panel fixed height

            mainPanel.Controls.Add(dataGridViewInternalLinks, 0, 0);
            mainPanel.Controls.Add(paginationPanel, 0, 1);

            this.Controls.Add(mainPanel);
        }

        private void InternalLinksViewControl_Load(object? sender, EventArgs e)
        {
            _totalItems = _dataService?.GetInternalLinksCount() ?? 0;
            UpdatePaginationControls();
            LoadInternalLinks();
        }

        public void LoadInternalLinks()
        {
            if (_dataService == null) return;

            var offset = (_currentPage - 1) * _itemsPerPage;
            var internalLinks = _dataService.GetInternalLinks(_itemsPerPage, offset);

            // Apply sorting
            if (_sortDirection == SortOrder.Ascending)
            {
                internalLinks = internalLinks.OrderBy(il => GetPropertyValue(il, _sortColumn)).ToList();
            }
            else
            {
                internalLinks = internalLinks.OrderByDescending(il => GetPropertyValue(il, _sortColumn)).ToList();
            }

            dataGridViewInternalLinks.DataSource = internalLinks;

            ApplyColumnFormatting();
            UpdatePaginationControls();
        }

        private object GetPropertyValue(InternalLink link, string propertyName)
        {
            return typeof(InternalLink).GetProperty(propertyName)?.GetValue(link, null) ?? string.Empty;
        }

        private void ApplyColumnFormatting()
        {
            if (dataGridViewInternalLinks.Columns.Contains("Id"))
                dataGridViewInternalLinks.Columns["Id"]!.Visible = false;
            if (dataGridViewInternalLinks.Columns.Contains("SourcePostId"))
                dataGridViewInternalLinks.Columns["SourcePostId"]!.Visible = false;
            if (dataGridViewInternalLinks.Columns.Contains("TargetPostId"))
                dataGridViewInternalLinks.Columns["TargetPostId"]!.Visible = false;

            if (dataGridViewInternalLinks.Columns.Contains("SourcePostTitle"))
                dataGridViewInternalLinks.Columns["SourcePostTitle"]!.HeaderText = "Source Post";
            if (dataGridViewInternalLinks.Columns.Contains("TargetPostTitle"))
                dataGridViewInternalLinks.Columns["TargetPostTitle"]!.HeaderText = "Target Post";
            if (dataGridViewInternalLinks.Columns.Contains("AnchorText"))
                dataGridViewInternalLinks.Columns["AnchorText"]!.HeaderText = "Anchor Text";
            if (dataGridViewInternalLinks.Columns.Contains("TargetPostName"))
                dataGridViewInternalLinks.Columns["TargetPostName"]!.HeaderText = "Target Post Name";
            if (dataGridViewInternalLinks.Columns.Contains("TargetPostStatus"))
                dataGridViewInternalLinks.Columns["TargetPostStatus"]!.HeaderText = "Target Status";
        }

        private void UpdatePaginationControls()
        {
            lblPageInfo.Text = $"Page {_currentPage} of {_totalPages}";
            btnPrevious.Enabled = (_currentPage > 1);
            btnNext.Enabled = (_currentPage < _totalPages);
        }

        private void DataGridViewInternalLinks_ColumnHeaderMouseClick(object? sender, DataGridViewCellMouseEventArgs e)
        {
            var newSortColumn = dataGridViewInternalLinks.Columns[e.ColumnIndex].DataPropertyName;

            if (string.IsNullOrEmpty(newSortColumn)) return;

            if (_sortColumn == newSortColumn)
            {
                _sortDirection = (_sortDirection == SortOrder.Ascending) ? SortOrder.Descending : SortOrder.Ascending;
            }
            else
            {
                _sortColumn = newSortColumn;
                _sortDirection = SortOrder.Ascending;
            }

            LoadInternalLinks();
            SetSortGlyph(dataGridViewInternalLinks.Columns[e.ColumnIndex]);
        }

        private void SetSortGlyph(DataGridViewColumn column)
        {
            foreach (DataGridViewColumn dgvc in dataGridViewInternalLinks.Columns)
            {
                dgvc.HeaderCell.SortGlyphDirection = SortOrder.None;
            }

            if (_sortDirection == SortOrder.Ascending)
            {
                column.HeaderCell.SortGlyphDirection = SortOrder.Ascending;
            }
            else
            {
                column.HeaderCell.SortGlyphDirection = SortOrder.Descending;
            }
        }

        private void BtnPrevious_Click(object? sender, EventArgs e)
        {
            if (_currentPage > 1)
            {
                _currentPage--;
                LoadInternalLinks();
            }
        }

        private void BtnNext_Click(object? sender, EventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                LoadInternalLinks();
            }
        }
    }
}
