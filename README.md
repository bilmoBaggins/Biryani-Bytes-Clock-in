# Biryani Bytes Clock-In/Out System

A mobile app for Biryani Bytes employees to clock in/out and manage payroll.

## Tech Stack

- **Expo 57.0.18** — React Native framework
- **React 19.2.3 + React Native 0.85.3** — UI and mobile runtime
- **React Navigation 6.x** — Bottom tab navigation
- **TypeScript 6.0.3** — Type safety
- **expo-sqlite** — Local SQLite database
- **Expo Go** — Mobile testing environment

## Features

✅ **Clock In/Out** — Employees can clock in/out with autocomplete name search
✅ **Employee Management** — Admin panel to add/edit/delete employees
✅ **Payroll Dashboard** — View daily and monthly payroll summaries
✅ **Shift Tracking** — Records clock-in/out times and calculates hourly pay
✅ **Local Database** — SQLite with employees and shifts tables

## Project Structure

```
src/
  database/
    database.ts      — SQLite setup & core operations
    employees.ts     — Employee CRUD operations
    shifts.ts        — Clock in/out & shift calculations
  screens/
    ClockScreen.tsx  — Main clock in/out UI
    AdminScreen.tsx  — Payroll & employee management
  types/
    index.ts         — TypeScript interfaces
  utils/
    payroll.ts       — Payroll calculations
App.tsx              — Root component & navigation setup
index.ts             — Entry point
```

## Database Schema

### employees
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT UNIQUE NOT NULL)
- `hourly_rate` (REAL, default: £12.00)

### shifts
- `id` (INTEGER PRIMARY KEY)
- `employee_id` (INTEGER FOREIGN KEY)
- `employee_name` (TEXT)
- `date` (TEXT, YYYY-MM-DD)
- `clock_in_time` (TEXT, HH:mm)
- `clock_out_time` (TEXT, HH:mm, nullable)
- `hourly_pay` (REAL, nullable)

## Setup & Running

### Prerequisites
- Node.js 18+
- npm
- Expo Go app on phone (iOS/Android)

### Install & Run
```bash
npm install
npx expo start
```

Scan the QR code in Expo Go on your phone to load the app.

## Development

### Add Dependencies
```bash
npx expo install [package-name]
```

### Fix TypeScript Errors
The `tsconfig.json` extends `expo/tsconfig.base` and includes strict mode. Make sure all imports resolve to installed packages.

### Debug
Check the Metro Bundler output in the terminal for compilation errors. Use `Alert.alert()` for debugging on device.

## Current Status

✅ Project initialized with Expo 57
✅ React Navigation bottom tabs set up
✅ SQLite database configured with employees & shifts tables
✅ ClockScreen with employee autocomplete implemented
✅ AdminScreen with payroll dashboard framework in place
✅ All TypeScript errors resolved
✅ App running on Expo Go (exp://192.168.1.190:8082)

## Known Issues & TODO

- [ ] AdminScreen payroll calculations need verification
- [ ] Add shift history view
- [ ] Implement shift deletion/editing
- [ ] Add export payroll reports (CSV/PDF)
- [ ] Testing on iOS/Android devices
- [ ] Build production APK/IPA

## License

See LICENSE file
