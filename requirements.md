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

## AI Planning

1. All active planning rules are selected by default; detailed rules remain collapsed until requested and can then be deselected individually.
2. Validation and planning use OpenRouter with a searchable choice of available text models.
3. Long planning and Hermes research requests must run asynchronously and expose elapsed time plus available processing phases in the UI.
4. Validation checks rules, meetings, intervals, durations, participants, and fixed appointments for contradictions and reports findings in a modal dialog.
5. Planning returns structured appointment proposals and reports unresolved conflicts or ambiguities instead of silently ignoring them.
6. A planning result is downloadable as an Excel workbook compatible with the schedule import/export format.
7. Excel imports overwrite existing database content only after an explicit frontend warning and a mandatory backend confirmation flag.

## System Monitoring

Authenticated users can inspect backend CPU and RAM usage and the running, stopped, or failed state of Docker containers from the System view.

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
