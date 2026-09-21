#!/usr/bin/env node
/**
 * Validate Discovery Protocol JSON Schemas and example documents.
 * Uses local schema files; does not fetch https://discovery.scomm.ai/.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaDir = join(root, "schema", "v1");
const examplesDir = join(root, "examples", "v1");
const invalidDir = join(root, "tests", "invalid");

const SCHEMA_FILES = [
  "discovery.schema.json",
  "crypto.schema.json",
  "forms.schema.json",
  "preferences.schema.json",
];

const EXAMPLE_FILES = [
  "minimal.json",
  "crypto.json",
  "preferences.json",
  "form.json",
  "extensions.json",
];

const INVALID_FILES = [
  "malformed-mailbox.json",
  "schema-version-type.json",
  "extensions-not-object.json",
];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL  ${message}`);
}

function ok(message) {
  console.log(`ok    ${message}`);
}

function readJson(path) {
  const text = readFileSync(path, "utf8");
  if (!text.endsWith("\n")) {
    fail(`${path}: missing final newline`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${path}: JSON parse error: ${error.message}`);
    return undefined;
  }
}

function listJsonFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateSchema: true,
});
addFormats(ajv);

for (const name of SCHEMA_FILES) {
  const path = join(schemaDir, name);
  const schema = readJson(path);
  if (!schema) {
    continue;
  }
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    fail(`${name}: expected JSON Schema draft 2020-12 $schema`);
  }
  try {
    ajv.addSchema(schema);
    ok(`schema loaded ${name} ($id ${schema.$id})`);
  } catch (error) {
    fail(`${name}: addSchema: ${error.message}`);
  }
}

const onDiskSchemas = listJsonFiles(schemaDir);
if (onDiskSchemas.join() !== SCHEMA_FILES.slice().sort().join()) {
  fail(
    `schema/v1 contains unexpected files: disk=[${onDiskSchemas}] expected=[${SCHEMA_FILES}]`,
  );
} else {
  ok("schema/v1 file set matches validator allowlist");
}

let validateDocument;
try {
  validateDocument = ajv.getSchema(
    "https://discovery.scomm.ai/schema/v1/discovery.schema.json",
  );
  if (!validateDocument) {
    fail("compiled discovery schema is missing");
  } else {
    ok("compiled core discovery schema");
  }
} catch (error) {
  fail(`compile discovery schema: ${error.message}`);
}

const onDiskExamples = listJsonFiles(examplesDir);
if (onDiskExamples.join() !== EXAMPLE_FILES.slice().sort().join()) {
  fail(
    `examples/v1 contains unexpected files: disk=[${onDiskExamples}] expected=[${EXAMPLE_FILES}]`,
  );
} else {
  ok("examples/v1 file set matches validator allowlist");
}

if (validateDocument) {
  for (const name of EXAMPLE_FILES) {
    const path = join(examplesDir, name);
    const document = readJson(path);
    if (document === undefined) {
      continue;
    }
    const valid = validateDocument(document);
    if (valid) {
      ok(`example accepted ${name}`);
    } else {
      fail(
        `example rejected ${name}: ${ajv.errorsText(validateDocument.errors)}`,
      );
    }
  }
}

const onDiskInvalid = listJsonFiles(invalidDir);
if (onDiskInvalid.join() !== INVALID_FILES.slice().sort().join()) {
  fail(
    `tests/invalid contains unexpected files: disk=[${onDiskInvalid}] expected=[${INVALID_FILES}]`,
  );
} else {
  ok("tests/invalid file set matches validator allowlist");
}

if (validateDocument) {
  for (const name of INVALID_FILES) {
    const path = join(invalidDir, name);
    const document = readJson(path);
    if (document === undefined) {
      continue;
    }
    const valid = validateDocument(document);
    if (!valid) {
      ok(`invalid fixture rejected ${name}`);
    } else {
      fail(`invalid fixture was accepted ${name}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}

console.log("\nAll validation checks passed");
