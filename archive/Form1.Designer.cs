namespace WordpressExtractor;

partial class Form1
{
    /// <summary>
    ///  Required designer variable.
    /// </summary>
    private System.ComponentModel.IContainer components = null;

    private System.Windows.Forms.TabControl tabControlMain;
    private System.Windows.Forms.TabPage tabPagePosts;
    private System.Windows.Forms.TabPage tabPageAuthors;
    private System.Windows.Forms.TabPage tabPageCategories;
    private System.Windows.Forms.TabPage tabPageTags;
    private System.Windows.Forms.SplitContainer splitContainerPosts;
    private System.Windows.Forms.Panel panelPostSearch;
    private System.Windows.Forms.Button searchButton;
    private System.Windows.Forms.TextBox searchTextBox;
    private System.Windows.Forms.DataGridView dataGridViewPosts;
    private System.Windows.Forms.WebBrowser webBrowserPostContent;
    private System.Windows.Forms.DataGridView dataGridViewAuthors;
    private System.Windows.Forms.DataGridView dataGridViewCategories;
    private System.Windows.Forms.DataGridView dataGridViewTags;
    private System.Windows.Forms.TabPage tabPageComments;
    private System.Windows.Forms.DataGridView dataGridViewComments;
    private System.Windows.Forms.TabPage tabPagePostMeta;
    private System.Windows.Forms.DataGridView dataGridViewPostMeta;


