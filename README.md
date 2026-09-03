# WeddingGallery

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

# Wedding Gallery

A mobile-first Angular guest photo uploader with Google Drive storage through Google Apps Script.

## Connect Google Drive

1. Create the destination folder in Google Drive and copy its folder ID from the URL.
2. Open [script.google.com](https://script.google.com), create a project, and paste in `google-apps-script/Code.gs`.
3. Replace `PASTE_GOOGLE_DRIVE_FOLDER_ID_HERE` with the folder ID, then run `doPost` once and approve Drive access.
4. Deploy as a web app: execute as **Me**, access **Anyone**. Copy the deployment URL.
5. Paste that URL into `uploadEndpoint` in `src/app/app.ts`.

The app sends images as base64 data in a POST request. Google credentials stay inside Apps Script and are never shipped to guests.

## Run locally

```bash
npm start
```

Then open `http://localhost:4200/`. Build for hosting with `npm run build`.
