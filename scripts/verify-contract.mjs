import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(
  process.env.BROUJ_BACKEND_ROOT ?? "F:/Mazen/Projects/Brouj",
);
const writing = process.argv.includes("--write");
const read = (path) =>
  readFileSync(join(backend, path), "utf8").replaceAll("\r\n", "\n");
const slash = (path) => path.replaceAll("\\", "/");
const sources = new Map();

function files(directory) {
  return readdirSync(join(backend, directory), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(`${directory}/${entry.name}`)
        : [`${directory}/${entry.name}`],
    );
}

function source(path) {
  const content = read(path);
  sources.set(path, createHash("sha256").update(content).digest("hex"));
  return content;
}

// The parser deliberately handles this backend's explicit controller attributes, not arbitrary C#.
// Unexpected source shapes fail coverage instead of silently creating incomplete contracts.
const controllerEndpoints = [];
for (const path of files("src/Brouj.API/Controllers").filter((file) =>
  file.endsWith(".cs"),
)) {
  const content = source(path);
  const prefix = content.match(/\[Route\("([^"]+)"\)\]/)?.[1];
  for (const block of content.matchAll(
    /\[Http(Get|Post|Patch|Put|Delete)(?:\("([^"]*)"\))?\]([\s\S]*?)(?=\n {4}\[Http|\n\})/g,
  )) {
    const [, verb, suffix = "", method] = block;
    const request = method.match(
      /\[EndpointContract\(typeof\((\w+)\)\)\]/,
    )?.[1];
    if (!request) continue; // CSRF is explicitly verified separately below.
    const response = method.match(
      /\[ProducesResponseType\(typeof\((.+)\), (\d+)\)\]/,
    );
    assert(prefix && response, `Unrecognized controller shape: ${path}`);
    controllerEndpoints.push({
      method: verb.toUpperCase(),
      route: `/${prefix}${suffix ? `/${suffix}` : ""}`,
      request,
      body: method.match(/\[From(?:Body|Form)\] (\w+) /)?.[1] ?? null,
      query: method.match(/\[FromQuery\] (\w+) /)?.[1] ?? null,
      response: response[1],
      policy:
        method.match(/\[Authorize\(Policy = PolicyNames\.(\w+)\)\]/)?.[1] ??
        "Anonymous",
      successStatus: Number(response[2]),
      rateLimit: method.match(
        /\[EnableRateLimiting\(RateLimitCategories\.(\w+)\)\]/,
      )?.[1],
      contentType: method.match(/\[Consumes\("([^"]+)"\)\]/)?.[1] ?? null,
      controller: path,
    });
  }
}

const inventory = JSON.parse(
  source("docs/Brouj.Docs/Part8.EndpointContracts.json"),
);
source("docs/Brouj.Docs/Part8.EndpointContracts.md");
source("docs/Brouj.Docs/Part8.ApiConfiguration.md");
source("docs/Brouj.Docs/Part12.FinalVerification.md");
assert.equal(
  inventory.length,
  101,
  "Reconcile a changed approved business-operation count before updating.",
);
assert.equal(
  controllerEndpoints.length,
  101,
  "Controller extraction must account for all 101 operations.",
);
assert.equal(
  new Set(controllerEndpoints.map((item) => `${item.method} ${item.route}`))
    .size,
  101,
);

const applicationFiles = files("src/Brouj.Application").filter((path) =>
  path.endsWith(".cs"),
);
const discrepancies = [];

/** These names allocate future frontend ownership; they do not implement services or contexts. */
function ownership(endpoint) {
  const { route, method, request } = endpoint;
  const family = endpoint.requestNamespace.split(".")[3];
  const admin = route.includes("/admin/");
  let service = family;
  let context = `${family}Context`;
  let phase;
  let screen;
  if (route.startsWith("/api/v1/auth/")) {
    service = route.includes("/customers/") ? "CustomerAuth" : "StaffAuth";
    context = "SessionContext";
    phase = "04";
    screen = `${service === "CustomerAuth" ? "Customer" : "Staff"} authentication and session lifecycle`;
  } else if (route.startsWith("/api/v1/customers/me")) {
    service = "CustomerProfile";
    context = "CustomerProfileContext";
    phase = "07";
    screen = "Customer account / profile and password";
  } else if (route.startsWith("/api/v1/users/me")) {
    service = "StaffProfile";
    context = "StaffProfileContext";
    phase = "11";
    screen = "Admin / staff profile and password";
  } else if (family === "Customers" || family === "Users") {
    service = family === "Users" ? "StaffAdmin" : "CustomersAdmin";
    context = `${service}Context`;
    phase = family === "Users" ? "11" : "09";
    screen = `Admin / ${family.toLowerCase()}`;
  } else if (route.endsWith("/time-plan") && method === "GET") {
    service = "TimePlans";
    context = "CustomerTimePlanContext / TimePlansContext";
    phase = "07, 10";
    screen = "Customer project schedule / Admin time plans";
  } else if (family === "TimePlans") {
    phase = "10";
    screen = "Admin / time plans, stages, items and images";
  } else if (family === "StageTemplates" || family === "ItemTemplates") {
    service = "Templates";
    context = "TemplatesContext";
    phase = "10";
    screen = `Admin / ${family === "StageTemplates" ? "stage" : "item"} templates`;
  } else if (family === "Orders" || family === "Reservations") {
    phase = admin ? "09" : "07";
    screen = `${admin ? "Admin" : "Customer account"} / ${family.toLowerCase()}`;
    if (family === "Orders" && endpoint.policy === "MemberOnly") {
      phase = "07, 09";
      screen = "Customer account / order detail; Admin / order detail";
      context = "CustomerOrdersContext / OrdersAdminContext";
    } else context = `${admin ? `${family}Admin` : `Customer${family}`}Context`;
  } else if (family === "Terms") {
    phase = admin ? "11" : "06";
    screen = admin
      ? "Admin / terms versions and activation"
      : "Website / current terms";
  } else if (family === "ActivityLogs") {
    phase = "11";
    screen = "Admin / staff activity log";
  } else {
    assert(
      ["Cities", "Areas", "Projects", "Units"].includes(family),
      `Unmapped family: ${family}`,
    );
    phase = admin ? "08" : "06";
    screen = admin
      ? `Admin / ${family.toLowerCase()} and media`
      : `Website / ${family.toLowerCase()}; shared Admin catalogue reads`;
    context = admin
      ? "CatalogueAdminContext"
      : "CatalogueContext / CatalogueAdminContext";
  }
  return {
    service: `Services/${service}`,
    context,
    screen,
    action: request.replace(/Command$|Query$/g, ""),
    uiPhase: phase,
    servicePhase: "03",
  };
}

const operations = inventory.map((documented) => {
  const endpoint = controllerEndpoints.find(
    (item) =>
      item.method === documented.method && item.route === documented.route,
  );
  assert(
    endpoint,
    `Missing live route: ${documented.method} ${documented.route}`,
  );
  for (const key of [
    "request",
    "body",
    "query",
    "response",
    "policy",
    "successStatus",
    "rateLimit",
  ]) {
    if (endpoint[key] !== documented[key])
      discrepancies.push({
        route: endpoint.route,
        method: endpoint.method,
        field: key,
        documented: documented[key],
        actual: endpoint[key],
      });
  }
  const requestFile = applicationFiles.find((path) =>
    path.endsWith(`/${endpoint.request}.cs`),
  );
  const handlerFile = applicationFiles.find((path) =>
    path.endsWith(`/${endpoint.request}Handler.cs`),
  );
  assert(
    requestFile && handlerFile,
    `Missing Application request/handler: ${endpoint.request}`,
  );
  source(requestFile);
  const handler = source(handlerFile);
  const validator = `${requestFile.slice(0, -3)}Validator.cs`;
  if (existsSync(join(backend, validator))) source(validator);
  const error = handler.match(/\.Failure\((\w+Errors\.\w+)/)?.[1];
  const failure =
    error ??
    (endpoint.policy !== "Anonymous"
      ? "401 unauthenticated / 403 actor policy"
      : "429 rate budget exhausted");
  const live = { ...documented, ...endpoint };
  return {
    ...live,
    ...ownership(live),
    representativeFailure: failure,
    handler: handlerFile,
  };
});

// Capture public shapes and validators only, excluding entities, secrets, and runtime configuration.
const schemaFiles = [
  ...files("src/Brouj.API/Requests"),
  ...applicationFiles.filter((path) => path.includes("/DTOs/")),
  "src/Brouj.Application/Common/Models/ApiResponse.cs",
  "src/Brouj.Application/Common/Models/ApiErrorResponse.cs",
  "src/Brouj.Application/Common/Models/PaginationResult.cs",
].filter((path) => path.endsWith(".cs"));
const schemas = [];
const validators = [];
for (const path of schemaFiles) {
  const content = source(path);
  if (path.endsWith("Validator.cs")) {
    validators.push({
      source: path,
      rules: content.slice(content.indexOf("public sealed class")).trim(),
    });
    continue;
  }
  const name = content.match(/public sealed class ([\w<>]+)/)?.[1];
  assert(name, `Unrecognized public schema: ${path}`);
  const properties = [
    ...content.matchAll(
      /public (required )?([A-Za-z0-9_<>,?[\] ]+?) (\w+) \{ get;[^}]*\}(?:\s*= ([^;]+);)?/g,
    ),
  ].map((match) => ({
    name: match[3][0].toLowerCase() + match[3].slice(1),
    csharpType: match[2],
    nullable: match[2].endsWith("?"),
    requiredMember: Boolean(match[1]),
    defaultExpression: match[4] ?? null,
  }));
  for (const computed of content.matchAll(
    /public (\w+) (\w+) => (true|false);/g,
  )) {
    properties.push({
      name: computed[2][0].toLowerCase() + computed[2].slice(1),
      csharpType: computed[1],
      nullable: false,
      requiredMember: false,
      defaultExpression: null,
      constant: computed[3] === "true",
    });
  }
  assert(properties.length > 0, `No properties extracted: ${path}`);
  schemas.push({ name, source: path, properties });
}

const enums = [
  ...files("src/Brouj.Domain/Enums"),
  "src/Brouj.Application/Common/Errors/FeatureErrorCode.cs",
].map((path) => {
  const content = source(path);
  const match = content.match(/public enum (\w+)\s*\{([^}]+)\}/);
  assert(match, `Unrecognized enum: ${path}`);
  let value = -1;
  const members = match[2]
    .replace(/\/\/[^\n]*/g, "")
    .split(",")
    .map((member) => member.trim())
    .filter(Boolean)
    .map((member) => {
      const [name, explicit] = member.split("=").map((part) => part.trim());
      value = explicit === undefined ? value + 1 : Number(explicit);
      assert(Number.isInteger(value), `Review enum expression in ${path}`);
      return { name, value };
    });
  return { name: match[1], wireType: "number", source: path, members };
});

for (const path of applicationFiles.filter(
  (path) => path.endsWith("Validator.cs") || path.includes("/Errors/"),
)) {
  const content = source(path);
  if (
    path.endsWith("Validator.cs") &&
    !validators.some((item) => item.source === path)
  ) {
    validators.push({
      source: path,
      rules: content.slice(content.indexOf("public sealed class")).trim(),
    });
  }
}
for (const path of [
  "src/Brouj.API/Extensions/ApiServiceExtensions.cs",
  "src/Brouj.API/Controllers/ApiControllerBase.cs",
  "src/Brouj.API/Authorization/AuthorizationExtensions.cs",
  "src/Brouj.API/Filters/UploadValidationFilter.cs",
  "src/Brouj.Application/Common/Utils/InputRules.cs",
  "src/Brouj.Application/Common/Utils/Pricing.cs",
  "src/Brouj.Application/Common/Settings/FileStorageOptions.cs",
  "src/Brouj.Infrastructure/Storage/FileStorageService.cs",
  "docs/Brouj.Docs/Part10.InitialAdmin.md",
])
  source(path);
const serializer = read("src/Brouj.API/Extensions/ApiServiceExtensions.cs");
assert(serializer.includes("JsonUnmappedMemberHandling.Disallow"));
const enumConverters = files("src")
  .filter((path) => path.endsWith(".cs") && !path.includes("/Migrations/"))
  .filter((path) =>
    /JsonStringEnumConverter|JsonConverter\s*\(/.test(read(path)),
  );
assert.deepEqual(
  enumConverters,
  [],
  "Review JSON converters before assuming numeric enums.",
);
const csrfController = read(
  "src/Brouj.API/Controllers/BrowserSecurityController.cs",
);
assert(
  csrfController.includes('[Route("api/v1/auth/csrf")]') &&
    csrfController.includes("[HttpGet]"),
);
const csrf = {
  method: "GET",
  route: "/api/v1/auth/csrf",
  body: null,
  query: null,
  response: "ApiResponse<CsrfTokenResponse>",
  policy: "Anonymous",
  successStatus: 200,
  service: "Services/Security",
  context: "Session coordination (in-memory token)",
  screen: "Supporting transport bootstrap; no product screen",
  action: "Bootstrap and renew identity-bound CSRF proof",
  uiPhase: "03",
  servicePhase: "03",
  representativeFailure: "429 Authentication rate budget exhausted",
  rateLimit: "Authentication",
};

const backendCommit = execFileSync(
  "git",
  ["-C", backend, "rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();
const matrix = {
  backendCommit,
  businessOperationCount: operations.length,
  operations,
  supportingTransport: [csrf],
  discrepancies,
};
const shapes = { schemas, enums, validators };
const manifest = Object.fromEntries(
  [...sources].sort(([a], [b]) => a.localeCompare(b, "en")),
);

const cell = (value) =>
  String(value ?? "—")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const rows = (items) =>
  items
    .map(
      (item) =>
        `| ${[
          `${item.method} ${item.route}`,
          `body: ${item.body ?? "none"}; query: ${item.query ?? "none"}`,
          item.response,
          item.service,
          item.context,
          `${item.screen} / ${item.action}`,
          item.policy,
          item.uiPhase,
          item.representativeFailure,
        ]
          .map(cell)
          .join(" | ")} |`,
    )
    .join("\n");
const markdown = `# API/UI contract matrix\n\nVerified against backend commit \`${backendCommit}\`.\n\n101 business operations; CSRF is separate. All feature services are implemented in Part 03; the phase column assigns primary UI work, including shared uses. Service/context names below are planned ownership, not implementations in Part 01. Full properties, nullable types, defaults and validators are in [backend-schemas.json](backend-schemas.json); exact controller, handler, status, rate and ownership evidence is in [api-ui-matrix.json](api-ui-matrix.json). See [wire-contracts.md](wire-contracts.md) for transport and integration constraints.\n\n| Operation | Request | Response envelope | Feature service | Context | Screen / action | Actor policy | UI phase | Representative failure |\n|---|---|---|---|---|---|---|---|---|\n${rows(operations)}\n\n## Supporting transport (not counted in the 101)\n\n| Operation | Request | Response envelope | Feature service | Context | Screen / action | Actor policy | UI phase | Representative failure |\n|---|---|---|---|---|---|---|---|---|\n${rows([csrf])}\n\nHealth and development Swagger are operational, not product screens. Representative application failures identify real handler error symbols; transport, validation, authorization and rate failures may occur before handlers. Exact validation and error sources are fingerprinted in [source-manifest.json](source-manifest.json).\n\n## Documentation discrepancies\n\n${discrepancies.length ? JSON.stringify(discrepancies, null, 2) : "None found between the 101 live controller contracts and the backend Part 8 JSON inventory."}\n`;

function output(path, value) {
  const target = join(frontend, "docs/contracts", path);
  const content =
    typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
  if (writing) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, "utf8");
  } else {
    assert.equal(
      readFileSync(target, "utf8").replaceAll("\r\n", "\n"),
      content,
      `Stale ${slash(relative(frontend, target))}. Review backend changes before npm run contracts:update.`,
    );
  }
}
output("api-ui-matrix.json", matrix);
output("backend-schemas.json", shapes);
output("source-manifest.json", manifest);
output("api-ui-matrix.md", markdown);
console.log(
  `${writing ? "Wrote" : "Verified"} 101 business operations, 1 CSRF endpoint, ${schemas.length} public schemas, ${enums.length} numeric enums; ${discrepancies.length} documented discrepancies.`,
);
