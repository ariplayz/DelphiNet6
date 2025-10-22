using System;
using System.Collections.Generic;

namespace DelphiNet6.Models;

public class User
{
    public static int Identifier { get; set; }
    
    bool CheckLoginStatus()
    {
        // Ensure Identifier is properly checked (Identifier is an integer, so it can't be null)
        return Identifier != default(int); // default(int) is 0
        public static bool LoginStatus = Identifier != default(int);
    }

    public static void Authenticate(string username, string password)
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

        // Check if the query returned at least one user
        if (resultSet.Count > 0)
        {
            // Assuming the 'identifier' column exists in the user table
            var userRow = resultSet[0];
            Identifier = Convert.ToInt32(userRow["identifier"]); // Set the Identifier from the database
            Console.WriteLine($"Authentication successful: User ID {Identifier}");
        }
        else
        {
            Console.WriteLine("Invalid username or password.");
        }
    }
}