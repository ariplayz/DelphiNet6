using MySqlConnector;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelphiNet6;

public class databaseInterface
{
    private string _connectionString;

    // Constructor that loads the connection string from a file
    public databaseInterface(string credentialsFilePath)
    {
        if (!File.Exists(credentialsFilePath))
        {
            throw new FileNotFoundException("The credentials file was not found.");
        }

        // Read the connection string from the file
        _connectionString = File.ReadAllText(credentialsFilePath).Trim();
    }

    // Method to execute non-query commands like INSERT, UPDATE, DELETE
    public void ExecuteNonQuery(string query, Dictionary<string, object>? parameters = null)
    {
        try
        {
            using (var connection = new MySqlConnection(_connectionString))
            {
                connection.Open(); // Open database connection

                using (var command = new MySqlCommand(query, connection))
                {
                    // Add parameters (if any)
                    if (parameters != null)
                    {
                        foreach (var param in parameters)
                        {
                            command.Parameters.AddWithValue(param.Key, param.Value);
                        }
                    }

                    // Execute the non-query command
                    command.ExecuteNonQuery();
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error executing non-query: {ex.Message}");
        }
    }

    // Method to execute queries that return results like SELECT
    public List<Dictionary<string, object>> ExecuteQuery(string query, Dictionary<string, object>? parameters = null)
    {
        var results = new List<Dictionary<string, object>>();

        try
        {
            using (var connection = new MySqlConnection(_connectionString))
            {
                connection.Open(); // Open database connection

                using (var command = new MySqlCommand(query, connection))
                {
                    // Add parameters (if any)
                    if (parameters != null)
                    {
                        foreach (var param in parameters)
                        {
                            command.Parameters.AddWithValue(param.Key, param.Value);
                        }
                    }

                    using (var reader = command.ExecuteReader())
                    {
                        // Read rows from the result set
                        while (reader.Read())
                        {
                            var row = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                row[reader.GetName(i)] = reader.GetValue(i);
                            }
                            results.Add(row);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error executing query: {ex.Message}");
        }

        return results;
    }
    
}