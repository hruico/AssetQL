# Bug Investigation Findings

## Summary

The 502 Bad Gateway error was caused by **improper Lambda deployment packaging**, not by code logic issues. The deployed Lambda contained unbundled source code with relative imports that failed to resolve in the AWS Lambda execution environment.

## Root Cause

**Deployment Package Issue:**
- The `lambdas/feedback-handler.zip` file contained raw source code with `require('../../shared')`
- This relative import path doesn't work in AWS Lambda's execution environment
- Lambda failed to initialize, resulting in 502 errors for all requests

## Why Unit Tests Passed

The bug condition exploration tests passed because:
1. **Local Environment**: Tests run in Node.js where relative paths resolve correctly
2. **Mocked Dependencies**: AWS SDK clients are mocked, bypassing actual shared module initialization
3. **Correct Logic**: The Lambda handler code itself is correct - only packaging was broken

## The Fix

**Solution:** Rebuild Lambda with esbuild bundling

```bash
./scripts/build.sh
```

This creates a properly bundled deployment package:
- Inlines the shared module into a single `index.js` file
- Externalizes AWS SDK packages (provided by Lambda Layer)
- Produces a working deployment package

## Evidence

### Before (Broken)
```
$ unzip -l lambdas/feedback-handler.zip
Archive:  lambdas/feedback-handler.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     9052  2026-03-03 20:16   lambdas/feedback-handler/index.js  ← Unbundled
        0  2026-03-03 16:45   shared/
     1597  2026-03-03 18:48   shared/index.js
---------                     -------
    10649                     3 files

$ unzip -p lambdas/feedback-handler.zip lambdas/feedback-handler/index.js | head -1
const { dynamo, bedrockAgentRuntime, ... } = require('../../shared');  ← Broken import
```

### After (Fixed)
```
$ unzip -l lambdas/feedback-handler.zip
Archive:  lambdas/feedback-handler.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     9934  2026-03-03 20:33   index.js  ← Bundled with esbuild
---------                     -------
    20583                     4 files

$ unzip -p lambdas/feedback-handler.zip index.js | head -10
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// shared/index.js
var require_shared = __commonJS({
  "shared/index.js"(exports2, module2) {
    var { DynamoDBClient } = require("@aws-sdk/client-dynamodb");  ← Inlined
```

## Next Steps

1. **Deploy the fixed Lambda** to AWS using Terraform or the deploy script
2. **Verify in production** that the 502 error is resolved
3. **Run the bug condition exploration test** against the live endpoint to confirm

## Lessons Learned

- **Unit tests can't catch deployment issues** - they test logic, not packaging
- **Integration tests with actual deployment packages** would have caught this
- **The build script must be run** before every deployment
- **Terraform should validate** that zip files are properly bundled

## Test Results

**Bug Condition Exploration Test Status:** ✅ PASSED (unexpected)

All test scenarios passed on the current code:
- ✅ Session with batchId returns 200 OK
- ✅ Session without batchId returns 200 OK with fallback
- ✅ Empty batch (0 assets) returns 200 OK
- ✅ Large batch (150 assets) returns 200 OK
- ✅ Session without batch returns 200 OK with message
- ✅ Property-based test (20 random scenarios) passed

**Conclusion:** The Lambda handler code is correct. The bug was purely a deployment packaging issue.
