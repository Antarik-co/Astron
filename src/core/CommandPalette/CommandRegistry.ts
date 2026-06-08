import {
  AstronCommand,
  ModuleName,
  AstronCommandResult,
  CommandParams,
} from '../../types/index';

export class CommandRegistry {
  private commands: Map<string, AstronCommand>;
  private commandsByModule: Map<ModuleName, AstronCommand[]>;

  constructor() {
    this.commands = new Map();
    this.commandsByModule = new Map();
  }

  // ── register ────────────────────────────────────────────────
  register(command: AstronCommand): void {
    if (!command.id || !command.label || !command.module || !command.execute) {
      throw new Error(
        `Command is missing one or more required fields (id, label, module, execute).`
      );
    }

    if (this.commands.has(command.id)) {
      throw new Error(`Command ID "${command.id}" is already registered.`);
    }

    this.commands.set(command.id, command);

    const existing = this.commandsByModule.get(command.module) ?? [];
    existing.push(command);
    this.commandsByModule.set(command.module, existing);
  }

  // ── registerBulk ────────────────────────────────────────────
  registerBulk(commands: AstronCommand[]): void {
    for (const command of commands) {
      try {
        this.register(command);
      } catch (error) {
        console.error(
          `[CommandRegistry] Failed to register "${command?.id ?? '(unknown)'}":`,
          error
        );
      }
    }
  }

  // ── get ─────────────────────────────────────────────────────
  get(id: string): AstronCommand | undefined {
    return this.commands.get(id);
  }

  // ── getByModule ─────────────────────────────────────────────
  getByModule(module: ModuleName): AstronCommand[] {
    return this.commandsByModule.get(module) ?? [];
  }

  // ── getAll ──────────────────────────────────────────────────
  getAll(): AstronCommand[] {
    return Array.from(this.commands.values());
  }

  // ── unregisterModule ────────────────────────────────────────
  unregisterModule(module: ModuleName): void {
    const moduleCommands = this.commandsByModule.get(module);
    if (!moduleCommands) return;

    for (const command of moduleCommands) {
      this.commands.delete(command.id);
    }

    this.commandsByModule.delete(module);
  }

  // ── execute ─────────────────────────────────────────────────
  async execute(id: string, params?: CommandParams): Promise<AstronCommandResult> {
    const command = this.commands.get(id);

    if (!command) {
      return { success: false, message: `Command "${id}" not found.` };
    }

    try {
      return await command.execute(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message };
    }
  }

  // ── has ─────────────────────────────────────────────────────
  has(id: string): boolean {
    return this.commands.has(id);
  }

  // ── count ───────────────────────────────────────────────────
  count(): number {
    return this.commands.size;
  }
}

export const commandRegistry = new CommandRegistry();
