using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;
using DelphiNet6.Models;

namespace DelphiNet6.Controls;

public partial class Sidebar : UserControl
{
    public Sidebar()
    {
        InitializeComponent();
    }

    public void UpdateSidebarUserID()
    {
        if (User.Identifier == 0)
        {
            IdentifierDisplay.Text = "User Not Logged In";
        }
        else
        {
            IdentifierDisplay.Text = $"Your User ID is: {User.Identifier}";
        }
    }
}