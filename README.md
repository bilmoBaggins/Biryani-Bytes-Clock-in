# Biryani Bytes Clock-In/Out System

A tablet/mobile app for Biryani Bytes employees to clock in/out with a PIN, and for admins to manage employees, PINs, and payroll.

## Tech Stack

- **Expo 54** — React Native framework
- **React 19.1 + React Native 0.81** — UI and mobile runtime
- **React Navigation 6.x** — Bottom tab navigation
- **TypeScript 5.9** — Type safety
- **expo-sqlite** — Local, offline SQLite database
- **expo-haptics** — Vibration feedback on PIN entry
- **Expo Go** — Mobile testing environment (see "Deploying to a Tablet" for standalone installs)

## Features

- **Tile-based Clock In/Out** — Employees tap their name tile (colored green when clocked in, white when clocked out) and enter their 4-digit code to toggle status. Wrong codes shake and vibrate; correct codes auto-submit with no extra buttons.
- **PIN-protected Payroll tab** — The Payroll/Admin tab is locked behind a 4-digit admin PIN, entered the same way (auto-submit, shake on error).
- **Employee Management** — Add employees (auto-generates a unique 4-digit code), edit hourly rate and PIN code, or delete employees.
- **Editable PINs** — Both employee codes and the admin PIN are stored in the database and changeable at any time from the Payroll tab — no rebuild required.
- **Payroll Dashboard** — Completed shifts (today) and monthly payroll totals per employee, plus an overall summary.
- **Pull-to-refresh** — Swipe down on either tab to reload data instead of a manual refresh button.
- **Tap-outside-to-close pop-ups** — All modals (PIN entry, add/edit employee, change admin PIN) close when tapping outside the card.
- **Local Database** — SQLite with employees, shifts, and settings tables; fully offline, no network calls.

## Project Structure

```
src/
  database/
    database.ts      — SQLite setup, table creation & migrations
    employees.ts      — Employee CRUD, PIN code generation/validation
    shifts.ts         — Clock in/out logic & shift calculations
    settings.ts       — Admin PIN storage
  screens/
    ClockScreen.tsx   — Employee tile grid + PIN modal
    AdminScreen.tsx   — PIN-gated payroll dashboard & employee management
  types/
    index.ts          — TypeScript interfaces
  utils/
    payroll.ts         — Payroll calculations
App.tsx               — Root component, DB init & tab navigation setup
index.ts              — Entry point
```

## Database Schema

### employees
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT UNIQUE NOT NULL)
- `hourly_rate` (REAL, default: £12.00)
- `code` (TEXT) — unique 4-digit PIN used to clock in/out
- `is_clocked_in` (INTEGER, 0/1) — current clock status, source of truth for the tile color

### shifts
- `id` (INTEGER PRIMARY KEY)
- `employee_id` (INTEGER FOREIGN KEY)
- `employee_name` (TEXT)
- `date` (TEXT, YYYY-MM-DD)
- `clock_in_time` (TEXT, HH:mm)
- `clock_out_time` (TEXT, HH:mm, nullable)
- `hourly_pay` (REAL, nullable) — calculated once clocked out

### settings
- `id` (INTEGER PRIMARY KEY, always 1)
- `admin_pin` (TEXT) — 4-digit PIN to unlock the Payroll tab

## Setup & Running

### Prerequisites
- Node.js 18+
- npm
- Expo Go app on phone/tablet (iOS/Android)

### Install & Run
```bash
npm install
npx expo start
```

Scan the QR code in Expo Go on your device to load the app. The default admin PIN is `1234` — change it from Payroll → Security → Change Admin PIN.

## Deploying to a Tablet (Standalone, No Dev Server)

Expo Go requires a computer running `npx expo start` on the same Wi-Fi network, which isn't practical for a permanently installed kiosk tablet. For a standalone install:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

This builds an installable `.apk` in the cloud (no local Android SDK needed). Transfer it to the tablet and install it directly — no dev server, no same-network requirement, fully offline since the database is local SQLite.

Alternatively, with Android Studio installed locally:
```bash
npx expo prebuild
npx expo run:android
```

## Development

### Add Dependencies
```bash
npx expo install [package-name]
```

### Debug
Check the Metro Bundler output in the terminal for compilation errors. Use `console.log` / `Alert.alert()` for debugging on device.

## Known Issues & TODO

- [ ] Shift history view per employee
- [ ] Export payroll reports (CSV/PDF)
- [ ] Custom app icon/logo (currently the default Expo template icon — only applies once built as a standalone APK)
- [ ] iOS testing (developed/tested primarily on Android)

## License

See LICENSE file

