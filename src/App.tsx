import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  defaultFlowerSort,
  flowerSearchFieldLabels,
  searchFlowers,
  suggestFlowers,
  unrestrictedSearchFields,
} from './lib/searchFlowers'
import type { FlowerSearchFields, FlowerSortState } from './types/searchFilters'
import { parseLocations, type Flower } from './types/flower'
import './App.css'

function flowerSearchFieldsEqual(a: FlowerSearchFields, b: FlowerSearchFields): boolean {
  return flowerSearchFieldLabels.every(({ key }) => a[key] === b[key])
}

function flowerSortEqual(a: FlowerSortState, b: FlowerSortState): boolean {
  return a.column === b.column && a.ascending === b.ascending
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Flower[]>([])
  const [suggestions, setSuggestions] = useState<Flower[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [suggestionError, setSuggestionError] = useState(false)
  const [searchFields, setSearchFields] = useState<FlowerSearchFields>(() => ({
    ...unrestrictedSearchFields,
  }))
  const [sortState, setSortState] = useState<FlowerSortState>(() => ({ ...defaultFlowerSort }))
  const [appliedSearchFields, setAppliedSearchFields] = useState<FlowerSearchFields>(() => ({
    ...unrestrictedSearchFields,
  }))
  const [appliedSortState, setAppliedSortState] = useState<FlowerSortState>(() => ({
    ...defaultFlowerSort,
  }))
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const filtersPanelId = useId()
  const listboxId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<number | null>(null)
  /** Bumped on clear (and at start of each search) so stale in-flight requests do not repopulate UI. */
  const searchEpochRef = useRef(0)

  function dismissKeyboard() {
    searchInputRef.current?.blur()
  }

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      const clearId = window.setTimeout(() => {
        setSuggestions([])
        setIsSuggesting(false)
        setSuggestionError(false)
      }, 0)
      return () => window.clearTimeout(clearId)
    }

    const kickoffId = window.setTimeout(() => {
      setIsSuggesting(true)
      setSuggestionError(false)
    }, 0)

    const timeoutId = window.setTimeout(async () => {
      try {
        const matches = await suggestFlowers(trimmed, 8, searchFields, sortState)
        setSuggestions(matches)
      } catch {
        setSuggestions([])
        setSuggestionError(true)
      } finally {
        setIsSuggesting(false)
      }
    }, 200)

    return () => {
      window.clearTimeout(kickoffId)
      window.clearTimeout(timeoutId)
    }
  }, [query, searchFields, sortState])

  /** Only collapse to bare ID when the query matches the suggestion format (`123 · Title`). */
  function normalizeSearchQuery(searchQuery: string): string {
    const trimmed = searchQuery.trim()
    const fromSuggestion = trimmed.match(/^(\d+)\s*·/)
    if (fromSuggestion) {
      return fromSuggestion[1]
    }
    return trimmed
  }

  async function runSearch(searchQuery: string, fieldsOverride?: FlowerSearchFields) {
    const trimmed = normalizeSearchQuery(searchQuery)
    const fields = fieldsOverride ?? searchFields
    const sortForRequest: FlowerSortState = { ...sortState }

    if (!trimmed) {
      setResults([])
      setHasSearched(false)
      setErrorMessage(null)
      setAppliedSearchFields({ ...searchFields })
      setAppliedSortState({ ...sortState })
      return
    }

    const epoch = ++searchEpochRef.current
    setIsSearching(true)
    setErrorMessage(null)

    try {
      const matches = await searchFlowers(trimmed, fields, sortForRequest)
      if (searchEpochRef.current !== epoch) {
        return
      }
      setResults(matches)
      setHasSearched(true)
    } catch {
      if (searchEpochRef.current !== epoch) {
        return
      }
      setResults([])
      setHasSearched(true)
      setErrorMessage('Could not load locations. Try again.')
    } finally {
      if (searchEpochRef.current === epoch) {
        setIsSearching(false)
        setAppliedSearchFields({ ...fields })
        setAppliedSortState(sortForRequest)
      }
    }
  }

  function handleClearSearch() {
    searchEpochRef.current += 1
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setQuery('')
    setResults([])
    setHasSearched(false)
    setErrorMessage(null)
    setShowSuggestions(false)
    setSuggestions([])
    setIsSuggesting(false)
    setSuggestionError(false)
    setIsSearching(false)
    setAppliedSearchFields({ ...searchFields })
    setAppliedSortState({ ...sortState })
    dismissKeyboard()
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowSuggestions(false)
    dismissKeyboard()
    await runSearch(query)
  }

  async function handleSuggestionSelect(flower: Flower) {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current)
    }

    const nextQuery = `${flower.id} · ${flower.title}`
    setQuery(nextQuery)
    setShowSuggestions(false)
    setSuggestions([])
    dismissKeyboard()
    await runSearch(String(flower.id), unrestrictedSearchFields)
  }

  function handleInputFocus() {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current)
    }

    if (query.trim()) {
      setShowSuggestions(true)
    }
  }

  function handleInputBlur() {
    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }

  const trimmedQuery = query.trim()
  const shouldShowSuggestions = showSuggestions && trimmedQuery.length > 0

  const filtersAreDefault = useMemo(
    () => !Object.values(searchFields).some(Boolean),
    [searchFields],
  )

  const sortIsDefault = useMemo(
    () =>
      sortState.column === defaultFlowerSort.column &&
      sortState.ascending === defaultFlowerSort.ascending,
    [sortState],
  )

  const showPanelBadge = !filtersAreDefault || !sortIsDefault

  const searchSettingsStale = useMemo(
    () =>
      !flowerSearchFieldsEqual(searchFields, appliedSearchFields) ||
      !flowerSortEqual(sortState, appliedSortState),
    [searchFields, appliedSearchFields, sortState, appliedSortState],
  )

  const showUpdateSearchButton =
    searchSettingsStale && normalizeSearchQuery(query).trim().length > 0

  async function handleUpdateSearchFromPanel() {
    setShowSuggestions(false)
    dismissKeyboard()
    await runSearch(query)
  }

  function setField(key: keyof FlowerSearchFields, checked: boolean) {
    setSearchFields((prev) => ({ ...prev, [key]: checked }))
  }

  function clearSearchFilters() {
    setSearchFields({ ...unrestrictedSearchFields })
  }

  function resetSort() {
    setSortState({ ...defaultFlowerSort })
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">Farwest Iris Gardens</p>
        <h1>Iris Locator</h1>
        <p className="lede">
          Search by ID, SKU, title, hybridizer, release year, or colors. Title matches from the start
          of the name; other text fields match anywhere.
        </p>
      </header>

      <main className="app-main">
        <div className="filters-block">
          <button
            type="button"
            className="filters-toggle"
            aria-expanded={filtersExpanded}
            aria-controls={filtersPanelId}
            onClick={() => setFiltersExpanded((v) => !v)}
          >
            <span className="filters-toggle-label">Filters / Sort</span>
            <span className="filters-toggle-hint" aria-hidden="true">
              {filtersExpanded ? '▼' : '▶'}
            </span>
            {showPanelBadge ? (
              <span className="filters-active-badge">Adjusted</span>
            ) : null}
          </button>

          {filtersExpanded ? (
            <div className="filters-panel" id={filtersPanelId}>
              <p className="filters-help">
                Leave all unchecked to search every field (default). Check one or more to limit the
                search to only those fields—for example, check Release only to search by year. Title
                always matches from the start of the name (case-insensitive); other text fields match
                anywhere in the value.
              </p>
              <ul className="filters-list">
                {flowerSearchFieldLabels.map(({ key, label }) => (
                  <li key={key} className="filter-item">
                    <label className="filter-option">
                      <input
                        type="checkbox"
                        className="filter-check"
                        checked={searchFields[key]}
                        onChange={(e) => setField(key, e.target.checked)}
                      />
                      <span className="filter-option-text">{label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" className="filters-clear" onClick={clearSearchFilters}>
                Clear filters (search all fields)
              </button>

              <div className="sort-section">
                <h3 className="sort-section-title">Sort</h3>
                <p className="sort-section-help">
                  Pick ascending (A–Z, low to high) or reverse order, then which field to sort by.
                </p>

                <fieldset className="sort-fieldset">
                  <legend className="sort-legend">Order</legend>
                  <div className="sort-direction-row">
                    <label className="sort-radio-label">
                      <input
                        type="radio"
                        className="sort-radio"
                        name="flower-sort-direction"
                        checked={sortState.ascending}
                        onChange={() => setSortState((s) => ({ ...s, ascending: true }))}
                      />
                      <span>Ascending (A–Z, low to high)</span>
                    </label>
                    <label className="sort-radio-label">
                      <input
                        type="radio"
                        className="sort-radio"
                        name="flower-sort-direction"
                        checked={!sortState.ascending}
                        onChange={() => setSortState((s) => ({ ...s, ascending: false }))}
                      />
                      <span>Reverse (Z–A, high to low)</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="sort-fieldset">
                  <legend className="sort-legend">Sort by</legend>
                  <div className="sort-by-grid">
                    {flowerSearchFieldLabels.map(({ key, label }) => (
                      <label key={key} className="sort-radio-label">
                        <input
                          type="radio"
                          className="sort-radio"
                          name="flower-sort-column"
                          checked={sortState.column === key}
                          onChange={() => setSortState((s) => ({ ...s, column: key }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button type="button" className="filters-clear sort-reset" onClick={resetSort}>
                  Reset sort (title A–Z)
                </button>
              </div>

              {showUpdateSearchButton ? (
                <div className="update-search-block">
                  <p className="update-search-hint">
                    Filters or sort changed since your last location search. Run the search again to
                    refresh results.
                  </p>
                  <button
                    type="button"
                    className="update-search-button"
                    disabled={isSearching}
                    onClick={() => void handleUpdateSearchFromPanel()}
                  >
                    {isSearching ? 'Searching…' : 'Update Search'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <label className="search-label" htmlFor="flower-search">
            ID, SKU, title, hybridizer, release, or colors
          </label>

          <div className="search-field">
            <input
              ref={searchInputRef}
              id="flower-search"
              className="search-input"
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Schreiner, 2015, Pink, or 1000-TB"
              value={query}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={shouldShowSuggestions}
              aria-controls={listboxId}
              onChange={(event) => {
                setQuery(event.target.value)
                setShowSuggestions(true)
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />

            {shouldShowSuggestions ? (
              <ul id={listboxId} className="suggestions" role="listbox">
                {isSuggesting ? (
                  <li className="suggestion-status" role="presentation">
                    Loading suggestions…
                  </li>
                ) : null}

                {!isSuggesting && suggestionError ? (
                  <li className="suggestion-status" role="presentation">
                    Could not load suggestions.
                  </li>
                ) : null}

                {!isSuggesting && !suggestionError && suggestions.length === 0 ? (
                  <li className="suggestion-status" role="presentation">
                    No matching products.
                  </li>
                ) : null}

                {suggestions.map((flower) => (
                  <li key={flower.id} role="option">
                    <button
                      type="button"
                      className="suggestion-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void handleSuggestionSelect(flower)}
                    >
                      <span className="suggestion-title">{flower.title}</span>
                      <span className="suggestion-meta">
                        ID {flower.id} · SKU {flower.sku}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="search-actions">
            <button className="search-button" type="submit" disabled={isSearching}>
              {isSearching ? 'Searching…' : 'Find location'}
            </button>
            <button
              type="button"
              className="clear-search-button"
              onClick={handleClearSearch}
            >
              Clear Search
            </button>
          </div>
        </form>

        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {hasSearched && !errorMessage && results.length === 0 ? (
          <p className="status">No matches for that search.</p>
        ) : null}

        {hasSearched && !errorMessage && results.length > 1 ? (
          <p className="results-count" role="status">
            {results.length} matches
          </p>
        ) : null}

        <ul className="results">
          {results.map((flower) => (
            <li key={flower.id} className="result-card">
              <ResultCard flower={flower} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function ResultCard({ flower }: { flower: Flower }) {
  const locations = parseLocations(flower.locations)

  return (
    <>
      <div className="result-header">
        <h2>{flower.title}</h2>
      </div>

      <dl className="result-details">
        <div className="result-detail">
          <dt>ID</dt>
          <dd>{flower.id}</dd>
        </div>
        <div className="result-detail">
          <dt>SKU</dt>
          <dd>{flower.sku}</dd>
        </div>
        {flower.hybridizer ? (
          <div className="result-detail">
            <dt>Hybridizer</dt>
            <dd>{flower.hybridizer}</dd>
          </div>
        ) : null}
        {flower.released ? (
          <div className="result-detail">
            <dt>Released</dt>
            <dd>{flower.released}</dd>
          </div>
        ) : null}
        {flower.colors ? (
          <div className="result-detail">
            <dt>Colors</dt>
            <dd>{flower.colors}</dd>
          </div>
        ) : null}
      </dl>

      <section className="location-section" aria-labelledby={`location-${flower.id}`}>
        <h3 className="location-heading" id={`location-${flower.id}`}>
          Location
        </h3>
        <div className="location-list">
          {locations.map((location) => (
            <span key={location} className="location-chip">
              {location}
            </span>
          ))}
        </div>
      </section>
    </>
  )
}

export default App
