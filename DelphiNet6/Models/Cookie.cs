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
            Secure = true,
            Expires = DateTime.Now.AddDays(1) // Cookie expires after one day
        };
        httpContext.Response.Cookies.Append("DelphiNetAuth", User.Identifier.ToString(), cookieOptions);
    }
    
    public static string GetCookie(HttpContext httpContext)
    {
        if (httpContext.Request.Cookies.TryGetValue("DelphiNetAuth", out string value))
        {
            return value;
        }
        return null; // Cookie not found
    }
}