import { StorageAdapter } from "https://lib.deno.dev/x/grammy@1.x/mod.ts";
import { exists, existsSync } from "https://deno.land/std@0.190.0/fs/mod.ts";
import { resolve } from "https://deno.land/std@0.190.0/path/mod.ts";

const fs = {
  readFile: Deno.readTextFile,
  writeFile: Deno.writeTextFile,
  exists,
  existsSync,
  ensureDir: (path: string) => Deno.mkdir(path, { recursive: true }),
  ensureDirSync: (path: string) => Deno.mkdirSync(path, { recursive: true }),
  remove: Deno.remove,
};

type Serializer<Sessions> = (input: Sessions) => string;
type Deserializer<Sessions> = (input: string) => Sessions;

interface ConstructorOptions<Session> {
  filePath?: string;
  serializer?: Serializer<Record<string, Session>>;
  deserializer?: Deserializer<Record<string, Session>>;
}

export class FileAdapter<T> implements StorageAdapter<T> {
  private filePath: string;
  private sessions?: Record<string, T>;
  serializer: Serializer<Record<string, T>>;
  deserializer: Deserializer<Record<string, T>>;

  /**
   * @constructor
   * @param {opts} options options
   * @param {opts.filePath} options.filePath - relative path where files should be stored. Defaults to `sessions.json`.
   * @param {opts.serializer} options.serializer
   * serializer of file. Default `JSON.stringify(input, null, '\t')`.
   *
   * @param {opts.deserializer} options.deserializer
   * deserializer of file. Default `JSON.parse(input)`.
   */
  constructor(opts: ConstructorOptions<T> = {}) {
    this.filePath = resolve(Deno.cwd(), opts?.filePath ?? 'sessions.json');
    // If the file does not exist, create it.
    if (!fs.existsSync(this.filePath)) {
      fs.writeFile(this.filePath, '{}');
    }

    this.serializer = opts.serializer ??
      ((input) => JSON.stringify(input, null, '\t'));
    this.deserializer = opts.deserializer ??
      ((input) => JSON.parse(input));
  }

  async getSessions() {
    if (!this.sessions) {
      const sessionsFile = await fs.readFile(this.filePath);
      this.sessions = sessionsFile ? (this.deserializer(sessionsFile)) as Record<string, T> : {};
    }
    return this.sessions;
  }

  async read(key: string) {
    return (await this.getSessions())[key];
  }

  async write(key: string, value: T) {
    const sessions = await this.getSessions();
    sessions[key] = value;
    await fs.writeFile(this.filePath, this.serializer(sessions));
  }

  async delete(key: string) {
    const sessions = await this.getSessions();
    delete sessions[key];
    await fs.writeFile(this.filePath, this.serializer(sessions));
  }

  async has(key: string) {
    return Object.hasOwn(await this.getSessions(), key);
  }

  async* readAllKeys() {
    const sessions = await this.getSessions();
    for (const key in sessions) {
      yield key;
    }
  }

  async* readAllValues() {
    const sessions = await this.getSessions();
    for (const key in sessions) {
      yield sessions[key];
    }
  }

  async* readAllEntries() {
    const sessions = await this.getSessions();
    for (const key in sessions) {
      const ret:[string, T] = [key, sessions[key]]
      yield ret;
    }
  }
}