using System;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.VisualTree;
using DelphiNet6.Controls;
using DelphiNet6.Models;

namespace DelphiNet6.Views;

public partial class MainView : UserControl
{
    private static Panel? _loginOverlay;
    private static ScrollViewer? _mainContentScrollViewer;

    public MainView()
    {
        InitializeComponent();
        
        // Locate elements in the UI
        _loginOverlay = this.FindControl<Panel>("LoginOverlay");
        _mainContentScrollViewer = this.FindControl<ScrollViewer>("MainContentScrollViewer");
        
        var sidebar = this.FindControl<Sidebar>("Sidebar");
        Sidebar.UpdateSidebarUserID(sidebar);
        
        SetLoginOverlay();
    }

    public static void SetLoginOverlay()
    {
        // If the user is logged in, hide the login overlay; otherwise, show it and disable the main content
        UpdateUI(User.LoginStatus);
    }

    public static void UpdateUI(bool isUserLoggedIn)
    {
        if (_loginOverlay != null)
        {
            _loginOverlay.IsVisible = !isUserLoggedIn; // Show login overlay if not logged in
        }

        if (_mainContentScrollViewer != null)
        {
            _mainContentScrollViewer.IsEnabled = isUserLoggedIn; // Enable or disable main content
        }
    }
}