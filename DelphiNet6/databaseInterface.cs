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
    private readonly string _connectionString;
    private readonly bool _isConfigured;

    // Constructor that loads the connection string from a file
    public databaseInterface(string credentialsFilePath)
    {
        try
        {
            if (!File.Exists(credentialsFilePath))
            {
                // Credentials file missing; mark DB as not configured to avoid crashing the UI
                _connectionString = string.Empty;
                _isConfigured = false;
                return;
            }

            // Read the connection string from the file
            _connectionString = File.ReadAllText(credentialsFilePath).Trim();
            _isConfigured = !string.IsNullOrWhiteSpace(_connectionString);
        }
        catch
        {
            // Any error reading credentials should not prevent the UI from loading
            _connectionString = string.Empty;
            _isConfigured = false;
        }
    }

    // Method to execute non-query commands like INSERT, UPDATE, DELETE
    public void ExecuteNonQuery(string query, Dictionary<string, object>? parameters = null)
    {
        if (!_isConfigured)
        {
            // Silently no-op when DB is not configured
            return;
        }

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

        if (!_isConfigured)
        {
            // Return empty set if DB is not configured
            return results;
        }

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