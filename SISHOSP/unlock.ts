import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`DELETE FROM security_lockouts;`);
  await db.execute(sql`DELETE FROM login_attempts;`);
  console.log('unlocked');
  process.exit(0);
}
run();
