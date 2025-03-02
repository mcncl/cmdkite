# CMDKite Theming System

CMDKite includes a comprehensive theming system that provides support for light, dark, and system-defined themes. This document explains how the theming system works and how to customize it.

## Overview

The theming system consists of several components:

1. **ThemeService**: A singleton service for managing theme state, preferences, and system theme detection
2. **ThemeProvider**: A React context provider that exposes theme values and methods to components
3. **ThemeToggle**: A UI component for switching between themes
4. **CSS Variables**: A set of CSS variables for consistent styling across the application

## Features

- **Light/Dark/System Themes**: Support for light, dark, and system-defined themes
- **Persistent Preferences**: User theme preferences are saved across sessions
- **System Theme Detection**: Automatically follows the user's system preferences when set to "system" theme
- **Theme Event System**: Components can subscribe to theme changes
- **Accessible Color Contrast**: Color schemes designed for optimal accessibility

## Theme Variables

The theming system uses CSS variables to define colors, spacing, animation timing, and other design tokens. This approach ensures consistency across the application and simplifies theme switching.

### Color Variables

```css
/* Background colors */
--cmd-k-bg-primary
--cmd-k-bg-secondary
--cmd-k-bg-tertiary
--cmd-k-bg-selected
--cmd-k-bg-hover
--cmd-k-bg-overlay

/* Text colors */
--cmd-k-text-primary
--cmd-k-text-secondary
--cmd-k-text-tertiary
--cmd-k-text-inverted

/* Border colors */
--cmd-k-border-primary
--cmd-k-border-secondary
--cmd-k-border-focus

/* Accent colors */
--cmd-k-accent-primary
--cmd-k-accent-secondary
--cmd-k-accent-tertiary

/* Status colors */
--cmd-k-success
--cmd-k-warning
--cmd-k-error
--cmd-k-info
```

### Layout Variables

```css
/* Animation durations */
--cmd-k-animation-fast     /* 0.15s */
--cmd-k-animation-normal   /* 0.25s */
--cmd-k-animation-slow     /* 0.4s */

/* Border radius */
--cmd-k-radius-small       /* 4px */
--cmd-k-radius-medium      /* 8px */
--cmd-k-radius-large       /* 12px */

/* Spacing */
--cmd-k-spacing-xs         /* 4px */
--cmd-k-spacing-sm         /* 8px */
--cmd-k-spacing-md         /* 16px */
--cmd-k-spacing-lg         /* 24px */
--cmd-k-spacing-xl         /* 32px */
```

## Using the Theme System

### In React Components

You can access the current theme and theme-related methods using the `useTheme` hook:

```tsx
import { useTheme } from '../ThemeProvider';

const MyComponent = () => {
  const { theme, themeMode, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Current mode: {themeMode}</p>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
