import { db } from "../src/lib/db";
import { reconcileExpired } from "../src/lib/reconcile";
import { safeError } from "../src/lib/monitor";
reconcileExpired()
  .then((result) => {
    console.log(JSON.stringify(result));
    if (result.failed) process.exitCode = 1;
  })
  .catch((e) => {
    console.error(JSON.stringify(safeError(e)));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
