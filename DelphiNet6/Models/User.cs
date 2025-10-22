using System.Collections.Generic;

namespace DelphiNet6.Models;

public class User
{
    public static int Identifier { get; set; }

    public static void Authenticate(string username, string password)
    {
         var db = new databaseInterface("db_credentials.txt");
        string selectQuery = "SELECT * FROM users WHERE username = @username AND password = @password";
        var selectParameters = new Dictionary<string, object>
        {
            {"@username", username};
            {"@password", password};
        };

        // Execute query and get the result set (list of rows)
        var resultSet = db.ExecuteQuery(selectQuery, selectParameters);
    }
    
}