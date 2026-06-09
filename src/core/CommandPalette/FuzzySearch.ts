import Fuse, { IFuseOptions } from 'fuse.js'
import { IndexEntry, SearchResult } from '../../types/index'

export class FuzzySearch {
  private fuse: Fuse<IndexEntry> | null = null
  private items: IndexEntry[] = []

  private readonly fuseOptions: IFuseOptions<IndexEntry> = {
    keys: [
      { name: 'label', weight: 0.5 },
      { name: 'keywords', weight: 0.3 },
      { name: 'matchName', weight: 0.12 },
      { name: 'category', weight: 0.05 },
      { name: 'source', weight: 0.03 },
    ],
    threshold: 0.42,
    distance: 100,
    minMatchCharLength: 1,
    includeScore: true,
    includeMatches: true,
    useExtendedSearch: false,
    ignoreLocation: true,
  }

  buildIndex(entries: IndexEntry[]): void {
    this.items = entries
    this.fuse = new Fuse(entries, this.fuseOptions)
  }

  search(query: string, limit: number = 12): SearchResult[] {
    const normalized = query.trim().replace(/^\//, '').replace(/[-_:]+/g, ' ')
    if (!this.fuse || !normalized) {
      return []
    }

    const exact = this.items
      .filter((entry) => {
        const q = normalized.toLowerCase()
        const label = entry.label.toLowerCase()
        const id = entry.id.toLowerCase().replace(/[-_:]+/g, ' ')
        const matchName = entry.matchName?.toLowerCase().replace(/[-_:]+/g, ' ') ?? ''
        return label === q ||
          id === q ||
          matchName === q ||
          entry.keywords.some((keyword) => keyword.toLowerCase() === q)
      })
      .map((entry) => ({ entry, score: 0, matches: [entry.label] }))

    const fuzzy = this.fuse
      .search(normalized, { limit: limit + exact.length })
      .map((result) => ({
        entry: result.item,
        score: result.score ?? 1,
        matches: result.matches?.map((match) => match.value ?? '') ?? [],
      }))
      .sort((a, b) => a.score - b.score)

    const seen = new Set<string>()
    return [...exact, ...fuzzy]
      .filter((result) => {
        if (seen.has(result.entry.id)) {
          return false
        }
        seen.add(result.entry.id)
        return true
      })
      .slice(0, limit)
  }

  searchByModule(query: string, moduleName: string, limit: number = 12): SearchResult[] {
    return this.search(query, limit * 2)
      .filter((result) => result.entry.module === moduleName)
      .slice(0, limit)
  }

  addEntry(entry: IndexEntry): void {
    this.items.push(entry)
    this.buildIndex(this.items)
  }

  removeEntriesByModule(moduleName: string): void {
    this.items = this.items.filter((entry) => entry.module !== moduleName)
    this.buildIndex(this.items)
  }

  getItemCount(): number {
    return this.items.length
  }
}

export const fuzzySearch = new FuzzySearch()
