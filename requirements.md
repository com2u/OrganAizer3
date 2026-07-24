# Terminlandschaft - Requirements

## Slidev project and media workspace (0.1.19)

- Users can create, select, activate, and delete multiple presentations.
- Every presentation owns an independent Markdown file and navigable folder
  tree; projects persist across container updates.
- Users can create folders and upload or delete images, backgrounds, videos,
  audio, fonts, PDFs, and other media files up to 100 MB.
- The API reverse proxy accepts presentation uploads up to 110 MB while the
  backend enforces the 100 MB per-file application limit.
- Path traversal is rejected, and the active project, `slides.md`, and the
  project's public media root are protected against accidental deletion.
- The workspace offers editing, audience presentation, native Slidev presenter
  view, reconnect, and browser fullscreen modes.
- Switching projects restarts only the Slidev process and keeps OrganAIzer,
  telephony, and other external workspaces available.

## Configurable external workspaces (0.1.18)

- Open Notebook, n8n, and Slidev tabs appear only when their external
  connection exists and is actively configured.
- Open Notebook credentials persist below `data/integrations/`, are excluded
  from uploads and Git, and are never returned by configuration APIs.
- Slidev provides a persistent Markdown editor plus embedded presentation,
  separate-window, and browser-fullscreen modes.
- Backend uploads preserve all integration settings and project data.
- Slidev and HyperFrames iframe sessions use automatically issued, signed,
  short-lived tickets and HttpOnly partitioned cookies instead of an extra
  browser login prompt.
- HyperFrames runs in an independent Node 22 container with Chromium and FFmpeg;
  project, asset, and render-output volumes persist below `data/hyperframes/`.
- Integration and phonebook dialogs use the same opaque resource-modal surface,
  spacing, shadow, backdrop, and theme behavior.

## Open Notebook integration (0.1.15)

- Knowledge offers a dedicated, responsive “Research notebooks” tab in German
  and English without replacing the existing Obsidian workflow.
- The interface shows readiness and supports notebook listing and creation,
  including loading, empty, offline, and error states.
- Credentials and internal service addresses stay on the backend; native UI
  access uses authenticated OrganAIzer endpoints.
- Open Notebook and SurrealDB data persist below `data/` so backend uploads
  cannot overwrite research content.
- The full studio is linked only through an explicitly configured HTTPS URL.
- Since 0.1.16 the complete original studio is embedded as the default view;
  collections, sources, research, notes, transformations and podcasts must be
  usable without leaving OrganAIzer.

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
6. Individual call-history entries can be deleted after confirmation.
7. Phonebook contacts store an email address and are edited in a modal dialog opened by double-click.

## Resource Editing

1. Groups, people, roles, appointments, rooms, components, planning rules, and phonebook contacts use consistent modal editors.
2. Double-clicking a list or table entry opens its editor; explicit edit buttons remain available for accessibility.
3. Meeting editors load persisted user groups and allow participants to be added or removed using drag-and-drop or click controls.
4. Participant updates are validated and persisted in `termin_teilnehmer`.
5. People include a searchable location field.
6. Roles support validated assignments to people and user groups.
7. Meetings support validated assignments to rooms and components.
8. Excel import/export preserves all resource entities and assignments in dedicated worksheets.
9. Before replacement, imports list missing or inconsistent references and require explicit confirmation or cancellation.

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
