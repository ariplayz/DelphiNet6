using System;
using System.Collections.Generic;
using DelphiNet6.Views;

namespace DelphiNet6.Models;

public class User
{
    public static int Identifier;
    public static string Username;
    public static string Form;
    public static string FirstName;
    public static string LastName;

    public static bool LoginStatus
    {
        get => Identifier != 0;
    }

    public static void DoAuth(string username, string password)
    {
        // Create the database interface to interact with the database
        var db = new databaseInterface("db_credentials.txt");

        // SQL query with parameters to prevent SQL injection
        string selectQuery = "SELECT * FROM users WHERE username = @username AND password = @password";

        // Dictionary for SQL parameters
        var selectParameters = new Dictionary<string, object>
        {
            { "@username", username }, // Corrected syntax (removed semicolon)
            { "@password", password }  // Corrected syntax (removed semicolon)
        };

        // Execute query and get the result set (list of rows)
        var resultSet = db.ExecuteQuery(selectQuery, selectParameters);

        foreach (var dictionary in resultSet)
        {
            if (dictionary.TryGetValue("username", out var name))
            {
                Username = name.ToString();
            }
            
            if (dictionary.TryGetValue("identifier", out var identifier))
            {
                Identifier = identifier is int ? (int)identifier : 0;
            }

            if (dictionary.TryGetValue("form", out var form))
            {
                Form = form.ToString();
            }

            if (dictionary.TryGetValue("first-name", out var firstname))
            {
                FirstName = firstname.ToString();
            }

            if (dictionary.TryGetValue("last-name", out var lastname))
            {
                LastName = lastname.ToString();
            }
            
            break;
        }
        
        MainView.SetLoginOverlay();

    }
}