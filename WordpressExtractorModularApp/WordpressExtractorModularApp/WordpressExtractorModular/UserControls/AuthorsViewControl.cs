using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class AuthorsViewControl : UserControl
    {
        private SQLiteDataService _dataService;
        private DataGridView dataGridViewAuthors;

        public AuthorsViewControl()
        {
            InitializeComponent(); // This will be from AuthorsViewControl.Designer.cs
            SetupUIControls();
            this.Load += AuthorsViewControl_Load;

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

        public AuthorsViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            dataGridViewAuthors = new DataGridView();
            dataGridViewAuthors.Dock = DockStyle.Fill;
            dataGridViewAuthors.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewAuthors.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewAuthors.ReadOnly = true;
            dataGridViewAuthors.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewAuthors.MultiSelect = false;
            dataGridViewAuthors.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewAuthors);
        }

        private void AuthorsViewControl_Load(object sender, EventArgs e)
        {
            LoadAuthors();
        }

        public void LoadAuthors()
        {
            if (_dataService == null) return;
            var authors = _dataService.GetAuthors();
            dataGridViewAuthors.DataSource = authors;
            if (dataGridViewAuthors.Columns.Contains("AuthorId"))
                dataGridViewAuthors.Columns["AuthorId"].Visible = false; // Hide ID
        }
    }
}
