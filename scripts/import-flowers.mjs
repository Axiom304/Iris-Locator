import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadDotEnv(name) {
  const path = join(root, name)
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

loadDotEnv('.env.local')

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const key = serviceKey ?? anonKey

const csvPath = process.argv[2] ?? join(root, 'supabase', 'seeds', 'flowers.csv')

function clean(v) {
  if (v === undefined || v === null) return null
  const t = String(v).trim()
  if (t === '' || t === '#N/A' || t === 'N/A') return null
  return t
}

function toRow(r) {
  const id = Number(r.Id ?? r.id)
  if (!Number.isFinite(id)) {
    throw new Error(`Invalid id in row: ${JSON.stringify(r)}`)
  }
  const sku = clean(r.Sku ?? r.sku)
  const title = clean(r.Title ?? r.title)
  const locations = clean(r.Locations ?? r.locations)
  return {
    id,
    sku: sku ?? '',
    title: title ?? '',
    locations: locations ?? '',
    hybridizer: clean(r.Hybridizer ?? r.hybridizer),
    released: clean(r.Released ?? r.released),
    colors: clean(r.Colors ?? r.colors),
  }
}

async function main() {
  if (!url || !key) {
    console.error(
      'Missing VITE_SUPABASE_URL or keys. Set VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local (service role is required for bulk upsert past RLS).',
    )
    process.exit(1)
  }

  if (!serviceKey) {
    console.warn(
      'Warning: SUPABASE_SERVICE_ROLE_KEY not set. Inserts usually fail under RLS with the anon key only.',
    )
  }

  const csv = readFileSync(csvPath, 'utf8')
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  })

  const rows = records.map(toRow)
  const supabase = createClient(url, key)
  const batchSize = 400

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from('flowers').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(error)
      process.exit(1)
    }
    console.error(`Upserted ${Math.min(i + batchSize, rows.length)} / ${rows.length}`)
  }

  console.error(`Done. ${rows.length} rows from ${csvPath}`)
}

main()
