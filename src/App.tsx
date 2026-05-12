import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { searchFlowers, suggestFlowers } from './lib/searchFlowers'
import { parseLocations, type Flower } from './types/flower'
import './App.css'

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
  const listboxId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<number | null>(null)

  function dismissKeyboard() {
    searchInputRef.current?.blur()
  }

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      setSuggestions([])
      setIsSuggesting(false)
      setSuggestionError(false)
      return
    }

    setIsSuggesting(true)
    setSuggestionError(false)

    const timeoutId = window.setTimeout(async () => {
      try {
        const matches = await suggestFlowers(trimmed)
        setSuggestions(matches)
      } catch {
        setSuggestions([])
        setSuggestionError(true)
      } finally {
        setIsSuggesting(false)
      }
    }, 200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  function normalizeSearchQuery(searchQuery: string): string {
    const trimmed = searchQuery.trim()
    const idPrefix = trimmed.match(/^(\d+)/)
    return idPrefix?.[1] ?? trimmed
  }

  async function runSearch(searchQuery: string) {
    const trimmed = normalizeSearchQuery(searchQuery)
    if (!trimmed) {
      setResults([])
      setHasSearched(false)
      setErrorMessage(null)
      return
    }

    setIsSearching(true)
    setErrorMessage(null)

    try {
      const matches = await searchFlowers(trimmed)
      setResults(matches)
      setHasSearched(true)
    } catch {
      setResults([])
      setHasSearched(true)
      setErrorMessage('Could not load locations. Try again.')
    } finally {
      setIsSearching(false)
    }
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
    await runSearch(String(flower.id))
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

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">Farwest Iris Gardens</p>
        <h1>Iris Locator</h1>
        <p className="lede">Search by product ID, SKU, or flower name.</p>
      </header>

      <main className="app-main">
        <form className="search-form" onSubmit={handleSearch}>
          <label className="search-label" htmlFor="flower-search">
            ID, SKU, or title
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
              placeholder="1000, 1000-TB, or Decibelle"
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

          <button className="search-button" type="submit" disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Find location'}
          </button>
        </form>

        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {hasSearched && !errorMessage && results.length === 0 ? (
          <p className="status">No matches for that ID, SKU, or title.</p>
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
      </dl>

      <div className="location-list" aria-label="Locations">
        {locations.map((location) => (
          <span key={location} className="location-chip">
            {location}
          </span>
        ))}
      </div>
    </>
  )
}

export default App
