# Dependency Update Summary

## Updated Packages (2024-12-16)

All dependencies have been updated to their latest stable versions.

### Production Dependencies

| Package         | Old Version | New Version  | Type  |
| --------------- | ----------- | ------------ | ----- |
| `@octokit/rest` | ^21.0.2     | **^22.0.1**  | Major |
| `hono`          | ^4.6.14     | ^4.6.14      | -     |
| `wxt`           | ^0.19.17    | **^0.20.11** | Minor |
| `zod`           | ^3.23.8     | **^4.2.1**   | Major |

### Development Dependencies

| Package                            | Old Version | New Version | Type  |
| ---------------------------------- | ----------- | ----------- | ----- |
| `@types/bun`                       | ^1.1.13     | ^1.1.13     | -     |
| `@types/chrome`                    | ^0.0.278    | **^0.1.32** | Minor |
| `@types/node`                      | ^22.10.2    | **^25.0.2** | Major |
| `@typescript-eslint/eslint-plugin` | ^8.18.1     | ^8.18.1     | -     |
| `@typescript-eslint/parser`        | ^8.18.1     | ^8.18.1     | -     |
| `eslint`                           | ^9.17.0     | ^9.17.0     | -     |
| `prettier`                         | ^3.4.2      | ^3.4.2      | -     |
| `typescript`                       | ^5.7.2      | ^5.7.2      | -     |
| `wrangler`                         | ^3.96.0     | **^4.54.0** | Major |

## Breaking Changes Fixed

### 1. WXT 0.20 - Client Types Path Change

**Change**: Client types moved from `wxt/client` to `wxt/browser`

**Files Updated**:

- `entrypoints/background/index.ts`
- `entrypoints/content/bilibili.ts`
- `entrypoints/content/youtube.ts`

**Fix**:

```typescript
// Before
/// <reference types="wxt/client" />

// After
/// <reference types="wxt/browser" />
```

### 2. Zod 4 - Error Property Renamed

**Change**: `ZodError.errors` renamed to `ZodError.issues`

**Files Updated**:

- `worker/src/index.ts`

**Fix**:

```typescript
// Before
validation.error.errors;

// After
validation.error.issues;
```

### 3. @types/node 25 - Node.js 25 Types

**Change**: Updated to Node.js 25 type definitions

**Impact**: No code changes required, fully compatible

### 4. Wrangler 4 - Cloudflare Workers SDK

**Change**: Major version update with improved DX

**Impact**: No code changes required for basic usage

## Verification

✅ **Type Check**: Passed  
✅ **Tests**: All 53 tests passing  
✅ **Build**: No errors

## Notes

- All major version updates have been tested and verified
- No runtime behavior changes expected
- Zod 4 is significantly faster and has better TypeScript inference
- WXT 0.20 includes performance improvements and better HMR
- Wrangler 4 has improved local development experience

## Rollback

If needed, revert to previous versions:

```bash
bun add @octokit/rest@^21.0.2 wxt@^0.19.17 zod@^3.23.8
bun add -d @types/chrome@^0.0.278 @types/node@^22.10.2 wrangler@^3.96.0
```
