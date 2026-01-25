using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

using System.Linq; // Add this for OrderBy/OrderByDescending

namespace WordpressExtractor.UserControls
{
    public partial class TagsViewControl : UserControl
    {
        // Define a public event for when a tag is selected
        public event EventHandler<TagSelectedEventArgs>? TagSelected;

        private SQLiteDataService? _dataService;
        private DataGridView dataGridViewTags = null!;
        private string _sortColumn = "Name"; // Default sort column
        private SortOrder _sortDirection = SortOrder.Ascending; // Default sort direction

        public TagsViewControl()
        {
            InitializeComponent(); // This will be from TagsViewControl.Designer.cs
            SetupUIControls();
            this.Load += TagsViewControl_Load;

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

        public TagsViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            dataGridViewTags = new DataGridView();
            dataGridViewTags.Dock = DockStyle.Fill;
            dataGridViewTags.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewTags.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewTags.ReadOnly = true;
            dataGridViewTags.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewTags.MultiSelect = false;
            dataGridViewTags.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewTags);

            // Subscribe to the ColumnHeaderMouseClick event
            dataGridViewTags.ColumnHeaderMouseClick += DataGridViewTags_ColumnHeaderMouseClick;
            // Subscribe to the CellDoubleClick event for linkability
            dataGridViewTags.CellDoubleClick += DataGridViewTags_CellDoubleClick;
        }

        private void TagsViewControl_Load(object? sender, EventArgs e)
        {
            LoadTags();
        }

        public void LoadTags()
        {
            if (_dataService == null) return;
            var tags = _dataService.GetTags();

            // Apply sorting
            if (_sortDirection == SortOrder.Ascending)
            {
                tags = tags.OrderBy(t => GetPropertyValue(t, _sortColumn)).ToList();
            }
            else
            {
                tags = tags.OrderByDescending(t => GetPropertyValue(t, _sortColumn)).ToList();
            }

            dataGridViewTags.DataSource = tags;
            ApplyColumnFormatting();
        }

        private object GetPropertyValue(Tag tag, string propertyName)
        {
            return typeof(Tag).GetProperty(propertyName)?.GetValue(tag, null) ?? string.Empty;
        }


        private void ApplyColumnFormatting()
        {
            if (dataGridViewTags.Columns.Contains("TermId"))
                dataGridViewTags.Columns["TermId"]!.Visible = false;
            if (dataGridViewTags.Columns.Contains("Nicename"))
                dataGridViewTags.Columns["Nicename"]!.Visible = false;
            if (dataGridViewTags.Columns.Contains("Description"))
                dataGridViewTags.Columns["Description"]!.Visible = false;

            if (dataGridViewTags.Columns.Contains("Name"))
                dataGridViewTags.Columns["Name"]!.HeaderText = "Tag Name";
            if (dataGridViewTags.Columns.Contains("PostCount"))
                dataGridViewTags.Columns["PostCount"]!.HeaderText = "Post Count";
        }

        private void DataGridViewTags_ColumnHeaderMouseClick(object? sender, DataGridViewCellMouseEventArgs e)
        {
            var newSortColumn = dataGridViewTags.Columns[e.ColumnIndex].DataPropertyName;

            if (string.IsNullOrEmpty(newSortColumn)) return; // Don't sort if DataPropertyName is empty

            if (_sortColumn == newSortColumn)
            {
                _sortDirection = (_sortDirection == SortOrder.Ascending) ? SortOrder.Descending : SortOrder.Ascending;
            }
            else
            {
                _sortColumn = newSortColumn;
                _sortDirection = SortOrder.Ascending; // Default to ascending for a new column
            }

            LoadTags(); // Reload with new sorting
            SetSortGlyph(dataGridViewTags.Columns[e.ColumnIndex]);
        }

        private void DataGridViewTags_CellDoubleClick(object? sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex >= 0)
            {
                var selectedTag = dataGridViewTags.Rows[e.RowIndex].DataBoundItem as Tag;
                if (selectedTag != null)
                {
                    OnTagSelected(selectedTag);
                }
            }
        }

        protected virtual void OnTagSelected(Tag tag)
        {
            TagSelected?.Invoke(this, new TagSelectedEventArgs(tag));
        }

        private void SetSortGlyph(DataGridViewColumn column)
        {
            foreach (DataGridViewColumn dgvc in dataGridViewTags.Columns)
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
    }

    // Custom EventArgs class to pass the selected Tag
    public class TagSelectedEventArgs : EventArgs
    {
        public Tag SelectedTag { get; }

        public TagSelectedEventArgs(Tag tag)
        {
            SelectedTag = tag;
        }
    }
}
