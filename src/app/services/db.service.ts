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

  constructor() {
    super('SecondBrainDB');
    this.version(1).stores({
      posts: '++id, title, createdAt, updatedAt' // indexes
    });
  }

  async getAllPosts(): Promise<Post[]> {
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
    return await this.posts.get(id);
  }

  async savePost(post: Post): Promise<number> {
    const now = Date.now();
    if (post.id) {
      post.updatedAt = now;
      await this.posts.put(post);
      return post.id;
    } else {
      post.createdAt = now;
      post.updatedAt = now;
      return await this.posts.add(post);
    }
  }

  async deletePost(id: number): Promise<void> {
    await this.posts.delete(id);
  }
}
