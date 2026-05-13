export type Flower = {
  id: number
  sku: string
  title: string
  locations: string
  hybridizer: string | null
  released: string | null
  colors: string | null
}

export function parseLocations(locations: string): string[] {
  return locations
    .split(',')
    .map((location) => location.trim())
    .filter(Boolean)
}
