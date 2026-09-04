# Biryani Bytes Clock-In/Out System

A tablet/mobile app for Biryani Bytes employees to clock in/out with a PIN, and for admins to manage employees, PINs, and payroll.

## Tech Stack

- **Expo 57** — React Native framework
- **React 19.2 + React Native 0.86** — UI and mobile runtime
- **React Navigation 6.x** — Bottom tab navigation
- **TypeScript 6.0** — Type safety
- **expo-sqlite** — Local, offline SQLite database
- **expo-haptics** — Vibration feedback on PIN entry
- **Expo Go** — Mobile testing environment (see "Deploying to a Tablet" for standalone installs)

## Features

- **Tile-based Clock In/Out** — Employees tap their name tile (colored green when clocked in, white when clocked out) and enter their 4-digit code to toggle status. Wrong codes shake and vibrate; correct codes auto-submit with no extra buttons.
- **PIN-protected Payroll tab** — The Payroll/Admin tab is locked behind a 4-digit admin PIN, entered the same way (auto-submit, shake on error).
- **Employee Management** — Add employees (auto-generates a unique 4-digit code), edit hourly rate and PIN code, or delete employees.
- **Compact Employee Actions** — Edit, view history, and delete actions use accessible icons to keep employee rows uncluttered.
- **Editable PINs** — Both employee codes and the admin PIN are stored in the database and changeable at any time from the Payroll tab — no rebuild required.
- **Payroll Dashboard** — Completed shifts (today) and monthly payroll totals per employee, plus an overall summary.
- **Pull-to-refresh** — Swipe down on either tab to reload data instead of a manual refresh button.
- **Tap-outside-to-close pop-ups** — All modals (PIN entry, add/edit employee, change admin PIN) close when tapping outside the card.
- **Local Database** — SQLite with employees, shifts, and settings tables; clocking works offline.
- **Cloud Backup** — Optional one-tablet Supabase backup; local clocking continues when offline and uploads retry on the next app start or refresh.

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
  cloud/
    supabase.ts          — Optional Supabase client configuration
    sync.ts              — Offline-first cloud backup
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
- Node.js 22.13+
- npm
- Expo Go app on phone/tablet (iOS/Android)
- Laptop and phone/tablet connected to the **same Wi-Fi network**
- Windows Firewall allowing inbound connections on port 8081 (see below)

### Install & Run
```bash
npm install
npx expo start --port 8081 --lan
```

Scan the QR code in Expo Go on your device to load the app. The default admin PIN is `1234` — change it from Payroll → Security → Change Admin PIN.

### Windows Firewall (one-time setup)
Windows Firewall blocks inbound connections on the Metro bundler's port by default, which stops the phone/tablet from downloading the app bundle even when on the same Wi-Fi. Run this once in an **administrator** PowerShell terminal:
```powershell
New-NetFirewallRule -DisplayName "Expo 8081" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081
```

## Deploying to a Tablet (Standalone, No Dev Server)

Expo Go requires a computer running `npx expo start` on the same Wi-Fi network, which isn't practical for a permanently installed kiosk tablet. For a standalone install:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

This builds an installable `.apk` in the cloud (no local Android SDK needed). Transfer it to the tablet and install it directly — no dev server or same-network requirement. Clocking remains functional offline; optional cloud backup syncs when internet is available.

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

### Optional Cloud Backup

Cloud backup uses one anonymous, device-specific Supabase account. The tablet does not need employee cloud accounts. To enable it:

1. In Supabase, enable **Authentication → Providers → Anonymous Sign-Ins**.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env` and add the project URL and publishable key.
4. Restart Expo after changing `.env`.

The app remains usable without Supabase or internet access. Cloud backup is uploaded in the background after local changes and retried at startup.

## Known Issues & TODO

- [x] Shift history view per employee
- [x] Export payroll reports (CSV)
- [ ] Custom app icon/logo (currently the default Expo template icon — only applies once built as a standalone APK)
- [ ] iOS testing (developed/tested primarily on Android)
- [x] Optional one-tablet database backup/cloud sync

## License

See LICENSE file

