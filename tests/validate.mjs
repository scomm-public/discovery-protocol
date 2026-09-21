#!/usr/bin/env node
/**
 * Validate Discovery Protocol JSON Schemas and example documents.
 * Uses local schema files; does not fetch https://discovery.scomm.ai/.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaDir = join(root, "schema", "v1");
const examplesDir = join(root, "examples", "v1");
const invalidDir = join(root, "tests", "invalid");

/** Core Discovery Document examples (flat under examples/v1). */
const DOCUMENT_EXAMPLE_FILES = [
  "minimal.json",
  "crypto.json",
  "preferences.json",
  "form.json",
  "extensions.json",
];

/** Invalid fixtures validated against the Discovery Document schema. */
const DOCUMENT_INVALID_FILES = [
  "malformed-mailbox.json",
  "schema-version-type.json",
  "extensions-not-object.json",
];

/** API examples: relative path under examples/v1 → schema $id to validate against. */
const API_EXAMPLE_VALIDATIONS = [
  {
    file: "api/mailbox-discovery.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/discovery.schema.json",
  },
  {
    file: "api/resource-encryption-key.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/api/resource.schema.json",
  },
  {
    file: "api/resource-unknown-future-type.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/api/resource.schema.json",
  },
  {
    file: "api/operation-msk-replace.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/api/operation.schema.json",
  },
  {
    file: "api/challenge-create-email-otp.json",
    schemaId:
      "https://discovery.scomm.ai/schema/v1/challenges/email-otp.schema.json",
  },
  {
    file: "api/challenge-pending.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/api/challenge.schema.json",
  },
  {
    file: "api/error-challenge-expired.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/api/error.schema.json",
  },
];

const API_INVALID_VALIDATIONS = [
  {
    file: "api-error-missing-message.json",
    schemaId: "https://discovery.scomm.ai/schema/v1/api/error.schema.json",
  },
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

function listJsonFilesRecursive(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...listJsonFilesRecursive(path, base));
    } else if (name.endsWith(".json")) {
      out.push(relative(base, path).replaceAll("\\", "/"));
    }
  }
  return out;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateSchema: true,
});
addFormats(ajv);

const schemaFiles = listJsonFilesRecursive(schemaDir);
for (const rel of schemaFiles) {
  const path = join(schemaDir, rel);
  const schema = readJson(path);
  if (!schema) {
    continue;
  }
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    fail(`${rel}: expected JSON Schema draft 2020-12 $schema`);
  }
  try {
    ajv.addSchema(schema);
    ok(`schema loaded ${rel} ($id ${schema.$id})`);
  } catch (error) {
    fail(`${rel}: addSchema: ${error.message}`);
  }
}

ok(`loaded ${schemaFiles.length} schema file(s)`);

function validateAgainst(schemaId, document, label) {
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    fail(`${label}: schema not compiled ${schemaId}`);
    return;
  }
  const valid = validate(document);
  if (valid) {
    ok(`accepted ${label}`);
  } else {
    fail(`rejected ${label}: ${ajv.errorsText(validate.errors)}`);
  }
}

function rejectAgainst(schemaId, document, label) {
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    fail(`${label}: schema not compiled ${schemaId}`);
    return;
  }
  const valid = validate(document);
  if (!valid) {
    ok(`invalid fixture rejected ${label}`);
  } else {
    fail(`invalid fixture was accepted ${label}`);
  }
}

for (const name of DOCUMENT_EXAMPLE_FILES) {
  const document = readJson(join(examplesDir, name));
  if (document === undefined) continue;
  validateAgainst(
    "https://discovery.scomm.ai/schema/v1/discovery.schema.json",
    document,
    `document example ${name}`,
  );
}

for (const name of DOCUMENT_INVALID_FILES) {
  const document = readJson(join(invalidDir, name));
  if (document === undefined) continue;
  rejectAgainst(
    "https://discovery.scomm.ai/schema/v1/discovery.schema.json",
    document,
    name,
  );
}

for (const { file, schemaId } of API_EXAMPLE_VALIDATIONS) {
  const document = readJson(join(examplesDir, file));
  if (document === undefined) continue;
  validateAgainst(schemaId, document, `api example ${file}`);
}

// resource-create-preferences is a create body (no id) — validate value shape loosely
{
  const path = join(examplesDir, "api/resource-create-preferences.json");
  const document = readJson(path);
  if (document && typeof document.type === "string" && document.value) {
    ok("api example api/resource-create-preferences.json has type+value");
  } else if (document !== undefined) {
    fail("api/resource-create-preferences.json missing type/value");
  }
}

// challenge response is not a full challenge envelope
{
  const path = join(examplesDir, "api/challenge-response-email-otp.json");
  const document = readJson(path);
  if (
    document &&
    document.response &&
    typeof document.response.code === "string" &&
    document.response.code.length === 11
  ) {
    ok("api example challenge-response uses 11-char Base62-shaped code");
  } else if (document !== undefined) {
    fail("challenge-response-email-otp.json expected 11-char code");
  }
}

// signing vectors structural check
{
  const path = join(examplesDir, "api/signing-vectors.json");
  const document = readJson(path);
  if (
    document &&
    document.insecure_test_material === true &&
    Array.isArray(document.vectors) &&
    document.vectors[0]?.canonical_utf8?.startsWith("SComm/Pubkey/")
  ) {
    ok("signing-vectors.json structure");
  } else if (document !== undefined) {
    fail("signing-vectors.json structure invalid");
  }
}

for (const { file, schemaId } of API_INVALID_VALIDATIONS) {
  const document = readJson(join(invalidDir, file));
  if (document === undefined) continue;
  rejectAgainst(schemaId, document, file);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}

console.log("\nAll validation checks passed");
