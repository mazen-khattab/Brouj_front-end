import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, process.argv[2] ?? "dist");
const manifest = JSON.parse(readFileSync(resolve(output, ".vite/manifest.json"), "utf8"));
function staticImports(key, visited = new Set()) {
  if (visited.has(key)) return visited;
  assert(manifest[key], `Missing build entry: ${key}`);
  visited.add(key);
  for (const dependency of manifest[key].imports ?? []) staticImports(dependency, visited);
  return visited;
}
const startup = staticImports("index.html");
const browsing = new Set(startup);
for (const key of [
  "src/Layouts/PublicLayout.tsx",
  "src/Features/Home/HomePage.tsx",
  "src/Features/About/AboutPage.tsx",
  "src/Features/Planning/Public/TimePlanPage.tsx",
  "src/Features/Cities/Public/CityPage.tsx",
  "src/Features/Areas/Public/AreaPage.tsx",
  "src/Features/Projects/Public/ProjectPage.tsx",
  "src/Features/Units/Public/ProjectUnitsPage.tsx",
  "src/Features/Units/Public/UnitPage.tsx",
  "src/Features/Terms/Public/TermsPage.tsx",
]) {
  staticImports(key, browsing);
}
const publicFiles = new Set([...browsing].map((key) => manifest[key].file));
for (const key of [
  "src/Features/Orders/Customer/OrdersPage.tsx",
  "src/Features/Reservations/Customer/ReservationsPage.tsx",
  "src/Features/Profile/Customer/ProfilePage.tsx",
  "src/Features/Reservations/Customer/BookingScope.tsx",
  "src/Features/Reservations/Customer/BookingForm.tsx",
]) {
  assert(manifest[key]?.isDynamicEntry, `${key} must be lazy`);
  assert(!publicFiles.has(manifest[key].file), `${key} entered anonymous public imports`);
}
staticImports("src/Layouts/AccountLayout.tsx", browsing);
for (const key of [
  "src/Features/Profile/Customer/ProfilePage.tsx",
  "src/Features/Reservations/Customer/ReservationsPage.tsx",
  "src/Features/Orders/Customer/OrdersPage.tsx",
])
  staticImports(key, browsing);
const publicAndAccountFiles = new Set([...browsing].map((key) => manifest[key].file));
const adminKeys = [
  "src/Features/Staff/Admin/StaffPage.tsx",
  "src/Features/Profile/Staff/ProfilePage.tsx",
  "src/Features/Reservations/Admin/ReservationPage.tsx",
  "src/Features/Customers/Admin/CustomerPage.tsx",
  "src/Layouts/AdminLayout.tsx",
  "src/Features/Terms/Admin/TermsPage.tsx",
  "src/Features/ActivityLogs/Admin/ActivityLogsPage.tsx",
  "src/Features/Dashboard/DashboardPage.tsx",
  "src/Features/Cities/Admin/CityPage.tsx",
  "src/Features/Areas/Admin/AreaPage.tsx",
  "src/Features/Projects/Admin/ProjectPage.tsx",
  "src/Features/Units/Admin/UnitPage.tsx",
  "src/Features/Orders/Admin/OrderPage.tsx",
  "src/Features/Planning/PlanningPage.tsx",
];
for (const key of adminKeys) {
  assert(manifest[key]?.isDynamicEntry, `${key} must be lazy`);
  assert(!publicAndAccountFiles.has(manifest[key].file), `${key} entered the public/startup imports`);
}
for (const key of browsing)
  assert(!manifest[key].name?.match(/^(AdminLayout|AdminPlaceholder|DashboardPage|navigation)$/), "Admin code entered public static imports");
for (const file of readdirSync(resolve(output, "assets")).filter((file) => file.endsWith(".js"))) {
  const source = readFileSync(resolve(output, "assets", file), "utf8");
  assert(!/__showcase|__auth|ComponentShowcase|AuthPreview/.test(source), `Development fixture in ${file}`);
  assert(!/createFakeRealtimeAdapter|captureEvents|captureStatuses/.test(source), `Fake realtime adapter in ${file}`);
}
console.log(
  "PASS: admin layout/pages are separate lazy chunks, absent from startup/public/account static imports; development fixtures are excluded.",
);
for (const key of adminKeys) console.log(`${key}: ${manifest[key].file}`);
