import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DbService, Post } from '../../services/db.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container">
      <div class="top-bar">
        <div class="prompt">
          <span class="prompt-prefix">ajin@shell:~$</span>
          <span>nano {{ post.title || 'untitled.md' }}</span>
        </div>
        <div class="actions">
          <button class="btn btn-icon" (click)="goBack()">
            [ESC] Cancel
          </button>
          <button class="btn btn-primary" (click)="savePost()">
            ^O WriteOut
          </button>
        </div>
      </div>

      <div class="editor-area glass-panel">
        <input 
          type="text" 
          class="title-input" 
          placeholder="Filename or Title..." 
          [(ngModel)]="post.title"
        >
        
        <textarea 
          class="content-input" 
          placeholder="Type your markdown or text here..."
          [(ngModel)]="post.content"
        ></textarea>
        
        <div class="attachments">
          <div class="prompt" style="margin-bottom: 12px;">
            <span class="prompt-prefix">ajin@shell:~/attachments$</span> ls -l
          </div>
          <div class="image-grid">
            <div *ngFor="let img of post.images; let i = index" class="image-preview glass-panel">
              <img [src]="img.data" [alt]="img.name">
              <div class="img-name">{{ img.name }}</div>
              <button class="btn-icon remove-btn" (click)="removeImage(i)">
                rm
              </button>
            </div>
            
            <label class="add-image-btn glass-panel">
              <input type="file" accept="image/*" multiple (change)="onFileSelected($event)" style="display:none">
              <span class="prompt-prefix">+</span>
              <span style="font-family: var(--font-mono); font-size: 0.9rem;">upload_file</span>
            </label>
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
    .actions { display: flex; gap: 8px; }
    
    .editor-area {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-height: 70vh;
      border-top: 3px solid var(--accent-color);
    }
    .title-input {
      background: transparent;
      border: none;
      color: var(--accent-color);
      font-size: 2rem;
      font-weight: 700;
      font-family: var(--font-mono);
      outline: none;
      border-bottom: 1px dashed transparent;
      padding-bottom: 8px;
    }
    .title-input:focus {
      border-bottom-color: var(--border-color);
    }
    .content-input {
      flex-grow: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 1.05rem;
      font-family: var(--font-sans);
      line-height: 1.6;
      resize: none;
      outline: none;
      min-height: 300px;
    }
    
    .attachments {
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px dashed var(--border-color);
    }
    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
    }
    .image-preview {
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--bg-color);
      border-radius: 4px;
      overflow: hidden;
    }
    .image-preview img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-bottom: 1px solid var(--border-color);
    }
    .img-name {
      padding: 4px 8px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .remove-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--bg-color);
      color: var(--danger-color);
      padding: 2px 6px;
      font-size: 0.8rem;
      border: 1px solid var(--danger-color);
    }
    
    .add-image-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 150px;
      cursor: pointer;
      color: var(--text-secondary);
      border: 1px dashed var(--border-color);
      background: transparent;
      transition: all 0.2s;
    }
    .add-image-btn:hover {
      background: var(--surface-color);
      color: var(--accent-color);
      border-color: var(--accent-color);
    }
  `]
})
export class EditorComponent implements OnInit {
  post: Post = { title: '', content: '', images: [], createdAt: 0, updatedAt: 0 };
  
  private db = inject(DbService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      const id = parseInt(idParam, 10);
      const existing = await this.db.getPost(id);
      if (existing) {
        this.post = existing;
        this.cdr.detectChanges();
      }
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.post.images.push({
            name: file.name,
            url: '',
            data: e.target.result
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage(index: number) {
    this.post.images.splice(index, 1);
  }

  async savePost() {
    await this.db.savePost(this.post);
    this.router.navigate(['/']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
