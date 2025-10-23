using CommunityToolkit.Mvvm.ComponentModel;

using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace DelphiNet6.ViewModels;

public class MainViewModel : INotifyPropertyChanged
{
    private bool _isUserLoggedIn;

    public bool IsUserLoggedIn
    {
        get => _isUserLoggedIn;
        set
        {
            if (_isUserLoggedIn != value)
            {
                _isUserLoggedIn = value;
                OnPropertyChanged();
            }
        }
    }

    #region INotifyPropertyChanged Implementation
    public event PropertyChangedEventHandler? PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
    #endregion
}