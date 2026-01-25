using System.Windows.Forms;
using WordpressExtractor.Services;

namespace WordpressExtractor.UserControls
{
    public partial class DashboardViewControl : UserControl
    {
        private SQLiteDataService? _dataService;

        // UI elements for statistics
        private Label lblTotalPosts = null!;
        private Label lblTotalPages = null!;
        private Label lblTotalCategories = null!;
        private Label lblTotalTags = null!;
        private Label lblTotalInternalLinks = null!;
        private Label lblTotalComments = null!;
        private Label lblTotalAttachments = null!;


        public DashboardViewControl()
        {
            InitializeComponent();
            SetupUIControls(); // Call SetupUIControls here
            this.Load += DashboardViewControl_Load;
        }

        public DashboardViewControl(SQLiteDataService dataService) : this()
        {
            _dataService = dataService;
        }

        private void SetupUIControls()
        {
            var mainPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.TopDown,
                AutoScroll = true,
                WrapContents = false
            };

            lblTotalPosts = new Label { AutoSize = true, Text = "Total Posts: 0" };
            lblTotalPages = new Label { AutoSize = true, Text = "Total Pages: 0" };
            lblTotalCategories = new Label { AutoSize = true, Text = "Total Categories: 0" };
            lblTotalTags = new Label { AutoSize = true, Text = "Total Tags: 0" };
            lblTotalInternalLinks = new Label { AutoSize = true, Text = "Total Internal Links: 0" };
            lblTotalComments = new Label { AutoSize = true, Text = "Total Comments: 0" };
            lblTotalAttachments = new Label { AutoSize = true, Text = "Total Attachments: 0" };

            mainPanel.Controls.Add(lblTotalPosts);
            mainPanel.Controls.Add(lblTotalPages);
            mainPanel.Controls.Add(lblTotalCategories);
            mainPanel.Controls.Add(lblTotalTags);
            mainPanel.Controls.Add(lblTotalInternalLinks);
            mainPanel.Controls.Add(lblTotalComments);
            mainPanel.Controls.Add(lblTotalAttachments);

            this.Controls.Add(mainPanel);
        }

        private void DashboardViewControl_Load(object? sender, System.EventArgs e)
        {
            LoadDashboardData();
        }

        public void LoadDashboardData()
        {
            if (_dataService == null) return;

            lblTotalPosts.Text = $"Total Posts: {_dataService.GetPostCount("post")}";
            lblTotalPages.Text = $"Total Pages: {_dataService.GetPostCount("page")}";
            lblTotalCategories.Text = $"Total Categories: {_dataService.GetCategoryCount()}";
            lblTotalTags.Text = $"Total Tags: {_dataService.GetTagCount()}";
            lblTotalInternalLinks.Text = $"Total Internal Links: {_dataService.GetInternalLinksCount()}";
            lblTotalComments.Text = $"Total Comments: {_dataService.GetCommentCount()}";
            lblTotalAttachments.Text = $"Total Attachments: {_dataService.GetAttachmentCount()}";
        }
    }
}