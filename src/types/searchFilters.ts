export type FlowerSearchFields = {
  id: boolean
  sku: boolean
  title: boolean
  hybridizer: boolean
  released: boolean
  colors: boolean
}

export type FlowerSortColumn = keyof FlowerSearchFields

export type FlowerSortState = {
  column: FlowerSortColumn
  ascending: boolean
}

export const defaultFlowerSort: FlowerSortState = {
  column: 'title',
  ascending: true,
}

export const defaultFlowerSearchFields: FlowerSearchFields = {
  id: true,
  sku: true,
  title: true,
  hybridizer: true,
  released: true,
  colors: true,
}

/** All false = no restriction; search uses every field (same effect as `defaultFlowerSearchFields` in queries). */
export const unrestrictedSearchFields: FlowerSearchFields = {
  id: false,
  sku: false,
  title: false,
  hybridizer: false,
  released: false,
  colors: false,
}

export const flowerSearchFieldLabels: { key: keyof FlowerSearchFields; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'sku', label: 'SKU' },
  { key: 'title', label: 'Title' },
  { key: 'hybridizer', label: 'Hybridizer' },
  { key: 'released', label: 'Release' },
  { key: 'colors', label: 'Colors' },
]
