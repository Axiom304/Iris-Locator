import { useState, type FormEvent } from 'react'
import { searchFlowers } from './lib/searchFlowers'
import { parseLocations, type Flower } from './types/flower'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Flower[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = query.trim()
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

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">Flower shop</p>
        <h1>Iris Locator</h1>
        <p className="lede">Search by product ID or flower name.</p>
      </header>

      <main className="app-main">
        <form className="search-form" onSubmit={handleSearch}>
          <label className="search-label" htmlFor="flower-search">
            ID or title
          </label>
          <input
            id="flower-search"
            className="search-input"
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="1000 or Decibelle"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="search-button" type="submit" disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Find location'}
          </button>
        </form>

        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {hasSearched && !errorMessage && results.length === 0 ? (
          <p className="status">No matches for that ID or title.</p>
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
        <p className="result-meta">
          ID {flower.id} · {flower.sku}
        </p>
      </div>
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
