using System;
using Avalonia.Controls;
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
        // Update the sidebar
        var sidebar = this.FindControl<Sidebar>("Sidebar");
        sidebar?.UpdateSidebarUserID();

        // Update UI based on login status
        SetLoginOverlay();
    }
    public static void SetLoginOverlay()
    {
        // Show or hide the login overlay based on the user's login status
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