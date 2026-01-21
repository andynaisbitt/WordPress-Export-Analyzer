using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class TagsViewControl : UserControl
    {
        private SQLiteDataService _dataService;
        private DataGridView dataGridViewTags;

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
        }

        private void TagsViewControl_Load(object sender, EventArgs e)
        {
            LoadTags();
        }

        public void LoadTags()
        {
            if (_dataService == null) return;
            var tags = _dataService.GetTags();
            dataGridViewTags.DataSource = tags;
            if (dataGridViewTags.Columns.Contains("TermId"))
                dataGridViewTags.Columns["TermId"].Visible = false; // Hide ID
        }
    }
}
