import fs from 'node:fs'

const required=[
  'src/app/login/page.js',
  'src/app/hub/page.js',
  'src/components/HubClient.js',
  'src/data/resources.json',
  'supabase/schema.sql',
  'supabase/seed_resources.sql',
  'supabase/functions/reminders/index.ts',
  'supabase/cron.sql',
  'manual/FIRST_ADMIN.sql'
]
let failed=false
for(const f of required){if(!fs.existsSync(f)){console.error('Missing:',f);failed=true}}
const resources=JSON.parse(fs.readFileSync('src/data/resources.json','utf8'))
if(resources.length!==109){console.error(`Expected 109 resources, found ${resources.length}`);failed=true}
const invalid=resources.filter(r=>!r.name||!r.programme||!r.url||!/^https?:\/\//.test(r.url))
if(invalid.length){console.error('Invalid resource rows:',invalid.length);failed=true}
if(failed)process.exit(1)
console.log(`VMG Teacher 360 package OK · ${resources.length} linked resources · required backend files present.`)