    /// <summary>
    ///  Clean up any resources being used.
    /// </summary>
    /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }
        base.Dispose(disposing);
    }

    #region Windows Form Designer generated code

    /// <summary>
    ///  Required method for Designer support - do not modify
    ///  the contents of this method with the code editor.
    /// </summary>
    private void InitializeComponent()
    {
        this.tabControlMain = new System.Windows.Forms.TabControl();
        this.tabPagePosts = new System.Windows.Forms.TabPage();
        this.splitContainerPosts = new System.Windows.Forms.SplitContainer();
        this.panelPostSearch = new System.Windows.Forms.Panel();
        this.searchButton = new System.Windows.Forms.Button();
        this.searchTextBox = new System.Windows.Forms.TextBox();
        this.dataGridViewPosts = new System.Windows.Forms.DataGridView();
        this.webBrowserPostContent = new System.Windows.Forms.WebBrowser();
        this.tabPageAuthors = new System.Windows.Forms.TabPage();
        this.dataGridViewAuthors = new System.Windows.Forms.DataGridView();
        this.tabPageCategories = new System.Windows.Forms.TabPage();
        this.dataGridViewCategories = new System.Windows.Forms.DataGridView();
        this.tabPageTags = new System.Windows.Forms.TabPage();
        this.dataGridViewTags = new System.Windows.Forms.DataGridView();
        this.tabPageComments = new System.Windows.Forms.TabPage();
        this.dataGridViewComments = new System.Windows.Forms.DataGridView();
        this.tabPagePostMeta = new System.Windows.Forms.TabPage();
        this.dataGridViewPostMeta = new System.Windows.Forms.DataGridView();
        this.tabControlMain.SuspendLayout();
        this.tabPagePosts.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.splitContainerPosts)).BeginInit();
        this.splitContainerPosts.Panel1.SuspendLayout();
        this.splitContainerPosts.Panel2.SuspendLayout();
        this.splitContainerPosts.SuspendLayout();
        this.panelPostSearch.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.dataGridViewPosts)).BeginInit();
        this.tabPageAuthors.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.dataGridViewAuthors)).BeginInit();
        this.tabPageCategories.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.dataGridViewCategories)).BeginInit();
        this.tabPageTags.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.dataGridViewTags)).BeginInit();
        this.tabPageComments.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.dataGridViewComments)).BeginInit();
        this.tabPagePostMeta.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.dataGridViewPostMeta)).BeginInit();
        this.SuspendLayout();
        // 
        // tabControlMain
        // 
        this.tabControlMain.Controls.Add(this.tabPagePosts);
        this.tabControlMain.Controls.Add(this.tabPageAuthors);
        this.tabControlMain.Controls.Add(this.tabPageCategories);
        this.tabControlMain.Controls.Add(this.tabPageTags);
        this.tabControlMain.Controls.Add(this.tabPageComments);
        this.tabControlMain.Controls.Add(this.tabPagePostMeta);
        this.tabControlMain.Dock = System.Windows.Forms.DockStyle.Fill;
        this.tabControlMain.Location = new System.Drawing.Point(0, 0);
        this.tabControlMain.Name = "tabControlMain";
        this.tabControlMain.SelectedIndex = 0;
        this.tabControlMain.Size = new System.Drawing.Size(1000, 600);
        this.tabControlMain.TabIndex = 0;
        this.tabControlMain.SelectedIndexChanged += new System.EventHandler(this.tabControlMain_SelectedIndexChanged);
        // 
        // tabPagePosts
        // 
        this.tabPagePosts.Controls.Add(this.splitContainerPosts);
        this.tabPagePosts.Location = new System.Drawing.Point(4, 24);
        this.tabPagePosts.Name = "tabPagePosts";
        this.tabPagePosts.Padding = new System.Windows.Forms.Padding(3);
        this.tabPagePosts.Size = new System.Drawing.Size(992, 572);
        this.tabPagePosts.TabIndex = 0;
        this.tabPagePosts.Text = "Posts & Pages";
        this.tabPagePosts.UseVisualStyleBackColor = true;
        // 
        // splitContainerPosts
        // 
        this.splitContainerPosts.Dock = System.Windows.Forms.DockStyle.Fill;
        this.splitContainerPosts.Location = new System.Drawing.Point(3, 3);
        this.splitContainerPosts.Name = "splitContainerPosts";
        // 
        // splitContainerPosts.Panel1
        // 
        this.splitContainerPosts.Panel1.Controls.Add(this.panelPostSearch);
        this.splitContainerPosts.Panel1.Controls.Add(this.dataGridViewPosts);
        // 
        // splitContainerPosts.Panel2
        // 
        this.splitContainerPosts.Panel2.Controls.Add(this.webBrowserPostContent);
        this.splitContainerPosts.Size = new System.Drawing.Size(986, 566);
        this.splitContainerPosts.SplitterDistance = 350;
        this.splitContainerPosts.TabIndex = 0;
        // 
        // panelPostSearch
        // 
        this.panelPostSearch.Controls.Add(this.searchButton);
        this.panelPostSearch.Controls.Add(this.searchTextBox);
        this.panelPostSearch.Dock = System.Windows.Forms.DockStyle.Top;
        this.panelPostSearch.Location = new System.Drawing.Point(0, 0);
        this.panelPostSearch.Name = "panelPostSearch";
        this.panelPostSearch.Size = new System.Drawing.Size(350, 35);
        this.panelPostSearch.TabIndex = 1;
        // 
        // searchButton
        // 
        this.searchButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
        this.searchButton.Location = new System.Drawing.Point(269, 6);
        this.searchButton.Name = "searchButton";
        this.searchButton.Size = new System.Drawing.Size(75, 23);
        this.searchButton.TabIndex = 1;
        this.searchButton.Text = "Search";
        this.searchButton.UseVisualStyleBackColor = true;
        this.searchButton.Click += new System.EventHandler(this.searchButton_Click);
        // 
        // searchTextBox
        // 
        this.searchTextBox.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
        this.searchTextBox.Location = new System.Drawing.Point(6, 7);
        this.searchTextBox.Name = "searchTextBox";
        this.searchTextBox.Size = new System.Drawing.Size(257, 23);
        this.searchTextBox.TabIndex = 0;
        // 
        // dataGridViewPosts
        // 
        this.dataGridViewPosts.AllowUserToAddRows = false;
        this.dataGridViewPosts.AllowUserToDeleteRows = false;
        this.dataGridViewPosts.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
        this.dataGridViewPosts.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill;
        this.dataGridViewPosts.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
        this.dataGridViewPosts.Location = new System.Drawing.Point(0, 35);
        this.dataGridViewPosts.MultiSelect = false;
        this.dataGridViewPosts.Name = "dataGridViewPosts";
        this.dataGridViewPosts.ReadOnly = true;
        this.dataGridViewPosts.RowHeadersVisible = false;
        this.dataGridViewPosts.RowTemplate.Height = 25;
        this.dataGridViewPosts.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
        this.dataGridViewPosts.Size = new System.Drawing.Size(350, 531);
        this.dataGridViewPosts.TabIndex = 0;
        this.dataGridViewPosts.SelectionChanged += new System.EventHandler(this.dataGridViewPosts_SelectionChanged);
        // 
        // webBrowserPostContent
        // 
        this.webBrowserPostContent.Dock = System.Windows.Forms.DockStyle.Fill;
        this.webBrowserPostContent.Location = new System.Drawing.Point(0, 0);
        this.webBrowserPostContent.MinimumSize = new System.Drawing.Size(20, 20);
        this.webBrowserPostContent.Name = "webBrowserPostContent";
        this.webBrowserPostContent.Size = new System.Drawing.Size(632, 566);
        this.webBrowserPostContent.TabIndex = 0;
        // 
        // tabPageAuthors
        // 
        this.tabPageAuthors.Controls.Add(this.dataGridViewAuthors);
        this.tabPageAuthors.Location = new System.Drawing.Point(4, 24);
        this.tabPageAuthors.Name = "tabPageAuthors";
        this.tabPageAuthors.Padding = new System.Windows.Forms.Padding(3);
        this.tabPageAuthors.Size = new System.Drawing.Size(992, 572);
        this.tabPageAuthors.TabIndex = 1;
        this.tabPageAuthors.Text = "Authors";
        this.tabPageAuthors.UseVisualStyleBackColor = true;
        // 
        // dataGridViewAuthors
        // 
        this.dataGridViewAuthors.AllowUserToAddRows = false;
        this.dataGridViewAuthors.AllowUserToDeleteRows = false;
        this.dataGridViewAuthors.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill;
        this.dataGridViewAuthors.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
        this.dataGridViewAuthors.Dock = System.Windows.Forms.DockStyle.Fill;
        this.dataGridViewAuthors.Location = new System.Drawing.Point(3, 3);
        this.dataGridViewAuthors.MultiSelect = false;
        this.dataGridViewAuthors.Name = "dataGridViewAuthors";
        this.dataGridViewAuthors.ReadOnly = true;
        this.dataGridViewAuthors.RowHeadersVisible = false;
        this.dataGridViewAuthors.RowTemplate.Height = 25;
        this.dataGridViewAuthors.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
        this.dataGridViewAuthors.Size = new System.Drawing.Size(986, 566);
        this.dataGridViewAuthors.TabIndex = 0;
        // 
        // tabPageCategories
        // 
        this.tabPageCategories.Controls.Add(this.dataGridViewCategories);
        this.tabPageCategories.Location = new System.Drawing.Point(4, 24);
        this.tabPageCategories.Name = "tabPageCategories";
        this.tabPageCategories.Padding = new System.Windows.Forms.Padding(3);
        this.tabPageCategories.Size = new System.Drawing.Size(992, 572);
        this.tabPageCategories.TabIndex = 2;
        this.tabPageCategories.Text = "Categories";
        this.tabPageCategories.UseVisualStyleBackColor = true;
        // 
        // dataGridViewCategories
        // 
        this.dataGridViewCategories.AllowUserToAddRows = false;
        this.dataGridViewCategories.AllowUserToDeleteRows = false;
        this.dataGridViewCategories.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill;
        this.dataGridViewCategories.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
        this.dataGridViewCategories.Dock = System.Windows.Forms.DockStyle.Fill;
        this.dataGridViewCategories.Location = new System.Drawing.Point(3, 3);
        this.dataGridViewCategories.MultiSelect = false;
        this.dataGridViewCategories.Name = "dataGridViewCategories";
        this.dataGridViewCategories.ReadOnly = true;
        this.dataGridViewCategories.RowHeadersVisible = false;
        this.dataGridViewCategories.RowTemplate.Height = 25;
        this.dataGridViewCategories.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
        this.dataGridViewCategories.Size = new System.Drawing.Size(986, 566);
        this.dataGridViewCategories.TabIndex = 0;
        // 
        // tabPageTags
        // 
        this.tabPageTags.Controls.Add(this.dataGridViewTags);
        this.tabPageTags.Location = new System.Drawing.Point(4, 24);
        this.tabPageTags.Name = "tabPageTags";
        this.tabPageTags.Padding = new System.Windows.Forms.Padding(3);
        this.tabPageTags.Size = new System.Drawing.Size(992, 572);
        this.tabPageTags.TabIndex = 3;
        this.tabPageTags.Text = "Tags";
        this.tabPageTags.UseVisualStyleBackColor = true;
        // 
        // dataGridViewTags
        // 
            this.dataGridViewTags.AllowUserToAddRows = false;
            this.dataGridViewTags.AllowUserToDeleteRows = false;
            this.dataGridViewTags.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill;
            this.dataGridViewTags.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridViewTags.Dock = System.Windows.Forms.DockStyle.Fill;
            this.dataGridViewTags.Location = new System.Drawing.Point(3, 3);
            this.dataGridViewTags.MultiSelect = false;
            this.dataGridViewTags.Name = "dataGridViewTags";
            this.dataGridViewTags.ReadOnly = true;
            this.dataGridViewTags.RowHeadersVisible = false;
            this.dataGridViewTags.RowTemplate.Height = 25;
            this.dataGridViewTags.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
            this.dataGridViewTags.Size = new System.Drawing.Size(986, 566);
            this.dataGridViewTags.TabIndex = 0;
            // 
            // tabPageComments
            // 
            this.tabPageComments.Controls.Add(this.dataGridViewComments);
            this.tabPageComments.Location = new System.Drawing.Point(4, 24);
            this.tabPageComments.Name = "tabPageComments";
            this.tabPageComments.Padding = new System.Windows.Forms.Padding(3);
            this.tabPageComments.Size = new System.Drawing.Size(992, 572);
            this.tabPageComments.TabIndex = 4;
            this.tabPageComments.Text = "Comments";
            this.tabPageComments.UseVisualStyleBackColor = true;
            // 
            // dataGridViewComments
            // 
            this.dataGridViewComments.AllowUserToAddRows = false;
            this.dataGridViewComments.AllowUserToDeleteRows = false;
            this.dataGridViewComments.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill;
            this.dataGridViewComments.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridViewComments.Dock = System.Windows.Forms.DockStyle.Fill;
            this.dataGridViewComments.Location = new System.Drawing.Point(3, 3);
            this.dataGridViewComments.MultiSelect = false;
            this.dataGridViewComments.Name = "dataGridViewComments";
            this.dataGridViewComments.ReadOnly = true;
            this.dataGridViewComments.RowHeadersVisible = false;
            this.dataGridViewComments.RowTemplate.Height = 25;
            this.dataGridViewComments.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
            this.dataGridViewComments.Size = new System.Drawing.Size(986, 566);
            this.dataGridViewComments.TabIndex = 0;
            // 
            // tabPagePostMeta
            // 
            this.tabPagePostMeta.Controls.Add(this.dataGridViewPostMeta);
            this.tabPagePostMeta.Location = new System.Drawing.Point(4, 24);
            this.tabPagePostMeta.Name = "tabPagePostMeta";
            this.tabPagePostMeta.Padding = new System.Windows.Forms.Padding(3);
            this.tabPagePostMeta.Size = new System.Drawing.Size(992, 572);
            this.tabPagePostMeta.TabIndex = 5;
            this.tabPagePostMeta.Text = "Post Meta";
            this.tabPagePostMeta.UseVisualStyleBackColor = true;
            // 
            // dataGridViewPostMeta
            // 
            this.dataGridViewPostMeta.AllowUserToAddRows = false;
            this.dataGridViewPostMeta.AllowUserToDeleteRows = false;
            this.dataGridViewPostMeta.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill;
            this.dataGridViewPostMeta.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridViewPostMeta.Dock = System.Windows.Forms.DockStyle.Fill;
            this.dataGridViewPostMeta.Location = new System.Drawing.Point(3, 3);
            this.dataGridViewPostMeta.MultiSelect = false;
            this.dataGridViewPostMeta.Name = "dataGridViewPostMeta";
            this.dataGridViewPostMeta.ReadOnly = true;
            this.dataGridViewPostMeta.RowHeadersVisible = false;
            this.dataGridViewPostMeta.RowTemplate.Height = 25;
            this.dataGridViewPostMeta.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
            this.dataGridViewPostMeta.Size = new System.Drawing.Size(986, 566);
            this.dataGridViewPostMeta.TabIndex = 0;
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(1000, 600);
            this.Controls.Add(this.tabControlMain);
            this.MinimumSize = new System.Drawing.Size(1000, 600);
            this.Name = "Form1";
            this.Text = "WordPress Extractor";
            this.Load += new System.EventHandler(this.Form1_Load);
            this.tabControlMain.ResumeLayout(false);
            this.tabPagePosts.ResumeLayout(false);
            this.splitContainerPosts.Panel1.ResumeLayout(false);
            this.splitContainerPosts.Panel1.PerformLayout();
            this.splitContainerPosts.Panel2.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.splitContainerPosts)).EndInit();
            this.splitContainerPosts.ResumeLayout(false);
            this.panelPostSearch.ResumeLayout(false);
            this.panelPostSearch.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridViewPosts)).EndInit();
            this.tabPageAuthors.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridViewAuthors)).EndInit();
            this.tabPageCategories.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridViewCategories)).EndInit();
            this.tabPageTags.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridViewTags)).EndInit();
            this.tabPageComments.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridViewComments)).EndInit();
            this.tabPagePostMeta.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridViewPostMeta)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.TabControl tabControlMain;
        private System.Windows.Forms.TabPage tabPagePosts;
        private System.Windows.Forms.TabPage tabPageAuthors;
        private System.Windows.Forms.TabPage tabPageCategories;
        private System.Windows.Forms.TabPage tabPageTags;
        private System.Windows.Forms.SplitContainer splitContainerPosts;
        private System.Windows.Forms.Panel panelPostSearch;
        private System.Windows.Forms.Button searchButton;
        private System.Windows.Forms.TextBox searchTextBox;
        private System.Windows.Forms.DataGridView dataGridViewPosts;
        private System.Windows.Forms.WebBrowser webBrowserPostContent;
        private System.Windows.Forms.DataGridView dataGridViewAuthors;
        private System.Windows.Forms.DataGridView dataGridViewCategories;
        private System.Windows.Forms.DataGridView dataGridViewTags;
        private System.Windows.Forms.TabPage tabPageComments;
        private System.Windows.Forms.DataGridView dataGridViewComments;
        private System.Windows.Forms.TabPage tabPagePostMeta;
        private System.Windows.Forms.DataGridView dataGridViewPostMeta;
