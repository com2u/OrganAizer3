# Terminlandschaft - Requirements

## Core Requirements

1. Create a database for managing appointments for scheduling purposes using Python via the CLI.
2. Create a Python tool that imports the data from the attached Excel file (schedule.xlsx) into an SQLite database. Ensure during import that the database tables are cleared beforehand.
3. Pay attention to the architecture. The SQLite interface should be easy to replace with PostgreSQL later. Also provide an export function that writes all data from the database back into an Excel file in the same format. Each worksheet should be represented as a table. The worksheet "Terminliste" contains redundant information. From "Terminliste", store only week, day, start, and meeting. The other information (end, name, interval, duration, and participants) is derived from the other tables. Be verbose with debug output for every single step, and especially with error messages.
4. Create corresponding Readme.md and gitignore.

## Weekly Calendar

Create a React interface for visualizing appointments. The interface should be able to display calendar weeks. The appointments are assigned to calendar weeks and weekdays. Extend the existing Python project with a web server for the React interface. Provide Excel import and export in the web interface. In the interface, for one week (Monday-Sunday), display the days on the X-axis and a timeline on the Y-axis showing, for each meeting, the number, start time, end time, and name.

When double-clicking an appointment, all details of that appointment should be displayed:
Number, name, week, day, start, end, duration, interval, participants.

## Highlight / Filter

Extend the weekly calendar with a filter to filter by person groups or by a meeting, or to highlight them in color.

## Documentation

With each new requirement update the requirements.md and readme.md.
Describe the current architecture in a implementation.md

## Voice Dialog and Telephony

1. The authenticated Speech / Dialog view must establish a realtime audio session with the same assistant used for telephone calls.
2. Browser clients must receive a publicly reachable encrypted `wss://` LiveKit endpoint; server-local `localhost` URLs must never be returned to remote browsers.
3. Browser Dialog and SIP telephone sessions must remain independent transports so changes to one connection path do not interrupt the other.
4. Connection attempts must fail within a bounded time, expose an understandable error, and recover visibly when LiveKit reconnects.
5. Microphone access must start only after an explicit user action and the interface must explain the permission request.

## Startup

Create a ./start.sh to start the application

## Test

Write automated tests to Test the functionality. Ensure the functionality is given - Otherwise report an error and complete the implementation:
- Import
- Export
- View Week 1
- View Week 2
- View Week 3
- Filter Meeting 1
- Filter User Group C2
- Filter User Group F2
- Detail view of one entry
