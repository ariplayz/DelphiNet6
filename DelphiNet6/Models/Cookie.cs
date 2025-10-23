using System;
using Microsoft.AspNetCore.Http;

namespace DelphiNet6.Models;

public class Cookie
{
    public static void SetCookie(HttpContext httpContext, int userIdentifier)
    {
        var cookieOptions = new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            Secure = true, // Set this to false if not using HTTPS (for development purposes)
            Expires = DateTime.Now.AddDays(1) // Cookie expiration time
        };
        httpContext.Response.Cookies.Append("DelphiNetAuth", userIdentifier.ToString(), cookieOptions);
    }
    
    public static string GetCookie(HttpContext httpContext)
    {
        if (httpContext.Request.Cookies.TryGetValue("DelphiNetAuth", out string value))
        {
            return value;
        }
        return null; // Return null if no cookie is found
    }
}