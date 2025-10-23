using System.Collections.Generic;
using System;
using System.IO;
using DelphiNet6;

namespace DelphiNet6.Models;

public class Program
{
    public void initializeProgramDB()
    {
        var credsPath = Path.Combine(AppContext.BaseDirectory, "db_credentials.txt");
        var db = new databaseInterface(credsPath);
        string selectQuery = "SELECT * FROM users WHERE identifier = @identifier";
        var selectParameters = new Dictionary<string, object>
        {
            {"@identifier", User.Identifier}
        };

        // Execute query and get the result set (list of rows)
        var resultSet = db.ExecuteQuery(selectQuery, selectParameters);
    }
}