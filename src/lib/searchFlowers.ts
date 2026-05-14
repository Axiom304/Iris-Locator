import { supabase } from './supabase'
import type { Flower } from '../types/flower'
import {
  defaultFlowerSearchFields,
  defaultFlowerSort,
  type FlowerSearchFields,
  type FlowerSortState,
  unrestrictedSearchFields,
} from '../types/searchFilters'

export type { FlowerSearchFields, FlowerSortColumn, FlowerSortState } from '../types/searchFilters'
export {
  defaultFlowerSearchFields,
  defaultFlowerSort,
  flowerSearchFieldLabels,
  unrestrictedSearchFields,
} from '../types/searchFilters'

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

function effectiveFields(fields: FlowerSearchFields): FlowerSearchFields {
  if (!Object.values(fields).some(Boolean)) {
    return { ...defaultFlowerSearchFields }
  }
  return fields
}

export function buildSearchFilter(query: string, fields: FlowerSearchFields): string {
  const f = effectiveFields(fields)
  const escaped = escapeIlike(query)
  const containsPattern = `%${escaped}%`
  const titlePrefixPattern = `${escaped}%`
  const filters: string[] = []

  // Title: prefix match only (case-insensitive). Other text fields: substring anywhere.
  if (f.title) filters.push(`title.ilike.${titlePrefixPattern}`)
  if (f.sku) filters.push(`sku.ilike.${containsPattern}`)
  if (f.hybridizer) filters.push(`hybridizer.ilike.${containsPattern}`)
  if (f.released) filters.push(`released.ilike.${containsPattern}`)
  if (f.colors) filters.push(`colors.ilike.${containsPattern}`)

  if (/^\d+$/.test(query) && f.id) {
    filters.push(`id.eq.${Number(query)}`)
  }

  return filters.join(',')
}

function tiebreakColumn(primary: FlowerSortState['column']): FlowerSortState['column'] {
  return primary === 'id' ? 'title' : 'id'
}

export async function searchFlowers(
  query: string,
  fields: FlowerSearchFields = unrestrictedSearchFields,
  sort: FlowerSortState = defaultFlowerSort,
): Promise<Flower[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const filter = buildSearchFilter(trimmed, fields)
  const secondary = tiebreakColumn(sort.column)

  const { data, error } = await supabase
    .from('flowers')
    .select('id, sku, title, locations, hybridizer, released, colors')
    .or(filter)
    .order(sort.column, { ascending: sort.ascending })
    .order(secondary, { ascending: true })
    .limit(2000)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function suggestFlowers(
  query: string,
  limit = 8,
  fields: FlowerSearchFields = unrestrictedSearchFields,
  sort: FlowerSortState = defaultFlowerSort,
): Promise<Flower[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const filter = buildSearchFilter(trimmed, fields)
  const secondary = tiebreakColumn(sort.column)

  const { data, error } = await supabase
    .from('flowers')
    .select('id, sku, title, locations, hybridizer, released, colors')
    .or(filter)
    .order(sort.column, { ascending: sort.ascending })
    .order(secondary, { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  return data ?? []
}