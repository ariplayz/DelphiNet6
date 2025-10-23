using System;
using System.IO;

namespace DelphiNet6.Models;

public interface IAuthStorage
{
    void SaveUserId(int userId);
    int? LoadUserId();
    void Clear();
}

public class FileAuthStorage : IAuthStorage
{
    private readonly string _path = Path.Combine(AppContext.BaseDirectory, "user_auth.txt");

    public void SaveUserId(int userId)
    {
        try
        {
            File.WriteAllText(_path, userId.ToString());
        }
        catch
        {
            // swallow for now; could add logging later
        }
    }

    public int? LoadUserId()
    {
        try
        {
            if (!File.Exists(_path)) return null;
            var text = File.ReadAllText(_path).Trim();
            if (int.TryParse(text, out var id)) return id;
            return null;
        }
        catch
        {
            return null;
        }
    }

    public void Clear()
    {
        try
        {
            if (File.Exists(_path)) File.Delete(_path);
        }
        catch
        {
            // ignore
        }
    }
}