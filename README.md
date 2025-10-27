<div align="center">

# DelphiNet6 · WIP

Modern, cross‑platform school program tracking built with Avalonia — for Desktop and Browser (WASM).

<a href="https://dotnet.microsoft.com/">
  <img alt=".NET" src="https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white" />
</a>
<a>
  <img alt="Platforms" src="https://img.shields.io/badge/Platforms-Desktop_%7C_Browser_(WASM)-00b894" />
</a>
<a>
  <img alt="Status" src="https://img.shields.io/badge/Status-Work_in_Progress-f39c12" />
</a>
<a href="LICENSE">
  <img alt="License" src="https://img.shields.io/badge/License-CC0_1.0-lightgrey.svg" />
</a>

</div>

---

DelphiNet6 is a work‑in‑progress replacement for DelphiNet v5 used by The Delphian School and Delphi Academies. Its primary purpose is to track students' school programs and schedules — giving staff and students a modern interface to view, update, and manage school‑related information on any device.

Highlights at a glance:
- Track students' programs, schedules, roll calls, attendance points, and related data
- Authentication and basic session storage (see Models: AuthStorage, User)
- One UI, two targets: Desktop (net9.0) and Browser via WebAssembly (net9.0‑browser)
- MVVM structure with Views, ViewModels, Styles, and reusable Controls


## Table of Contents
- What it is and what it does
- Screenshots / Preview
- Features
- Tech Stack
- Prerequisites
- Quick Start
- Run (Desktop)
- Run (Browser / WASM)
- Publish
- Project Structure
- Common Issues & Tips
- Roadmap
- Contributing
- License


## What it is and what it does
DelphiNet6 is being built to evolve toward feature parity with DelphiNet v5 while modernizing the tech stack and UX. It focuses on:
- Student program tracking and scheduling
- Roll call and attendance/points visibility
- Simple auth/session handling
- Responsive access on desktop and in the browser

Status: Early development (WIP). Interfaces, models, and flows are likely to change as functionality is filled out and aligned with institutional requirements.


## Screenshots / Preview
> Screenshots coming soon. If you’d like to contribute design ideas or mockups, feel free to open an issue or PR!


## Features
- Avalonia UI (net9.0)
- Desktop and Browser (WASM) targets
- MVVM‑style organization (Views, ViewModels, Styles)
- Example UI elements: Login control, Sidebar, Main view
- Simple models for authentication state


## Tech Stack
- Language: C# / .NET 9
- UI: Avalonia
- Browser: WebAssembly (net9.0‑browser)
- Packaging: dotnet publish


## Prerequisites
- .NET SDK 9.0 or newer
- A modern browser (for the WASM target)

Check your installed SDK:

```
 dotnet --info
```

Install .NET: https://dotnet.microsoft.com/download


## Quick Start
Clone the repo and restore dependencies:

```
 git clone <this-repo-url>
 cd DelphiNet6
 dotnet restore
```


## Run (Desktop)
From the solution root, run the desktop project:

```
 dotnet run --project DelphiNet6
```

This builds and launches the Avalonia desktop application (net9.0).


## Run (Browser / WASM)
From the solution root, run the browser project:

```
 dotnet run --project DelphiNet6.Browser
```

After the build, the development server will start and print a local URL (for example http://localhost:5000). Open it in your browser. First load may take longer while the WASM runtime downloads.


## Publish
- Desktop (self‑contained example for macOS, adjust RID as needed):

```
 dotnet publish DelphiNet6 -c Release -r osx-x64 --self-contained true
```

- Browser (static site output in bin/Release/.../wwwroot):

```
 dotnet publish DelphiNet6.Browser -c Release
```

The published browser assets will be under:

```
 DelphiNet6.Browser/bin/Release/net9.0-browser/wwwroot
```

You can serve that folder with any static file server.


## Project Structure
- DelphiNet6/
  - Assets/ — fonts and images
  - Controls/ — custom Avalonia controls (e.g., Login, Sidebar)
  - Models/ — app models (AuthStorage, User, Program)
  - Styles/ — global styles and themes
  - ViewModels/ — view‑models for MVVM
  - Views/ — XAML views (e.g., MainView)
- DelphiNet6.Browser/ — WASM browser target
- Directory.Packages.props — centralized NuGet package management
- LICENSE — project license
- README.md — this file


## Common Issues & Tips
- First WASM load is slow: the browser downloads the .NET runtime and assemblies; subsequent loads are faster due to caching.
- If hot reload doesn’t kick in, ensure you are using .NET SDK 9.0 and recent Avalonia packages.
- Clear bin/obj if you hit unusual build errors:

```
 dotnet clean
 dotnet restore
```


## Roadmap
- [ ] Authentication flow polish and persistence refinements
- [ ] Student program CRUD screens and workflows
- [ ] Attendance/points dashboards
- [ ] Offline‑friendly improvements (desktop)
- [ ] Design system and theme passes (dark/light)
- [ ] Packaging and deployment guidance (Windows/Linux/macOS)

If an item interests you, please open an issue to discuss before starting.


## Contributing
Small fixes and improvements are welcome. Please open an issue or a pull request with a concise description of the change. For larger features, propose an outline first so we can align on direction.


## License
This project is dedicated to the public domain under Creative Commons Zero v1.0 Universal (CC0 1.0).
See the LICENSE file for the full legal text, or visit https://creativecommons.org/publicdomain/zero/1.0/.
