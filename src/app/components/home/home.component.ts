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
    <a href="https://github.com/gabrielfranca42" target="_blank" style="position: fixed; top: 20px; right: 20px; color: var(--accent-color); z-index: 9999; display: flex; align-items: center; gap: 8px; text-decoration: none; font-family: var(--font-mono); font-weight: bold; background: var(--surface-color); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      GitHub
    </a>
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
