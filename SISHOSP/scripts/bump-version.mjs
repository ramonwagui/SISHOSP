import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDeployCount() {
  try {
    const count = execSync('git log --oneline --grep="Published your App" 2>/dev/null | wc -l')
      .toString()
      .trim();
    return parseInt(count, 10) + 1;
  } catch {
    return 1;
  }
}

function getMonthYear() {
  const now = new Date();
  return now.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

const deployCount = getDeployCount();
const version = `v1.${deployCount}`;
const date = getMonthYear();

const content = `export const APP_VERSION = "${version}";
export const APP_VERSION_DATE = "${date}";
export const APP_DEPLOY_COUNT = ${deployCount};
`;

const outputPath = resolve(__dirname, "../client/src/lib/version.ts");
writeFileSync(outputPath, content, "utf-8");

console.log(`✅ Versão atualizada: ${version} (${date}) — deploy #${deployCount}`);
