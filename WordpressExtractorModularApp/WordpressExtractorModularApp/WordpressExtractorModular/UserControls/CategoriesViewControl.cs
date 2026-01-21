using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class CategoriesViewControl : UserControl
    {
        private SQLiteDataService _dataService;
        private DataGridView dataGridViewCategories;

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
        }

        private void CategoriesViewControl_Load(object sender, EventArgs e)
        {
            LoadCategories();
        }

        public void LoadCategories()
        {
            if (_dataService == null) return;
            var categories = _dataService.GetCategories();
            dataGridViewCategories.DataSource = categories;
            if (dataGridViewCategories.Columns.Contains("TermId"))
                dataGridViewCategories.Columns["TermId"].Visible = false; // Hide ID
        }
    }
}
