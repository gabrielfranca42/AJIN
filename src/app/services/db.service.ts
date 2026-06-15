import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface Post {
  id?: number;
  title: string;
  content: string;
  images: { name: string; url: string; data: string }[]; // Storing Base64 for simplicity in this MVP instead of Blobs to avoid URL lifetime issues
  createdAt: number;
  updatedAt: number;
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

  async getAllPosts(): Promise<Post[]> {
    if (!this.isLocal) {
      try {
        const res = await fetch('assets/db.json');
        if (!res.ok) return [];
        const data = await res.json();
        return data.sort((a: Post, b: Post) => b.updatedAt - a.updatedAt);
      } catch (e) {
        return [];
      }
    }
    return await this.posts.orderBy('updatedAt').reverse().toArray();
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
    } else {
      post.createdAt = now;
      post.updatedAt = now;
      savedId = await this.posts.add(post);
    }
    
    await this.syncToGit('save');
    return savedId as number;
  }

  async deletePost(id: number): Promise<void> {
    if (!this.isLocal) return; // Read-only on production
    
    await this.posts.delete(id);
    await this.syncToGit('delete');
  }

  private async syncToGit(action: 'save' | 'delete') {
    if (!this.isLocal) return;
    try {
      const allPosts = await this.getAllPosts();
      await fetch('http://localhost:3000/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, posts: allPosts })
      });
      console.log('Sincronização acionada com sucesso!');
    } catch (e) {
      console.error('Falha ao sincronizar com servidor local. O servidor "node local-sync.js" está rodando?', e);
    }
  }
}
