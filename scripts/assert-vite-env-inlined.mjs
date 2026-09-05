import fs from "node:fs";
import path from "node:path";

const url = process.env.VITE_SUPABASE_URL?.trim() || "https://wpkxbrdgktmwnowvmwue.supabase.co";

const dir = "dist/assets";
if (!fs.existsSync(dir)) {
  console.error("dist/assets is missing. Run npm run build first.");
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((name) => name.startsWith("index-") && name.endsWith(".js"));
if (files.length === 0) {
  console.error("No dist/assets/index-*.js files found.");
  process.exit(1);
}

let inlined = false;
for (const name of files) {
  const source = fs.readFileSync(path.join(dir, name), "utf8");
  if (source.includes(url)) {
    inlined = true;
  }
}

if (!inlined) {
  console.error(
    `Production bundle did not inline VITE_SUPABASE_URL (${url}). ` +
      "Vite only replaces static import.meta.env.VITE_* access; dynamic import.meta.env[name] blanks the live site.",
  );
  process.exit(1);
}

console.log("Production bundle inlined VITE_SUPABASE_URL.");
