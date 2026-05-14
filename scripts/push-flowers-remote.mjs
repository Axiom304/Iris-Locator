/**
 * Upserts flowers from supabase/seeds/flowers.csv using `supabase db query --linked`
 * (uses the CLI database connection, so RLS does not block inserts).
 */
import { execSync } from 'node:child_process'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const csvPath = join(root, 'supabase', 'seeds', 'flowers.csv')

function clean(v) {
  if (v === undefined || v === null) return null
  const t = String(v).trim()
  if (t === '' || t === '#N/A' || t === 'N/A') return null
  return t
}

function sqlLiteral(s) {
  if (s === null || s === undefined) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

function toRow(r) {
  const id = Number(r.Id ?? r.id)
  if (!Number.isFinite(id)) throw new Error(`Bad id: ${JSON.stringify(r)}`)
  const sku = clean(r.Sku ?? r.sku) ?? ''
  const title = clean(r.Title ?? r.title) ?? ''
  const locations = clean(r.Locations ?? r.locations) ?? ''
  return {
    id,
    sku,
    title,
    locations,
    hybridizer: clean(r.Hybridizer ?? r.hybridizer),
    released: clean(r.Released ?? r.released),
    colors: clean(r.Colors ?? r.colors),
  }
}

function rowSql(row) {
  return `(${row.id}, ${sqlLiteral(row.sku)}, ${sqlLiteral(row.title)}, ${sqlLiteral(row.locations)}, ${sqlLiteral(row.hybridizer)}, ${sqlLiteral(row.released)}, ${sqlLiteral(row.colors)})`
}

const csv = readFileSync(csvPath, 'utf8')
const records = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  trim: true,
})
const rows = records.map(toRow)

const batchSize = Number(process.env.FLOWER_BATCH_SIZE ?? 120)

for (let i = 0; i < rows.length; i += batchSize) {
  const chunk = rows.slice(i, i + batchSize)
  const values = chunk.map(rowSql).join(',\n')
  const sql = `insert into public.flowers (id, sku, title, locations, hybridizer, released, colors) values
${values}
on conflict (id) do update set
  sku = excluded.sku,
  title = excluded.title,
  locations = excluded.locations,
  hybridizer = excluded.hybridizer,
  released = excluded.released,
  colors = excluded.colors;`

  const tmp = join(tmpdir(), `iris-flowers-${Date.now()}-${i}.sql`)
  writeFileSync(tmp, sql, 'utf8')
  try {
    const q = tmp.includes(' ') ? `"${tmp}"` : tmp
    execSync(`npx supabase db query --linked -f ${q}`, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    })
  } finally {
    unlinkSync(tmp)
  }
  console.error(`Upserted ${Math.min(i + batchSize, rows.length)} / ${rows.length}`)
}

console.error(`Done. ${rows.length} rows.`)
