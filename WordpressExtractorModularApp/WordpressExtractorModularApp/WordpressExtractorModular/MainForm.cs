using System;
using System.Windows.Forms;
using WordpressExtractor.Services;
using WordpressExtractor.UserControls;

namespace WordpressExtractorModular
{
    public partial class MainForm : Form
    {
        private const string DATABASE_NAME = "wordpress_extracted_data.db";
        private int _selectedPostId = -1;
        private SQLiteDataService? _dataService;
        private XmlProcessor? _xmlProcessor;

        // UI Components
        private MenuStrip? mainMenuStrip;
        private ToolStripMenuItem? fileToolStripMenuItem;
        private ToolStripMenuItem? importXMLToolStripMenuItem;
        private TabControl? tabControlMain;

        // User Controls
        private DashboardViewControl? dashboardViewControl;
        private PostsViewControl? postsViewControl;
        private AuthorsViewControl? authorsViewControl;
        private CategoriesViewControl? categoriesViewControl;
        private TagsViewControl? tagsViewControl;
        private InternalLinksViewControl? internalLinksViewControl; // Added
        private CommentsViewControl? commentsViewControl;
        private PostMetaViewControl? postMetaViewControl;

        public MainForm()
        {
            InitializeComponent(); // This sets up the basic form properties from MainForm.Designer.cs
            this.Text = "WordPress Extractor";
            this.MinimumSize = new System.Drawing.Size(1000, 600);
            this.Size = new System.Drawing.Size(1000, 600);

            // Initialize data service
            try
            {
                _dataService = new SQLiteDataService(DATABASE_NAME);
                _xmlProcessor = new XmlProcessor(_dataService!); // Initialize XmlProcessor, _dataService guaranteed not null here
            }
            catch (FileNotFoundException ex)
            {
                MessageBox.Show(
                    "Database file not found. Please import a WordPress XML file to create and populate the database.\n\n" +
                    $"Details: {ex.Message}",
                    "Database Not Found",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                _dataService = null;
                _xmlProcessor = null; // Ensure XML processor is also null if data service failed
                // Application will continue, but tabs might be empty or disabled.
            }
            catch (Exception ex) // Catch other potential exceptions during data service initialization
            {
                MessageBox.Show(
                    $"An unexpected error occurred during database initialization: {ex.Message}",
                    "Database Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                _dataService = null;
                _xmlProcessor = null;
            }

            SetupMainUI();
            this.Load += MainForm_Load;
        }

        private void SetupMainUI()
        {
            // Main Menu Strip
            mainMenuStrip = new MenuStrip();
            fileToolStripMenuItem = new ToolStripMenuItem("File");
            importXMLToolStripMenuItem = new ToolStripMenuItem("Import XML...");
            importXMLToolStripMenuItem!.Click += ImportXMLToolStripMenuItem_Click; // Null-forgiving as it's just created
            fileToolStripMenuItem!.DropDownItems.Add(importXMLToolStripMenuItem); // Null-forgiving as it's just created
            mainMenuStrip.Items.Add(fileToolStripMenuItem); // Null-forgiving as it's just created
            this.Controls.Add(mainMenuStrip);
            this.MainMenuStrip = mainMenuStrip; // Set as the main menu strip

            // Main Tab Control
            tabControlMain = new TabControl();
            tabControlMain.Dock = DockStyle.Fill;
            tabControlMain.SelectedIndexChanged += tabControlMain_SelectedIndexChanged;
            // The TabControl should fill the client area below the menu strip
            tabControlMain.Location = new System.Drawing.Point(0, mainMenuStrip!.Height); // Null-forgiving
            tabControlMain.Size = new System.Drawing.Size(this.ClientSize.Width, this.ClientSize.Height - mainMenuStrip.Height); // Null-forgiving
            tabControlMain.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            this.Controls.Add(tabControlMain);


            // Create TabPages and add UserControls
            // Dashboard Tab
            TabPage tabPageDashboard = new TabPage("Dashboard");
            dashboardViewControl = new DashboardViewControl(_dataService!); // Null-forgiving for dataService
            dashboardViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPageDashboard.Controls.Add(dashboardViewControl);
            tabControlMain!.Controls.Add(tabPageDashboard); // Null-forgiving

            // Posts & Pages Tab
            TabPage tabPagePosts = new TabPage("Posts & Pages");
            postsViewControl = new PostsViewControl(_dataService!); // Null-forgiving for dataService
            postsViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            postsViewControl.PostSelected += PostsViewControl_PostSelected; // Hook event
            tabPagePosts.Controls.Add(postsViewControl);
            tabControlMain!.Controls.Add(tabPagePosts); // Null-forgiving

            // Authors Tab
            TabPage tabPageAuthors = new TabPage("Authors");
            authorsViewControl = new AuthorsViewControl(_dataService!); // Null-forgiving for dataService
            authorsViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPageAuthors.Controls.Add(authorsViewControl);
            tabControlMain.Controls.Add(tabPageAuthors);

            // Categories Tab
            TabPage tabPageCategories = new TabPage("Categories");
            categoriesViewControl = new CategoriesViewControl(_dataService!); // Null-forgiving for dataService
            categoriesViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPageCategories.Controls.Add(categoriesViewControl);
            tabControlMain.Controls.Add(tabPageCategories);

            // Tags Tab
            TabPage tabPageTags = new TabPage("Tags");
            tagsViewControl = new TagsViewControl(_dataService!); // Null-forgiving for dataService
            tagsViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPageTags.Controls.Add(tagsViewControl);
            tabControlMain.Controls.Add(tabPageTags);

            // Internal Links Tab
            TabPage tabPageInternalLinks = new TabPage("Internal Links");
            internalLinksViewControl = new InternalLinksViewControl(_dataService!); // Null-forgiving for dataService
            internalLinksViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPageInternalLinks.Controls.Add(internalLinksViewControl);
            tabControlMain.Controls.Add(tabPageInternalLinks);

            // Comments Tab
            TabPage tabPageComments = new TabPage("Comments");
            commentsViewControl = new CommentsViewControl(_dataService!); // Null-forgiving for dataService
            commentsViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPageComments.Controls.Add(commentsViewControl);
            tabControlMain.Controls.Add(tabPageComments);

            // Post Meta Tab
            TabPage tabPagePostMeta = new TabPage("Post Meta");
            postMetaViewControl = new PostMetaViewControl(_dataService!); // Null-forgiving for dataService
            postMetaViewControl!.Dock = DockStyle.Fill; // Null-forgiving
            tabPagePostMeta.Controls.Add(postMetaViewControl);
            tabControlMain.Controls.Add(tabPagePostMeta);
        }

        private void MainForm_Load(object? sender, EventArgs e) // Made sender nullable
        {
            // Initial load of data for the first tab (Posts & Pages)
            // PostsViewControl handles its own initial load on its Load event
            // Other tabs will load data when selected
        }

        private void tabControlMain_SelectedIndexChanged(object? sender, EventArgs e) // Made sender nullable
        {
            if (_dataService == null) return;
            if (tabControlMain == null || tabControlMain.SelectedTab == null) return; // Added null checks for safety

            // Load data for the selected tab if it hasn't been loaded yet
            switch (tabControlMain.SelectedTab.Text)
            {
                case "Dashboard":
                    dashboardViewControl?.LoadDashboardData();
                    break;
                case "Posts & Pages":
                    postsViewControl?.LoadPosts(); // Null-conditional operator
                    break;
                case "Authors":
                    authorsViewControl?.LoadAuthors();
                    break;
                case "Categories":
                    categoriesViewControl?.LoadCategories();
                    break;
                case "Tags":
                    tagsViewControl?.LoadTags();
                    break;
                case "Internal Links":
                    internalLinksViewControl?.LoadInternalLinks();
                    break;
                case "Comments":
                    if (_selectedPostId != -1) commentsViewControl?.LoadComments(_selectedPostId);
                    break;
                case "Post Meta":
                    if (_selectedPostId != -1) postMetaViewControl?.LoadPostMeta(_selectedPostId);
                    break;
            }
        }

        private void PostsViewControl_PostSelected(object? sender, int postId) // Made sender nullable
        {
            _selectedPostId = postId;
            // When a post is selected, update comments and post meta if their tabs are active
            // This needs to be done explicitly because only PostsViewControl has the selection event
            if (tabControlMain == null || tabControlMain.SelectedTab == null) return; // Added null checks for safety

            if (tabControlMain.SelectedTab.Text == "Comments")
            {
                commentsViewControl?.LoadComments(_selectedPostId);
            }
            if (tabControlMain.SelectedTab.Text == "Post Meta")
            {
                postMetaViewControl?.LoadPostMeta(_selectedPostId);
            }
        }

        private void ImportXMLToolStripMenuItem_Click(object? sender, EventArgs e) // Made sender nullable
        {
            using (OpenFileDialog openFileDialog = new OpenFileDialog())
            {
                openFileDialog.Filter = "WordPress XML files (*.xml)|*.xml|All files (*.*)|*.*";
                openFileDialog.Title = "Select WordPress Export XML File";

                if (openFileDialog.ShowDialog() == DialogResult.OK)
                {
                    string selectedXmlPath = openFileDialog.FileName;
                    try
                    {
                        // Process the XML file
                        _xmlProcessor?.ProcessWordPressXml(selectedXmlPath); // Null-conditional
                        MessageBox.Show("WordPress XML imported successfully!", "Import Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);

                        // Refresh all loaded user controls
                        postsViewControl?.LoadPosts(); // Null-conditional
                        authorsViewControl?.LoadAuthors();
                        categoriesViewControl?.LoadCategories();
                        tagsViewControl?.LoadTags();
                        commentsViewControl?.LoadComments(-1); // Clear comments/meta if a new import happens
                        postMetaViewControl?.LoadPostMeta(-1);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(
                            $"An error occurred while importing the WordPress XML file. Please check the file format and try again.\n\n" +
                            $"Details: {ex.Message}",
                            "Import Error",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                        // No need to refresh controls on error, as data might be incomplete or invalid
                    }
                }
            }
        }
    }
}
