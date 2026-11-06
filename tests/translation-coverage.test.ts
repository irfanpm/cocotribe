import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translations } from "../src/lib/translations";
import { errorMessages } from "../src/components/ui";
import { statuses } from "../src/components/booking";
// Every customer-facing component. Admin stays in English by design.
const files = ["booking", "home", "pages", "reference-home", "reference-shell", "ui", "variant-card"];
/** Reads a double- or single-quoted JS string, resolving simple escapes. */
const stringAt = String.raw`"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'`;
const pattern = new RegExp(String.raw`\bt\(\s*(?:${stringAt})\s*,`, "g");
function customerStrings() {
  const found = new Set<string>();
  for (const file of files) {
    const source = readFileSync(`src/components/${file}.tsx`, "utf8");
    for (const match of source.matchAll(pattern)) {
      const raw = match[1] ?? match[2];
      found.add(raw.replace(/\\(.)/g, "$1"));
    }
  }
  return [...found];
}
test("every customer-facing string has Tamil and Hindi translations", () => {
  const strings = [
    // A Malayalam first argument is an unused decorative line that is the same in every language.
    ...customerStrings().filter((en) => !/[ഀ-ൿ]/.test(en)),
    ...Object.values(errorMessages).map(([en]) => en),
    ...Object.values(statuses).map(([en]) => en),
  ];
  assert.ok(strings.length > 100, "the extractor should find the site's strings");
  const missing = strings.filter((en) => !translations[en]?.ta || !translations[en]?.hi);
  assert.deepEqual(missing, []);
});
