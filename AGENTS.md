# Agent Instructions

## Dev Commands
- `npm start` — start Expo dev server (defaults to platform picker)
- **`npx expo run:android`** — run Android app with native module linking (run from project root, NOT from android/ directory)
- `npm run build` — export Android bundle to `dist/`
- `npm test` — jest with `--watchAll` (jest-expo preset)

## Local Expo Modules (Auto-linking)
Local Expo modules in `modules/` directory require special handling for Android native linking.

### For local Expo modules with native Android code:
The module's `expo-module.config.json` must use fully qualified class name for Android:
```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.smspermission.SmsPermissionModule"]
  }
}
```

### Running with local native modules:
- Use `npx expo run:android` (from project root, not android/ subdirectory)
- Do NOT use `npm start` - it doesn't properly handle local `file:` dependencies for native modules
- The expo run command generates `ExpoModulesPackageList.java` with correct class references

## Architecture
- Entry: `expo-router/entry` (file-based routing via `app/` directory)
- Path alias `@/*` maps to project root (./)
- Routes: `app/` directory (expo-router), UI components: `components/ui/`
- Styling: nativewind (Tailwind) with CSS variables; `tailwind.config.js` is aliased
- **Android-only build** - `react-native-web`, `react-dom`, web-related packages and plugins removed

## Toolchain Quirks
- **babel.config.js**: includes `nativewind/babel` preset + `react-native-worklets/plugin` (required for reanimated)
- **metro.config.js**: uses `withNativeWind` from nativewind/metro
- **tailwind.config.js**: content paths include `app/**/*` and `components/**/*`
- Use `DARK_MODE` env var to control dark mode (values: `class` or Tailwind dark mode strategy)
- No ESLint/Prettier config files present

## Testing
- Jest preset: `jest-expo`
- No test files found in repo; `npm test` runs in watch mode

## Key Dependencies
- Expo SDK 54, React Native 0.81.5, React 19.1.0
- expo-router, react-native-reanimated ~4.1.0, react-native-worklets 0.5.1
- @gluestack-ui/* for UI components
- expo-sqlite for local database
- @chelav/parser-core for bank SMS parsing
- @chelav/sms-permission for SMS access

## Database (expo-sqlite)
- Location: `lib/database.ts`
- Table: `transactions` with columns for amount, merchantName, category, transactionType, dateTime, etc.
- Use `getCurrentMonthTransactions()` to fetch this month's parsed transactions
- Use `insertTransaction()` to save new parsed transactions

## SMS Parsing
- Location: `lib/smsService.ts`
- Uses `BankParserFactory` from `@chelav/parser-core` to parse SMS messages
- `fetchAndParseMessages()` - parses SMS array and saves to database
- `filterCurrentMonthMessages()` - filters messages to current month only
- Supported banks: HDFCBank (sender IDs: HDFCBK, HDFCBANK, HDFC, HDFCB)
- Transaction types: INCOME, EXPENSE, CREDIT, TRANSFER, INVESTMENT, BALANCE_UPDATE

## Settings Screen (tab2.tsx)
- "Fetch This Month's Messages" button triggers SMS parsing
- Requires SMS permission to be granted
- Shows sync results: total messages, parsed, saved, errors