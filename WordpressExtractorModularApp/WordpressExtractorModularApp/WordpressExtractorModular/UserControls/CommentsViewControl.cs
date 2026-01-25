using System;
using System.Collections.Generic;
using System.Windows.Forms;
using WordpressExtractor.Models;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class CommentsViewControl : UserControl
    {
        private SQLiteDataService? _dataService;
        private DataGridView dataGridViewComments = null!;
        private int _currentPostId = -1;

        public CommentsViewControl()
        {
            InitializeComponent(); // This will be from CommentsViewControl.Designer.cs
            SetupUIControls();
            this.Load += CommentsViewControl_Load;

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

        public CommentsViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            dataGridViewComments = new DataGridView();
            dataGridViewComments.Dock = DockStyle.Fill;
            dataGridViewComments.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridViewComments.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridViewComments.ReadOnly = true;
            dataGridViewComments.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridViewComments.MultiSelect = false;
            dataGridViewComments.RowHeadersVisible = false;
            this.Controls.Add(dataGridViewComments);
        }

        private void CommentsViewControl_Load(object? sender, EventArgs e) // Made sender nullable
        {
            // Load comments only if a post is already selected
            if (_currentPostId != -1)
            {
                LoadComments(_currentPostId);
            }
        }

        public void LoadComments(int postId)
        {
            if (_dataService == null) return;
            _currentPostId = postId;
            var comments = _dataService.GetCommentsByPostId(postId);
            dataGridViewComments.DataSource = comments;
            if (dataGridViewComments.Columns.Contains("CommentId"))
                dataGridViewComments.Columns["CommentId"]!.Visible = false;
            if (dataGridViewComments.Columns.Contains("PostId"))
                dataGridViewComments.Columns["PostId"]!.Visible = false;
            if (dataGridViewComments.Columns.Contains("AuthorIp"))
                dataGridViewComments.Columns["AuthorIp"]!.Visible = false;
            if (dataGridViewComments.Columns.Contains("AuthorEmail"))
                dataGridViewComments.Columns["AuthorEmail"]!.Visible = false;
            if (dataGridViewComments.Columns.Contains("AuthorUrl"))
                dataGridViewComments.Columns["AuthorUrl"]!.Visible = false;
            if (dataGridViewComments.Columns.Contains("UserId"))
                dataGridViewComments.Columns["UserId"]!.Visible = false;
        }
    }
}
