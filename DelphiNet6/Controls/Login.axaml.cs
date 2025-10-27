using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using Avalonia.VisualTree;
using DelphiNet6.Models;
using DelphiNet6.Controls;
using DelphiNet6;
using DelphiNet6.Views;

namespace DelphiNet6.Controls;


public partial class Login : UserControl
{
    public Login()
    {
        InitializeComponent();
    }

    private void authenticatebutton(object sender, RoutedEventArgs e)
    {
        var username = (usernameIn?.Text ?? string.Empty).Trim();
        var password = (passwordIn?.Text ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
        {
            return;
        }

        var success = User.DoAuth(username, password);
        if (success)
        {
            MainView.SetLoginOverlay();

            // Update the sidebar text after successful login
            var top = TopLevel.GetTopLevel(this);
            if (top is Window w)
            {
                if (w.Content is MainView mv)
                {
                    var sidebar = mv.FindControl<Sidebar>("Sidebar");
                    sidebar?.UpdateSidebarUserID();
                }
            }
        }
        else
        {
            // Optionally show an error message in the future
        }
    }
}