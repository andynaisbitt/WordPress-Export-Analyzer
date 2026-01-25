using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

using System.Linq; // Add this for OrderBy/OrderByDescending

namespace WordpressExtractor.UserControls
{
    public partial class CategoriesViewControl : UserControl
    {
        // Define a public event for when a category is selected
        public event EventHandler<CategorySelectedEventArgs>? CategorySelected;

        private SQLiteDataService? _dataService;
        private DataGridView dataGridViewCategories = null!;
        private string _sortColumn = "Name"; // Default sort column
        private SortOrder _sortDirection = SortOrder.Ascending; // Default sort direction


        public CategoriesViewControl()
        {
            InitializeComponent(); // This will be from CategoriesViewControl.Designer.cs
            SetupUIControls();
            this.Load += CategoriesViewControl_Load;

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

        public CategoriesViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            dataGridViewCategories = new DataGridView();
            dataGridViewCategories.Dock = DockStyle.Fill;
            dataGridViewCategories.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewCategories.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewCategories.ReadOnly = true;
            dataGridViewCategories.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewCategories.MultiSelect = false;
            dataGridViewCategories.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewCategories);

            // Subscribe to the ColumnHeaderMouseClick event
            dataGridViewCategories.ColumnHeaderMouseClick += DataGridViewCategories_ColumnHeaderMouseClick;
            // Subscribe to the CellDoubleClick event for linkability
            dataGridViewCategories.CellDoubleClick += DataGridViewCategories_CellDoubleClick;
        }

        private void CategoriesViewControl_Load(object? sender, EventArgs e)
        {
            LoadCategories();
        }

        public void LoadCategories()
        {
            if (_dataService == null) return;
            var categories = _dataService.GetCategories();

            // Apply sorting
            if (_sortDirection == SortOrder.Ascending)
            {
                categories = categories.OrderBy(c => GetPropertyValue(c, _sortColumn)).ToList();
            }
            else
            {
                categories = categories.OrderByDescending(c => GetPropertyValue(c, _sortColumn)).ToList();
            }

            dataGridViewCategories.DataSource = categories;
            ApplyColumnFormatting();
        }

        private object GetPropertyValue(Category category, string propertyName)
        {
            return typeof(Category).GetProperty(propertyName)?.GetValue(category, null) ?? string.Empty;
        }

        private void ApplyColumnFormatting()
        {
            if (dataGridViewCategories.Columns.Contains("TermId"))
                dataGridViewCategories.Columns["TermId"]!.Visible = false; // Hide ID, use null-forgiving
            if (dataGridViewCategories.Columns.Contains("Nicename"))
                dataGridViewCategories.Columns["Nicename"]!.Visible = false; // Hide Nicename as Name is more user-friendly
            if (dataGridViewCategories.Columns.Contains("Parent"))
                dataGridViewCategories.Columns["Parent"]!.HeaderText = "Parent Category";
            if (dataGridViewCategories.Columns.Contains("Description"))
                dataGridViewCategories.Columns["Description"]!.Visible = false; // Hide Description for a cleaner view

            if (dataGridViewCategories.Columns.Contains("Name"))
                dataGridViewCategories.Columns["Name"]!.HeaderText = "Category Name";
            if (dataGridViewCategories.Columns.Contains("PostCount"))
                dataGridViewCategories.Columns["PostCount"]!.HeaderText = "Post Count";
        }

        private void DataGridViewCategories_ColumnHeaderMouseClick(object? sender, DataGridViewCellMouseEventArgs e)
        {
            var newSortColumn = dataGridViewCategories.Columns[e.ColumnIndex].DataPropertyName;

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

            LoadCategories(); // Reload with new sorting
            SetSortGlyph(dataGridViewCategories.Columns[e.ColumnIndex]);
        }

        private void DataGridViewCategories_CellDoubleClick(object? sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex >= 0)
            {
                var selectedCategory = dataGridViewCategories.Rows[e.RowIndex].DataBoundItem as Category;
                if (selectedCategory != null)
                {
                    OnCategorySelected(selectedCategory);
                }
            }
        }

        protected virtual void OnCategorySelected(Category category)
        {
            CategorySelected?.Invoke(this, new CategorySelectedEventArgs(category));
        }

        private void SetSortGlyph(DataGridViewColumn column)
        {
            foreach (DataGridViewColumn dgvc in dataGridViewCategories.Columns)
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

    // Custom EventArgs class to pass the selected Category
    public class CategorySelectedEventArgs : EventArgs
    {
        public Category SelectedCategory { get; }

        public CategorySelectedEventArgs(Category category)
        {
            SelectedCategory = category;
        }
    }
}
