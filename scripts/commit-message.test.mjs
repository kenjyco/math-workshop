import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMessage } from "./commit-message.mjs";
test("accepts wrapped message, rejects long prose and missing separator, warns on subject", () => {
  assert.deepEqual(
    checkMessage(
      "Build the local math workshop\n\nKeep learner data separate from the executable.\n",
    ),
    { errors: [], warnings: [] },
  );
  assert.ok(
    checkMessage("Build workshop\nBody without separator").errors.length,
  );
  assert.ok(
    checkMessage("Build workshop\n\n" + "Long ordinary prose ".repeat(8)).errors
      .length,
  );
  assert.equal(checkMessage("Build " + "long ".repeat(12)).warnings.length, 1);
});
