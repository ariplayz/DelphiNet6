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

    public static void UpdateSidebarUserID(Sidebar sidebarInstance)
    {
        if (sidebarInstance != null)
        {
            if (User.Identifier.ToString() == "0")
            {
                sidebarInstance.IdentifierDisplay.Text = "User Not Logged In";
            }
            else
            {
                sidebarInstance.IdentifierDisplay.Text = $"Your User ID is: {User.Identifier.ToString()}";
            }
        }
    }
}