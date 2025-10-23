using System;
using System.Collections.Generic;

namespace DelphiNet6.Models;

public class User
{
    public static int Identifier;

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
    }
}