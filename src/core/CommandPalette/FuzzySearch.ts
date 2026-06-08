import Fuse, { IFuseOptions } from 'fuse.js';
import { IndexEntry, SearchResult } from '../../types/index';

export class FuzzySearch {
  private fuse: Fuse<IndexEntry> | null = null;
  private items: IndexEntry[] = [];

  // ── Fuse configuration ───────────────────────────────────
  // threshold 0.35: tight enough to avoid noise, loose enough for typos.
  // ignoreLocation: true — command labels don't front-load keywords.
  // includeScore + includeMatches: required for SearchResult.score / .matches.
  private readonly fuseOptions: IFuseOptions<IndexEntry> = {
    keys: ['label', 'keywords', 'type', 'source'],
    threshold: 0.35,
    distance: 100,
    minMatchCharLength: 1,
    includeScore: true,
    includeMatches: true,
    useExtendedSearch: false,
    ignoreLocation: true,
  };

  // ── buildIndex ───────────────────────────────────────────
  buildIndex(entries: IndexEntry[]): void {
    this.items = entries;
    this.fuse = new Fuse(entries, this.fuseOptions);
  }

  // ── search ───────────────────────────────────────────────
  search(query: string, limit: number = 12): SearchResult[] {
    if (!this.fuse || !query) return [];

    const raw = this.fuse.search(query, { limit });

    return raw
      .map(result => ({
        entry:   result.item,
        score:   result.score  ?? 1,                               // 0 = perfect, 1 = no match
        matches: result.matches?.map(m => m.value ?? '') ?? [],
      }))
      .sort((a, b) => a.score - b.score);                          // ascending — lower is better
  }

  // ── searchByModule ───────────────────────────────────────
  searchByModule(query: string, moduleName: string, limit: number = 12): SearchResult[] {
    return this.search(query, limit * 2)
      .filter(result => result.entry.module === moduleName)
      .slice(0, limit);
  }

  // ── addEntry ─────────────────────────────────────────────
  addEntry(entry: IndexEntry): void {
    this.items.push(entry);
    this.buildIndex(this.items);
  }

  // ── removeEntriesByModule ────────────────────────────────
  removeEntriesByModule(moduleName: string): void {
    this.items = this.items.filter(entry => entry.module !== moduleName);
    this.buildIndex(this.items);
  }

  // ── getItemCount ─────────────────────────────────────────
  getItemCount(): number {
    return this.items.length;
  }
}

export const fuzzySearch = new FuzzySearch();
