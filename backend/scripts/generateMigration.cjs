const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const dir = path.join(__dirname, '../prisma/migrations/20260918_init_supabase');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const prismaBin = path.join(__dirname, '../node_modules/prisma/build/index.js');
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

const ddl = execSync(`node "${prismaBin}" migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`).toString();
const scopedDdl = `CREATE SCHEMA IF NOT EXISTS messmate;\nSET search_path TO messmate, public;\n\n` + ddl;

const targetFile = path.join(dir, 'migration.sql');
fs.writeFileSync(targetFile, scopedDdl, 'utf8');
console.log('✅ Generated migration.sql successfully, size:', scopedDdl.length);
