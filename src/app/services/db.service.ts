import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export type SyncAction = 'post' | 'update' | 'delete'

export interface Post {
  id?: number;
  title: string;
  content: string;
  images: { name: string; url: string; data: string }[]; // Storing Base64 for simplicity in this MVP instead of Blobs to avoid URL lifetime issues
  createdAt: number;
  updatedAt: number;
}

export interface DiffEntry {
  type: 'added' | 'modified' | 'deleted';
  title: string;
  oldContent?: string;
  newContent?: string;
  oldTitle?: string;
  newTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  posts!: Table<Post, number>;

  public readonly isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  constructor() {
    super('SecondBrainDB');
    this.version(1).stores({
      posts: '++id, title, createdAt, updatedAt' // indexes
    });
  }

  async getPendingActions(): Promise<SyncAction[]> {
    const stored = localStorage.getItem('pendingSyncActions');
    return stored ? JSON.parse(stored) : [];
  }

  private async addPendingAction(action: SyncAction) {
    if (!this.isLocal) return;
    const pending = await this.getPendingActions();
    if (!pending.includes(action)) {
      pending.push(action);
      localStorage.setItem('pendingSyncActions', JSON.stringify(pending));
    }
  }

  async clearPendingActions() {
    localStorage.removeItem('pendingSyncActions');
  }

  // Salva o estado atual como "último estado sincronizado" (snapshot)
  async saveSnapshot() {
    const allPosts = await this.posts.orderBy('updatedAt').reverse().toArray();
    // Salva sem imagens para não estourar o localStorage
    const light = allPosts.map(p => ({ id: p.id, title: p.title, content: p.content, createdAt: p.createdAt, updatedAt: p.updatedAt }));
    localStorage.setItem('lastSyncSnapshot', JSON.stringify(light));
  }

  getSnapshot(): { id?: number; title: string; content: string }[] {
    const stored = localStorage.getItem('lastSyncSnapshot');
    return stored ? JSON.parse(stored) : [];
  }

  // Compara o estado atual com o snapshot para gerar um diff
  async computeDiff(): Promise<DiffEntry[]> {
    const snapshot = this.getSnapshot();
    const current = await this.posts.orderBy('updatedAt').reverse().toArray();
    const diffs: DiffEntry[] = [];

    const snapshotMap = new Map(snapshot.map(p => [p.id, p]));
    const currentMap = new Map(current.map(p => [p.id, p]));

    // Posts novos (existem no current mas não no snapshot)
    for (const post of current) {
      if (!snapshotMap.has(post.id)) {
        diffs.push({ type: 'added', title: post.title, newContent: post.content, newTitle: post.title });
      }
    }

    // Posts modificados (existem em ambos mas conteúdo diferente)
    for (const post of current) {
      const old = snapshotMap.get(post.id);
      if (old && (old.content !== post.content || old.title !== post.title)) {
        diffs.push({ type: 'modified', title: post.title, oldContent: old.content, newContent: post.content, oldTitle: old.title, newTitle: post.title });
      }
    }

    // Posts deletados (existem no snapshot mas não no current)
    for (const old of snapshot) {
      if (!currentMap.has(old.id)) {
        diffs.push({ type: 'deleted', title: old.title, oldContent: old.content });
      }
    }

    return diffs;
  }

  async getAllPosts(): Promise<Post[]> {
    if (!this.isLocal) {
      try {
        const res = await fetch(`db.json?t=${new Date().getTime()}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.sort((a: Post, b: Post) => b.updatedAt - a.updatedAt);
      } catch (e) {
        return [];
      }
    }
    
    let localPosts = await this.posts.orderBy('updatedAt').reverse().toArray();
    
    // Se o banco local estiver vazio (limpeza de cache, aba anônima), tenta recuperar do db.json
    if (localPosts.length === 0) {
      try {
        const res = await fetch(`db.json?t=${new Date().getTime()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            await this.posts.bulkAdd(data);
            localPosts = data.sort((a: Post, b: Post) => b.updatedAt - a.updatedAt);
          }
        }
      } catch (e) {
        // Ignora erros caso o db.json ainda não exista
      }
    }
    
    return localPosts;
  }

  async searchPosts(query: string): Promise<Post[]> {
    if (!query.trim()) return this.getAllPosts();
    const lowerQuery = query.toLowerCase();
    
    // Simple client-side search across all posts
    const all = await this.getAllPosts();
    return all.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.content.toLowerCase().includes(lowerQuery)
    );
  }

  async getPost(id: number): Promise<Post | undefined> {
    if (!this.isLocal) {
      const all = await this.getAllPosts();
      return all.find(p => p.id === id);
    }
    return await this.posts.get(id);
  }

  async savePost(post: Post): Promise<number> {
    if (!this.isLocal) return post.id || 0; // Read-only on production
    
    const now = Date.now();
    let savedId = post.id;
    if (post.id) {
      post.updatedAt = now;
      await this.posts.put(post);
      await this.addPendingAction('update');
    } else {
      post.createdAt = now;
      post.updatedAt = now;
      savedId = await this.posts.add(post);
      await this.addPendingAction('post');
    }
    
    await this.saveLocalOnly();
    return savedId as number;
  }

  async deletePost(id: number): Promise<void> {
    if (!this.isLocal) return; // Read-only on production
    
    await this.posts.delete(id);
    await this.addPendingAction('delete');
    await this.saveLocalOnly();
  }

  // Salva db.json localmente SEM fazer git push (para não perder dados)
  private async saveLocalOnly() {
    if (!this.isLocal) return;
    try {
      const allPosts = await this.posts.orderBy('updatedAt').reverse().toArray();
      await fetch('http://localhost:3000/save-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: allPosts })
      });
    } catch (e) {
      console.error('Falha ao salvar db.json localmente:', e);
    }
  }

  async syncToGit(actions: SyncAction[]) {
    if (!this.isLocal || actions.length === 0) return;
    try {
      const allPosts = await this.getAllPosts();
      const response = await fetch('http://localhost:3000/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions, posts: allPosts })
      });
      
      if (!response.ok) {
        throw new Error('Servidor retornou erro: ' + response.status);
      }
      
      await this.clearPendingActions();
      await this.saveSnapshot();
      console.log('Sincronização acionada com sucesso!');
    } catch (e) {
      console.error('Falha ao sincronizar com servidor local.', e);
      alert('[ERRO] ERRO CRITICO: O arquivo db.json nao foi atualizado!\n\nO servidor "local-sync.js" parece estar offline ou travado. Verifique o seu terminal antes de fazer qualquer commit, caso contrário suas mudanças não irão para o ar.');
    }
  }
}
