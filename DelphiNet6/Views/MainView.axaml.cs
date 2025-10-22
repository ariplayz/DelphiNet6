using System;
using Avalonia.Controls;

namespace DelphiNet6.Views;

public partial class MainView : UserControl
{
    public MainView()
    {
        InitializeComponent();
        databaseInterface.initializeDB();
    }
}