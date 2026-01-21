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
        private XmlProcessor _xmlProcessor; // Declare XmlProcessor instance

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
                _xmlProcessor = new XmlProcessor(_dataService); // Initialize XmlProcessor
            }
            catch (FileNotFoundException ex)
            {
                MessageBox.Show(ex.Message, "Database Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                // Optionally close the application if the database is critical
                // Application.Exit();
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
            importXMLToolStripMenuItem.Click += ImportXMLToolStripMenuItem_Click;
            fileToolStripMenuItem.DropDownItems.Add(importXMLToolStripMenuItem);
            mainMenuStrip.Items.Add(fileToolStripMenuItem);
            this.Controls.Add(mainMenuStrip);
            this.MainMenuStrip = mainMenuStrip; // Set as the main menu strip

            // Main Tab Control
            tabControlMain = new TabControl();
            tabControlMain.Dock = DockStyle.Fill;
            tabControlMain.SelectedIndexChanged += tabControlMain_SelectedIndexChanged;
            // The TabControl should fill the client area below the menu strip
            tabControlMain.Location = new System.Drawing.Point(0, mainMenuStrip.Height);
            tabControlMain.Size = new System.Drawing.Size(this.ClientSize.Width, this.ClientSize.Height - mainMenuStrip.Height);
            tabControlMain.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            this.Controls.Add(tabControlMain);


            // Create TabPages and add UserControls
            // Posts & Pages Tab
            TabPage tabPagePosts = new TabPage("Posts & Pages");
            postsViewControl = new PostsViewControl(_dataService);
            postsViewControl.Dock = DockStyle.Fill;
            postsViewControl.PostSelected += PostsViewControl_PostSelected; // Hook event
            tabPagePosts.Controls.Add(postsViewControl);
            tabControlMain.Controls.Add(tabPagePosts);

            // Authors Tab
            TabPage tabPageAuthors = new TabPage("Authors");
            authorsViewControl = new AuthorsViewControl(_dataService);
            authorsViewControl.Dock = DockStyle.Fill;
            tabPageAuthors.Controls.Add(authorsViewControl);
            tabControlMain.Controls.Add(tabPageAuthors);

            // Categories Tab
            TabPage tabPageCategories = new TabPage("Categories");
            categoriesViewControl = new CategoriesViewControl(_dataService);
            categoriesViewControl.Dock = DockStyle.Fill;
            tabPageCategories.Controls.Add(categoriesViewControl);
            tabControlMain.Controls.Add(tabPageCategories);

            // Tags Tab
            TabPage tabPageTags = new TabPage("Tags");
            tagsViewControl = new TagsViewControl(_dataService);
            tagsViewControl.Dock = DockStyle.Fill;
            tabPageTags.Controls.Add(tagsViewControl);
            tabControlMain.Controls.Add(tabPageTags);

            // Comments Tab
            TabPage tabPageComments = new TabPage("Comments");
            commentsViewControl = new CommentsViewControl(_dataService);
            commentsViewControl.Dock = DockStyle.Fill;
            tabPageComments.Controls.Add(commentsViewControl);
            tabControlMain.Controls.Add(tabPageComments);

            // Post Meta Tab
            TabPage tabPagePostMeta = new TabPage("Post Meta");
            postMetaViewControl = new PostMetaViewControl(_dataService);
            postMetaViewControl.Dock = DockStyle.Fill;
            tabPagePostMeta.Controls.Add(postMetaViewControl);
            tabControlMain.Controls.Add(tabPagePostMeta);
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            // Initial load of data for the first tab (Posts & Pages)
            // PostsViewControl handles its own initial load on its Load event
            // Other tabs will load data when selected
        }

        private void tabControlMain_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (_dataService == null) return;

            // Load data for the selected tab if it hasn't been loaded yet
            switch (tabControlMain.SelectedTab.Text)
            {
                case "Posts & Pages":
                    postsViewControl.LoadPosts();
                    break;
                case "Authors":
                    authorsViewControl.LoadAuthors();
                    break;
                case "Categories":
                    categoriesViewControl.LoadCategories();
                    break;
                case "Tags":
                    tagsViewControl.LoadTags();
                    break;
                case "Comments":
                    if (_selectedPostId != -1) commentsViewControl.LoadComments(_selectedPostId);
                    break;
                case "Post Meta":
                    if (_selectedPostId != -1) postMetaViewControl.LoadPostMeta(_selectedPostId);
                    break;
            }
        }

        private void PostsViewControl_PostSelected(object sender, int postId)
        {
            _selectedPostId = postId;
            // When a post is selected, update comments and post meta if their tabs are active
            // This needs to be done explicitly because only PostsViewControl has the selection event
            if (tabControlMain.SelectedTab.Text == "Comments")
            {
                commentsViewControl.LoadComments(_selectedPostId);
            }
            if (tabControlMain.SelectedTab.Text == "Post Meta")
            {
                postMetaViewControl.LoadPostMeta(_selectedPostId);
            }
        }

        private void ImportXMLToolStripMenuItem_Click(object sender, EventArgs e)
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
                        _xmlProcessor.ProcessWordPressXml(selectedXmlPath);
                        MessageBox.Show("WordPress XML imported successfully!", "Import Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);

                        // Refresh all loaded user controls
                        postsViewControl.LoadPosts();
                        authorsViewControl.LoadAuthors();
                        categoriesViewControl.LoadCategories();
                        tagsViewControl.LoadTags();
                        commentsViewControl.LoadComments(-1); // Clear comments/meta if a new import happens
                        postMetaViewControl.LoadPostMeta(-1);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error importing XML: {ex.Message}", "Import Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
        }
    }
}
