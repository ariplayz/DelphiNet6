using System;
using System.Collections.Generic;
using System.IO;
using DelphiNet6.Views;
using DelphiNet6;

namespace DelphiNet6.Models;

public class  User
{
    public static int Identifier;
    public static string? Username;
    public static string? Form;
    public static string? FirstName;
    public static string? LastName;

    private static readonly IAuthStorage Storage = new FileAuthStorage();

    public static bool LoginStatus
    {
        get => Identifier != 0;
    }

    public static bool DoAuth(string username, string password)
    {
        // Create the database interface to interact with the database
        var credsPath = Path.Combine(AppContext.BaseDirectory, "db_credentials.txt");
        var db = new databaseInterface(credsPath);

        // SQL query with parameters to prevent SQL injection
        string selectQuery = "SELECT * FROM users WHERE username = @username AND password = @password";

        // Dictionary for SQL parameters
        var selectParameters = new Dictionary<string, object>
        {
            { "@username", username },
            { "@password", password }
        };

        // Execute query and get the result set (list of rows)
        var resultSet = db.ExecuteQuery(selectQuery, selectParameters);
        if (resultSet.Count == 0)
        {
            Identifier = 0;
            return false;
        }

        var dictionary = resultSet[0];

        if (dictionary.TryGetValue("username", out var name))
        {
            Username = name?.ToString();
        }

        if (dictionary.TryGetValue("identifier", out var identifier))
        {
            Identifier = identifier is int i ? i : Convert.ToInt32(identifier);
        }

        if (dictionary.TryGetValue("form", out var form))
        {
            Form = form?.ToString();
        }

        if (dictionary.TryGetValue("first-name", out var firstname))
        {
            FirstName = firstname?.ToString();
        }

        if (dictionary.TryGetValue("last-name", out var lastname))
        {
            LastName = lastname?.ToString();
        }

        // Persist identifier locally
        if (Identifier != 0)
        {
            Storage.SaveUserId(Identifier);
        }

        MainView.SetLoginOverlay();
        return Identifier != 0;
    }
}