import {
  AstronCommand, // reserved for subclass / decorator type constraints
  CommandParams,
} from '../../types/index';

// ── ParsedInput ──────────────────────────────────────────────
export interface ParsedInput {
  raw: string;
  isSlashCommand: boolean;
  /** First token after the leading slash, lowercased. e.g. "ease" from "/ease overshoot" */
  commandKeyword: string;
  /** Remaining tokens after the command keyword. e.g. ["overshoot"] */
  params: string[];
  /** True when input has no slash AND contains more than 2 words */
  isNaturalLanguage: boolean;
  /** Input lowercased, trimmed, and collapsed to single spaces */
  normalizedQuery: string;
}

// ── CommandParser ────────────────────────────────────────────
export class CommandParser {

  // ── parse ─────────────────────────────────────────────────
  parse(input: string): ParsedInput {
    const trimmed = input.trim();
    const normalizedQuery = trimmed.toLowerCase().replace(/\s+/g, ' ');
    const isSlashCommand = trimmed.startsWith('/');

    let commandKeyword = '';
    let params: string[] = [];

    if (isSlashCommand) {
      const tokens = trimmed.slice(1).split(/\s+/).filter(Boolean);
      commandKeyword = tokens[0]?.toLowerCase() ?? '';
      params = tokens.slice(1);
    }

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isNaturalLanguage = !isSlashCommand && wordCount > 2;

    return {
      raw: trimmed,
      isSlashCommand,
      commandKeyword,
      params,
      isNaturalLanguage,
      normalizedQuery,
    };
  }

  // ── extractParams ─────────────────────────────────────────
  extractParams(paramTokens: string[]): CommandParams {
    const result: CommandParams = {};
    paramTokens.forEach((token, index) => {
      result[`param${index}`] = token;
    });
    return result;
  }

  // ── buildSearchQuery ──────────────────────────────────────
  buildSearchQuery(input: string): string {
    const parsed = this.parse(input);
    if (parsed.isSlashCommand) {
      return [parsed.commandKeyword, ...parsed.params].join(' ').trim();
    }
    return parsed.normalizedQuery;
  }

  // ── isAIQuery ─────────────────────────────────────────────
  isAIQuery(input: string): boolean {
    const trimmed = input.trim();

    if (
      trimmed.startsWith('/ask') ||
      trimmed.startsWith('/agent') ||
      trimmed.startsWith('/animate')
    ) {
      return true;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    const isNatural = !trimmed.startsWith('/') && words.length > 2;
    return isNatural && words.length > 4;
  }

  // ── splitModuleHint ───────────────────────────────────────
  splitModuleHint(input: string): { module: string | null; query: string } {
    // Set.prototype.has is ES6-native; Array.prototype.includes is ES2016 — use Set.
    const KNOWN_MODULES = new Set([
      'motion', 'timeline', 'effects', 'rig', '3d',
      'audio', 'color', 'text', 'export', 'organize', 'automate', 'ai',
    ]);

    const colonIndex = input.indexOf(':');
    if (colonIndex === -1) {
      return { module: null, query: input };
    }

    const potentialModule = input.slice(0, colonIndex).toLowerCase().trim();
    const query = input.slice(colonIndex + 1).trim();

    if (KNOWN_MODULES.has(potentialModule)) {
      return { module: potentialModule, query };
    }

    return { module: null, query: input };
  }
}

export const commandParser = new CommandParser();
