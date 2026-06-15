import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DbService, Post } from '../../services/db.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container">
      <div class="header">
        
        <div class="header-actions" *ngIf="db.isLocal">
          <div class="prompt">
            <span class="prompt-prefix">ajin@shell:~$</span>
            <span>./start_second_brain.sh</span>
          </div>
          <button class="btn btn-primary" routerLink="/edit/new">
            > touch new_note.md
          </button>
        </div>
        
        <div class="search-bar">
          <span class="prompt-prefix">ajin@shell:~/search$</span>
          <input 
            type="text" 
            class="form-control" 
            placeholder="grep -r 'pattern' ./" 
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
          >
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button class="btn" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-family:var(--font-mono); font-size:0.85rem;" (click)="toggleSort()">
            [ {{ sortOrder === 'desc' ? 'Newest First' : 'Oldest First' }} ]
          </button>
        </div>
      </div>

      <div class="posts-grid">
        <div *ngFor="let post of posts" class="post-card glass-panel" (click)="viewPost(post.id!)">
          <div class="post-card-content">
            <h3><span class="prompt-prefix">#</span> {{ post.title || 'untitled.md' }}</h3>
            <p class="preview">{{ post.content | slice:0:100 }}{{ post.content.length > 100 ? '...' : '' }}</p>
            
            <div class="post-meta">
              <span class="date">{{ post.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
              <div class="badges">
                <span class="badge" *ngIf="post.images?.length">
                  <span class="material-icons" style="font-size:12px; margin-right:4px;">attachment</span> 
                  {{post.images.length}} file(s)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="empty-state glass-panel" *ngIf="posts.length === 0">
          <span class="prompt-prefix" style="font-size: 2rem; margin-bottom: 8px;">[ ~/ ]</span>
          <h3>Directory is empty</h3>
          <p>Use '> touch new_note.md' to create your first file.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      margin-bottom: 40px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px dashed var(--border-color);
    }
    .prompt {
      font-family: var(--font-mono);
      font-size: 1rem;
    }
    
    .search-bar {
      display: flex;
      align-items: center;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      padding: 0 16px;
      border-radius: 4px;
    }
    .search-bar input {
      border: none;
      background: transparent;
      border-radius: 0;
      flex-grow: 1;
      font-family: var(--font-mono);
    }
    .search-bar input:focus {
      box-shadow: none;
    }
    
    .posts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    
    .post-card {
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }
    .post-card:hover {
      border-color: var(--accent-color);
      box-shadow: inset 2px 0 0 var(--accent-color);
    }
    .post-card-content {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
    }
    .post-card h3 {
      font-size: 1.1rem;
      margin-bottom: 8px;
      color: var(--accent-color);
    }
    .preview {
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-family: var(--font-sans);
    }
    .post-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      color: var(--text-secondary);
    }
    .badges { display: flex; gap: 8px; }
    .badge {
      display: inline-flex;
      align-items: center;
      background: var(--bg-color);
      padding: 2px 8px;
      border-radius: 2px;
      border: 1px solid var(--border-color);
    }
    
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      border-style: dashed;
    }
    .empty-state h3 {
      font-family: var(--font-mono);
    }
  `]
})
export class HomeComponent implements OnInit {
  posts: Post[] = [];
  searchQuery: string = '';
  sortOrder: 'desc' | 'asc' = 'desc';
  
  public db = inject(DbService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    await this.loadPosts();
  }

  async loadPosts() {
    this.posts = await this.db.getAllPosts();
    this.sortPosts();
    this.cdr.detectChanges();
  }

  async onSearch() {
    this.posts = await this.db.searchPosts(this.searchQuery);
    this.sortPosts();
    this.cdr.detectChanges();
  }

  toggleSort() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.sortPosts();
  }

  sortPosts() {
    this.posts.sort((a, b) => {
      if (this.sortOrder === 'desc') {
        return b.updatedAt - a.updatedAt;
      } else {
        return a.updatedAt - b.updatedAt;
      }
    });
  }

  viewPost(id: number) {
    this.router.navigate(['/post', id]);
  }
}
