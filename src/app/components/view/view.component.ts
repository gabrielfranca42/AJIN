import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DbService, Post } from '../../services/db.service';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container" *ngIf="post">
      <div class="top-bar">
        <div class="prompt">
          <span class="prompt-prefix">ajin@shell:~$</span>
          <span>cat {{ post.title || 'untitled.md' }}</span>
        </div>
        <div class="actions">
          <button class="btn btn-icon" (click)="goBack()">
            cd ..
          </button>
          <button class="btn btn-icon" (click)="editPost()">
            vi
          </button>
          <button class="btn btn-icon text-danger" (click)="deletePost()">
            rm
          </button>
        </div>
      </div>

      <div class="view-area glass-panel">
        <h1 class="title"># {{ post.title || 'untitled.md' }}</h1>
        <div class="meta">
          <span>Created: {{ post.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
          <span *ngIf="post.createdAt !== post.updatedAt"> | Modified: {{ post.updatedAt | date:'yyyy-MM-dd HH:mm' }}</span>
        </div>
        
        <div class="content markdown-content">
          <p>{{ post.content }}</p>
        </div>
        
        <div class="image-gallery" *ngIf="post.images && post.images.length > 0">
          <div class="prompt" style="margin-bottom: 16px;">
            <span class="prompt-prefix">ajin@shell:~/attachments$</span> eog *
          </div>
          <div class="grid">
            <div *ngFor="let img of post.images" class="img-wrapper glass-panel">
              <img [src]="img.data" [alt]="img.name">
              <div class="img-name">{{ img.name }}</div>
            </div>
          </div>
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
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }
    .prompt {
      font-family: var(--font-mono);
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .text-danger { color: var(--danger-color); border-color: var(--danger-color); }
    .text-danger:hover { background: var(--danger-color); color: var(--bg-color); }
    
    .view-area {
      padding: 40px;
      border-top: 3px solid var(--accent-color);
    }
    .title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--accent-color);
      font-family: var(--font-mono);
    }
    .meta {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px dashed var(--border-color);
      font-family: var(--font-mono);
    }
    .content {
      font-size: 1.1rem;
      line-height: 1.8;
      white-space: pre-wrap;
      margin-bottom: 40px;
      color: var(--text-primary);
    }
    
    .image-gallery {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px dashed var(--border-color);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .img-wrapper {
      background: var(--bg-color);
      border-radius: 4px;
      overflow: hidden;
    }
    .img-wrapper img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      border-bottom: 1px solid var(--border-color);
      transition: transform 0.3s ease;
    }
    .img-wrapper img:hover {
      transform: scale(1.02);
    }
    .img-name {
      padding: 8px;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class ViewComponent implements OnInit {
  post: Post | undefined;
  
  private db = inject(DbService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.post = await this.db.getPost(id);
      this.cdr.detectChanges();
      if (!this.post) {
        this.router.navigate(['/']);
      }
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  editPost() {
    if (this.post?.id) {
      this.router.navigate(['/edit', this.post.id]);
    }
  }

  async deletePost() {
    if (this.post?.id && confirm('Delete this file? (Y/n)')) {
      await this.db.deletePost(this.post.id);
      this.router.navigate(['/']);
    }
  }
}
