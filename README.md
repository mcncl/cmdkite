# CMDKite

A Chrome extension that provides a command palette-style interface for quickly navigating through Buildkite pipelines using keyboard shortcuts.

## Features

- **Keyboard Shortcut Access**: Launch the command box with `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- **Pipeline Search**: Quickly search and navigate to your Buildkite pipelines
- **Fuzzy Matching**: Find pipelines even with partial or imprecise search terms
- **Customizable Trigger**: Optional character trigger (like `/` or `:`) instead of keyboard shortcut

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory created after building

## Development

### Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development build with auto-reload:
   ```
   npm run dev
   ```

### Project Structure

```
quick-launch-box/
├── src/
│   ├── background/         # Background service worker
│   │   ├── index.ts        # Main entry point for background script
│   │   └── services/       # Background services
│   │       └── commandService.ts
│   ├── content/            # Content scripts
│   │   ├── components/     # React components
│   │   │   └── CommandBox.tsx
│   │   ├── commands/       # Command definitions
│   │   │   └── pipeline.ts
│   │   ├── index.tsx       # Content script entry point
│   │   ├── styles.ts       # CSS styles for the command box
│   │   └── types.ts        # TypeScript interfaces
│   ├── options/            # Extension options page
│   │   ├── index.ts        # Options script
│   │   └── options.html    # Options page HTML
│   └── manifest.json       # Extension manifest
├── package.json
├── tsconfig.json
└── webpack.config.js
```

### Key Components

1. **Background Script**: Manages command shortcuts and communication with content scripts
2. **Content Script**: Renders the command box UI on Buildkite pages
3. **CommandBox Component**: React component for searching and displaying pipelines
4. **Pipeline Commands**: Logic for fetching and interacting with Buildkite pipelines

## Usage

### Default Keyboard Shortcut

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) on any Buildkite page to open the command palette.

### Search Pipelines

1. Type in the search box to find pipelines
2. Use arrow keys to navigate through results
3. Press Enter to navigate to the selected pipeline

### Configuration Options

Access extension options by right-clicking the extension icon and selecting "Options", or by visiting `chrome://extensions` and clicking "Details" > "Extension options".

Available settings:
- **Trigger Key**: Set a single character (e.g., `/` or `:`) to trigger the command box instead of using the keyboard shortcut

## Testing

The CMDKite extension uses Jest and React Testing Library for testing components and utility functions.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Testing Structure

The project follows a standard testing structure:

- Unit tests for utility functions and services
- Component tests using React Testing Library
- Integration tests for key features

Tests are organized alongside the components and utilities they test:

```
src/
├── content/
│   ├── components/
│   │   ├── __tests__/          # Component tests
│   │   │   └── pipelineItem.test.tsx
│   │   └── pipelineItem.tsx
│   ├── commands/
│   │   ├── pipeline/
│   │   │   ├── __tests__/      # Command tests
│   │   │   │   └── fuzzyMatch.test.ts
│   │   │   └── pick.ts
│   ├── util/
│   │   ├── __tests__/          # Utility tests
│   │   │   └── helpers.test.ts
│   │   └── helpers.ts
└── test/
    ├── mocks/                  # Shared mocks
    │   └── chrome.ts
    └── setup.ts                # Test configuration
```

## Chrome API Mocking

Since the extension relies on Chrome APIs that aren't available in the test environment, we use Jest mocks to simulate these APIs. This allows us to test the extension's functionality without an actual Chrome browser environment.

## Writing Tests

When writing tests:

1. For components:
   - Test rendering
   - Test user interactions
   - Test state changes

2. For utility functions:
   - Test edge cases
   - Test error handling
   - Test typical usage

3. For commands:
   - Test availability conditions
   - Test execution logic
   - Mock any DOM or Chrome API dependencies

## Technical Details

### Technologies Used

- **TypeScript**: For type-safe JavaScript
- **React**: For UI components
- **Chrome Extension API**: For browser integration
- **Webpack**: For bundling and building

### Performance Considerations

- The extension uses a connection-based approach to maintain service worker activity
- Command box is rendered only when needed to minimize performance impact
- The UI is designed to be unobtrusive when not in use

## Limitations

- Only works on Buildkite domains
- Some pages are excluded (documentation, changelog, privacy policy, and terms)
- Due to the way Buildkite uses pagination, only the first page of pipelines will be auto-suggested via the fuzzy search

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License.
