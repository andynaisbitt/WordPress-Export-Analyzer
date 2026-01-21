using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class AttachmentsViewControl : UserControl
    {
        private SQLiteDataService _dataService;
        private DataGridView dataGridViewAttachments;

        public AttachmentsViewControl()
        {
            InitializeComponent(); // This will be from AttachmentsViewControl.Designer.cs
            SetupUIControls();
            this.Load += AttachmentsViewControl_Load;

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

        public AttachmentsViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            dataGridViewAttachments = new DataGridView();
            dataGridViewAttachments.Dock = DockStyle.Fill;
            dataGridViewAttachments.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewAttachments.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewAttachments.ReadOnly = true;
            dataGridViewAttachments.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewAttachments.MultiSelect = false;
            dataGridViewAttachments.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewAttachments);
        }

        private void AttachmentsViewControl_Load(object sender, EventArgs e)
        {
            LoadAttachments();
        }

        public void LoadAttachments()
        {
            if (_dataService == null) return;
            var attachments = _dataService.GetAttachments();
            dataGridViewAttachments.DataSource = attachments;
            if (dataGridViewAttachments.Columns.Contains("PostId"))
                dataGridViewAttachments.Columns["PostId"].Visible = false;
            if (dataGridViewAttachments.Columns.Contains("ParentId"))
                dataGridViewAttachments.Columns["ParentId"].Visible = false;
            if (dataGridViewAttachments.Columns.Contains("Description"))
                dataGridViewAttachments.Columns["Description"].Visible = false;
            if (dataGridViewAttachments.Columns.Contains("Content"))
                dataGridViewAttachments.Columns["Content"].Visible = false;
        }
    }
}
