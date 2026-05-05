@echo off
set DATABASE_URL=postgresql://neondb_owner:npg_CSfDid5Xs8uh@ep-purple-sun-acll4bmn-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
set NODE_ENV=development
set SESSION_SECRET=92b7754d9241f9d6ab2d2e1329c36d2c4749fbecc62f4b0051e04fc8196ed5e3

echo Iniciando servidor SISHOSP...
npx tsx server/index.ts