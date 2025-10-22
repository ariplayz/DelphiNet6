using System;
using Avalonia.Controls;
using DelphiNet6.Controls;
using DelphiNet6.Models;

namespace DelphiNet6.Views;

public partial class MainView : UserControl
{
    public MainView()
    {
        if (User.LoginStatus == false)
        {
            var login_window = new Login();
            var container = this.FindControl<ContentControl>("container");
            container.Content = login_window;
        }
        InitializeComponent();
    }
}