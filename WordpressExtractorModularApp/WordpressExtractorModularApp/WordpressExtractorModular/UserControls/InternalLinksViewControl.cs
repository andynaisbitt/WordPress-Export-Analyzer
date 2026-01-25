using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class InternalLinksViewControl : UserControl
    {
        private SQLiteDataService? _dataService;
        private DataGridView dataGridViewInternalLinks = null!;

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
            dataGridViewInternalLinks = new DataGridView();
            dataGridViewInternalLinks.Dock = DockStyle.Fill;
            dataGridViewInternalLinks.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewInternalLinks.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewInternalLinks.ReadOnly = true;
            dataGridViewInternalLinks.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewInternalLinks.MultiSelect = false;
            dataGridViewInternalLinks.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewInternalLinks);
        }

        private void InternalLinksViewControl_Load(object? sender, EventArgs e) // Made sender nullable
        {
            LoadInternalLinks();
        }

        public void LoadInternalLinks()
        {
            if (_dataService == null) return;
            var internalLinks = _dataService.GetInternalLinks();
            dataGridViewInternalLinks.DataSource = internalLinks;
            if (dataGridViewInternalLinks.Columns.Contains("Id"))
                dataGridViewInternalLinks.Columns["Id"]!.Visible = false;
            if (dataGridViewInternalLinks.Columns.Contains("SourcePostId"))
                dataGridViewInternalLinks.Columns["SourcePostId"]!.Visible = false;
            if (dataGridViewInternalLinks.Columns.Contains("TargetPostId"))
                dataGridViewInternalLinks.Columns["TargetPostId"]!.Visible = false;
        }
    }
}
