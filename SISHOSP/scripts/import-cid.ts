import { db } from "../server/db";
import { cidCodes } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";
import iconv from "iconv-lite";

async function importCidCodes() {
  console.log("Starting CID-10 import...");
  
  const subcategoriasPath = path.join(process.cwd(), "attached_assets/CID-10-SUBCATEGORIAS_1764179572993.CSV");
  
  if (!fs.existsSync(subcategoriasPath)) {
    console.error("File not found:", subcategoriasPath);
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(subcategoriasPath);
  const content = iconv.decode(fileBuffer, "latin1");
  
  const lines = content.split("\n").filter(line => line.trim());
  console.log(`Found ${lines.length} lines (including header)`);
  
  const records: { code: string; description: string; shortDescription: string | null }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(";");
    
    if (parts.length >= 5) {
      let code = parts[0].trim();
      if (code.length === 4 && !code.includes(".")) {
        code = code.slice(0, 3) + "." + code.slice(3);
      }
      
      const description = parts[4].trim();
      const shortDescription = parts[5]?.trim() || null;
      
      if (code && description) {
        records.push({ code, description, shortDescription });
      }
    }
  }
  
  console.log(`Parsed ${records.length} valid CID codes`);
  
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await db.insert(cidCodes).values(batch).onConflictDoNothing();
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${records.length}`);
    } catch (error) {
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error);
      errors += batch.length;
    }
  }
  
  console.log(`\nImport completed!`);
  console.log(`Total inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  
  process.exit(0);
}

importCidCodes().catch(console.error);
