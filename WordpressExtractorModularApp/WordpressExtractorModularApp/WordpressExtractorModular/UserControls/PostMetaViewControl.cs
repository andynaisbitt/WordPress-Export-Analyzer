using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class PostMetaViewControl : UserControl
    {
        private SQLiteDataService? _dataService;
        private DataGridView dataGridViewPostMeta = null!;
        private int _currentPostId = -1;

        public PostMetaViewControl()
        {
            InitializeComponent(); // This will be from PostMetaViewControl.Designer.cs
            SetupUIControls();
            this.Load += PostMetaViewControl_Load;

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

        public PostMetaViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            dataGridViewPostMeta = new DataGridView();
            dataGridViewPostMeta.Dock = DockStyle.Fill;
            dataGridViewPostMeta.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewPostMeta.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewPostMeta.ReadOnly = true;
            dataGridViewPostMeta.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewPostMeta.MultiSelect = false;
            dataGridViewPostMeta.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewPostMeta);
        }

        private void PostMetaViewControl_Load(object? sender, EventArgs e) // Made sender nullable
        {
            // Load meta only if a post is already selected
            if (_currentPostId != -1)
            {
                LoadPostMeta(_currentPostId);
            }
        }

        public void LoadPostMeta(int postId)
        {
            if (_dataService == null) return;
            _currentPostId = postId;
            var postMeta = _dataService.GetPostMetaByPostId(postId);
            dataGridViewPostMeta.DataSource = postMeta;
            if (dataGridViewPostMeta.Columns.Contains("MetaId"))
                dataGridViewPostMeta.Columns["MetaId"]!.Visible = false;
            if (dataGridViewPostMeta.Columns.Contains("PostId"))
                dataGridViewPostMeta.Columns["PostId"]!.Visible = false;
        }
    }
}
