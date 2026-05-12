import { supabase } from './supabase'
import type { Flower } from '../types/flower'

export async function searchFlowers(query: string): Promise<Flower[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  if (/^\d+$/.test(trimmed)) {
    const { data, error } = await supabase
      .from('flowers')
      .select('id, sku, title, locations')
      .eq('id', Number(trimmed))

    if (error) {
      throw error
    }

    return data ?? []
  }

  const { data, error } = await supabase
    .from('flowers')
    .select('id, sku, title, locations')
    .ilike('title', `%${trimmed}%`)

  if (error) {
    throw error
  }

  return data ?? []
}
