const { execSync } = require("child_process");

const { readdirSync } = require("fs");

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

const ignore = ["_shared"];

getDirectories("./supabase/functions").forEach((fn) => {
  if (!ignore.includes(fn)) {
    execSync(`supabase functions deploy ${fn}`, { stdio: "inherit" });
  }
});
