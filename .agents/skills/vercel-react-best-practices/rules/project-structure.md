# ResQ SOS - Project Structure & Code Rules

## 1. Data Management (Mock Data & Constants)

- **Target File**: `lib/constants.tsx`
- **Rule**:
  - **MANDATORY**: All static sample data, mock lists (e.g., fake users, locations), and fixed configuration values MUST be placed in `lib/constants.tsx`.
  - **Prohibition**: Do NOT hardcode arrays or large objects inside UI components (`.tsx`) or page files.
  - **Refactoring**: If you encounter hardcoded data in components, extract it to `lib/constants.tsx` and import it back.

## 2. Type Definitions (Shared Types)

- **Target File**: `./type.d.ts` (Root Directory)
- **Rule**:
  - **MANDATORY**: All shared interfaces, data types, enums, and API response models MUST be defined in the root `type.d.ts` file.
  - **Scope**: Only keep types inside a component file if they are strictly local (e.g., specific Props for a small sub-component that is never reused).
  - **Format**: Ensure types are clearly named and documented if complex.
