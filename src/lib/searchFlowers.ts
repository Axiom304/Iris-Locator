import { supabase } from './supabase'
import type { Flower } from '../types/flower'

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

function buildSearchFilter(query: string): string {
  const escaped = escapeIlike(query)
  const pattern = `%${escaped}%`
  const filters = [
    `title.ilike.${pattern}`,
    `sku.ilike.${pattern}`,
    `hybridizer.ilike.${pattern}`,
    `colors.ilike.${pattern}`,
  ]

  if (/^\d+$/.test(query)) {
    filters.push(`id.eq.${Number(query)}`)
    filters.push(`sku.ilike.${escaped}%`)
  }

  return filters.join(',')
}

export async function searchFlowers(query: string): Promise<Flower[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const { data, error } = await supabase
    .from('flowers')
    .select('id, sku, title, locations, hybridizer, released, colors')
    .or(buildSearchFilter(trimmed))
    .order('title')

  if (error) {
    throw error
  }

  return data ?? []
}

export async function suggestFlowers(query: string, limit = 8): Promise<Flower[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const { data, error } = await supabase
    .from('flowers')
    .select('id, sku, title, locations, hybridizer, released, colors')
    .or(buildSearchFilter(trimmed))
    .order('title')
    .limit(limit)

  if (error) {
    throw error
  }

  return data ?? []
}
