using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
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
        string username = usernameIn.Text;
        string password = passwordIn.Text;
        User.DoAuth(username, password);
        MainView.SetLoginOverlay();
    }
}