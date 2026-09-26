import type { FileInfo, FileSystemPort } from '@/infrastructure/storage/fileSystemPort';

interface MemoryNode {
  kind: 'file' | 'directory';
  data?: Uint8Array;
  children?: Map<string, MemoryNode>;
}

export class MemoryFileSystemPort implements FileSystemPort {
  private root: MemoryNode = { kind: 'directory', children: new Map() };

  reset(): void {
    this.root = { kind: 'directory', children: new Map() };
  }

  snapshot(): Map<string, Uint8Array> {
    const files = new Map<string, Uint8Array>();
    this.walk('', this.root, files);
    return files;
  }

  private walk(prefix: string, node: MemoryNode, files: Map<string, Uint8Array>): void {
    if (node.kind === 'file' && node.data) {
      files.set(prefix, node.data);
      return;
    }
    node.children?.forEach((child, name) => {
      const next = prefix ? `${prefix}/${name}` : name;
      this.walk(next, child, files);
    });
  }

  private resolve(path: string, createParents: boolean): MemoryNode {
    const parts = path.split('/').filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (current.kind !== 'directory' || !current.children) {
        throw new Error(`Not a directory: ${path}`);
      }
      let child = current.children.get(part);
      if (!child) {
        if (!createParents) {
          throw new Error(`Path not found: ${path}`);
        }
        child = { kind: 'directory', children: new Map() };
        current.children.set(part, child);
      }
      current = child;
    }
    return current;
  }

  private parent(path: string, createParents: boolean): { parent: MemoryNode; name: string } {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    if (!name) {
      throw new Error(`Invalid path: ${path}`);
    }
    const parentPath = parts.join('/');
    const parent = parentPath ? this.resolve(parentPath, createParents) : this.root;
    if (parent.kind !== 'directory' || !parent.children) {
      throw new Error(`Parent is not a directory: ${path}`);
    }
    return { parent, name };
  }

  async readDirectory(path: string): Promise<string[]> {
    const node = this.resolve(path, false);
    if (node.kind !== 'directory' || !node.children) {
      throw new Error(`Not a directory: ${path}`);
    }
    return [...node.children.keys()];
  }

  async getInfo(path: string): Promise<FileInfo> {
    try {
      const node = this.resolve(path, false);
      return {
        exists: true,
        isDirectory: node.kind === 'directory',
        size: node.kind === 'file' ? node.data?.length ?? 0 : undefined,
      };
    } catch {
      return { exists: false };
    }
  }

  async makeDirectory(path: string): Promise<void> {
    this.resolve(path, true);
  }

  async copyFile(from: string, to: string): Promise<void> {
    const data = await this.readBytes(from);
    await this.writeBytes(to, data);
  }

  async moveFile(from: string, to: string): Promise<void> {
    const data = await this.readBytes(from);
    await this.writeBytes(to, data);
    await this.delete(from);
  }

  async delete(path: string): Promise<void> {
    const { parent, name } = this.parent(path, false);
    parent.children?.delete(name);
  }

  async readBytes(path: string): Promise<Uint8Array> {
    const node = this.resolve(path, false);
    if (node.kind !== 'file' || !node.data) {
      throw new Error(`File not found: ${path}`);
    }
    return node.data;
  }

  async writeBytes(path: string, data: Uint8Array): Promise<void> {
    const { parent, name } = this.parent(path, true);
    parent.children?.set(name, { kind: 'file', data: new Uint8Array(data) });
  }

  async readBase64(path: string): Promise<string> {
    const bytes = await this.readBytes(path);
    return bytesToBase64(bytes);
  }

  async writeBase64(path: string, base64: string): Promise<void> {
    await this.writeBytes(path, base64ToBytes(base64));
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
