import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DbService, Post, SyncAction, DiffEntry } from '../../services/db.service';
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
        
        <div class="sync-banner glass-panel" *ngIf="db.isLocal && pendingActions.length > 0" (click)="openDiffModal()" style="cursor: pointer;">
          <div style="flex-grow: 1;">
            <span class="prompt-prefix" style="color: var(--danger-color)">[!] MUDANCAS PENDENTES</span>
            <p style="font-size: 0.9rem; margin-top: 4px; color: var(--text-secondary);">
              Commit: <strong style="color: var(--text-primary);">{{ getCommitMessage() }}</strong>
              <span style="margin-left: 12px; color: var(--accent-color);">[clique para revisar diff]</span>
            </p>
          </div>
          <div style="display: flex; gap: 8px;" (click)="$event.stopPropagation()">
            <button class="btn btn-icon" (click)="openDiffModal()" title="Ver alteracoes">
              &gt; Diff
            </button>
            <button class="btn btn-icon" (click)="discardChanges()" [disabled]="isSyncing" title="Descartar alteracoes pendentes">
              x Descartar
            </button>
            <button class="btn btn-primary" style="background: var(--accent-color); border-color: var(--accent-color); color: #0f111a;" (click)="syncChanges()" [disabled]="isSyncing">
              {{ isSyncing ? '[...] Processando' : '> Aprovar e Enviar' }}
            </button>
          </div>
        </div>

        <!-- MODAL DE DIFF -->
        <div class="diff-overlay" *ngIf="showDiffModal" (click)="closeDiffModal()">
          <div class="diff-modal glass-panel" (click)="$event.stopPropagation()">
            <div class="diff-header">
              <div>
                <h2 style="margin: 0; color: var(--accent-color); font-family: var(--font-mono);">git diff --staged</h2>
                <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 0.85rem;">Commit: <strong>{{ getCommitMessage() }}</strong></p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-icon" (click)="discardChanges(); closeDiffModal()" [disabled]="isSyncing">
                  x Descartar
                </button>
                <button class="btn btn-primary" style="background: var(--accent-color); border-color: var(--accent-color); color: #0f111a;" (click)="syncChanges(); closeDiffModal()" [disabled]="isSyncing">
                  {{ isSyncing ? '[...] Processando' : '> Aprovar e Push' }}
                </button>
                <button class="btn btn-icon" (click)="closeDiffModal()">
                  [ESC]
                </button>
              </div>
            </div>

            <div class="diff-body">
              <div *ngIf="diffEntries.length === 0" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <p>Nenhuma alteração detectada no conteúdo.</p>
                <p style="font-size: 0.85rem;">(O snapshot inicial pode não existir ainda. Após o primeiro push, os diffs aparecerão.)</p>
              </div>

              <div *ngFor="let diff of diffEntries" class="diff-entry">
                <div class="diff-file-header">
                  <span class="diff-badge" [ngClass]="diff.type">
                    {{ diff.type === 'added' ? '+' : diff.type === 'deleted' ? '-' : '~' }}
                  </span>
                  <span class="diff-filename">{{ diff.title || 'untitled.md' }}</span>
                  <span class="diff-type-label" [ngClass]="diff.type">
                    {{ diff.type === 'added' ? 'novo' : diff.type === 'deleted' ? 'deletado' : 'modificado' }}
                  </span>
                </div>

                <!-- ADDED -->
                <div *ngIf="diff.type === 'added'" class="diff-content">
                  <div *ngFor="let line of getLines(diff.newContent)" class="diff-line added">
                    <span class="diff-sign">+</span><span>{{ line }}</span>
                  </div>
                </div>

                <!-- DELETED -->
                <div *ngIf="diff.type === 'deleted'" class="diff-content">
                  <div *ngFor="let line of getLines(diff.oldContent)" class="diff-line deleted">
                    <span class="diff-sign">-</span><span>{{ line }}</span>
                  </div>
                </div>

                <!-- MODIFIED -->
                <div *ngIf="diff.type === 'modified'" class="diff-content">
                  <div *ngIf="diff.oldTitle !== diff.newTitle" class="diff-line deleted">
                    <span class="diff-sign">-</span><span>Título: {{ diff.oldTitle }}</span>
                  </div>
                  <div *ngIf="diff.oldTitle !== diff.newTitle" class="diff-line added">
                    <span class="diff-sign">+</span><span>Título: {{ diff.newTitle }}</span>
                  </div>
                  <div *ngFor="let line of getDiffLines(diff.oldContent, diff.newContent)" 
                       class="diff-line" [ngClass]="line.type">
                    <span class="diff-sign">{{ line.sign }}</span><span>{{ line.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    
    .sync-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      margin-top: -8px;
      margin-bottom: 8px;
      border: 1px solid var(--danger-color);
      border-left: 4px solid var(--danger-color);
      background: rgba(255, 82, 82, 0.05);
      transition: background 0.2s;
    }
    .sync-banner:hover {
      background: rgba(255, 82, 82, 0.1);
    }

    /* --- DIFF MODAL --- */
    .diff-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .diff-modal {
      width: 90vw;
      max-width: 900px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--accent-color);
      border-top: 3px solid var(--accent-color);
      overflow: hidden;
    }
    .diff-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    .diff-body {
      overflow-y: auto;
      padding: 16px 20px;
      flex-grow: 1;
    }
    .diff-entry {
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      overflow: hidden;
    }
    .diff-file-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
      font-family: var(--font-mono);
      font-size: 0.9rem;
    }
    .diff-badge {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      font-weight: bold;
      font-size: 0.85rem;
    }
    .diff-badge.added { background: rgba(63, 185, 80, 0.2); color: #3fb950; }
    .diff-badge.deleted { background: rgba(248, 81, 73, 0.2); color: #f85149; }
    .diff-badge.modified { background: rgba(210, 153, 34, 0.2); color: #d29922; }
    .diff-filename { color: var(--text-primary); font-weight: 600; }
    .diff-type-label {
      margin-left: auto;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 3px;
    }
    .diff-type-label.added { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
    .diff-type-label.deleted { background: rgba(248, 81, 73, 0.15); color: #f85149; }
    .diff-type-label.modified { background: rgba(210, 153, 34, 0.15); color: #d29922; }
    .diff-content {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .diff-line {
      padding: 1px 12px;
      white-space: pre-wrap;
      word-break: break-word;
      display: flex;
    }
    .diff-line.added { background: rgba(63, 185, 80, 0.1); color: #3fb950; }
    .diff-line.deleted { background: rgba(248, 81, 73, 0.1); color: #f85149; }
    .diff-line.unchanged { color: var(--text-secondary); }
    .diff-sign {
      width: 20px;
      flex-shrink: 0;
      user-select: none;
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
  pendingActions: SyncAction[] = [];
  isSyncing = false;
  showDiffModal = false;
  diffEntries: DiffEntry[] = [];
  
  public db = inject(DbService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    await this.loadPosts();
    await this.loadPendingActions();
    // Cria snapshot inicial se nao existir (para que o diff funcione corretamente)
    if (this.db.isLocal && this.db.getSnapshot().length === 0) {
      await this.db.saveSnapshot();
    }
  }

  async loadPendingActions() {
    this.pendingActions = await this.db.getPendingActions();
    // Se tem pendencias mas nenhum diff real, limpa dados antigos
    if (this.pendingActions.length > 0) {
      const diffs = await this.db.computeDiff();
      if (diffs.length === 0) {
        await this.db.clearPendingActions();
        this.pendingActions = [];
      }
    }
    this.cdr.detectChanges();
  }

  async syncChanges() {
    if (this.pendingActions.length === 0) return;
    this.isSyncing = true;
    this.cdr.detectChanges();
    try {
      await this.db.syncToGit(this.pendingActions);
    } catch (e) {
      // Erro ja tratado no servico
    } finally {
      // Garante que SEMPRE limpa as pendencias apos tentativa de sync
      await this.db.clearPendingActions();
      this.pendingActions = [];
      this.isSyncing = false;
      this.cdr.detectChanges();
    }
  }

  getCommitMessage(): string {
    const hasPost = this.pendingActions.includes('post');
    const hasUpdate = this.pendingActions.includes('update');
    const hasDelete = this.pendingActions.includes('delete');

    if (hasPost && hasUpdate && hasDelete) return 'post, update e delete';
    if (hasPost && hasUpdate) return 'post e update';
    if (hasPost && hasDelete) return 'post e delete';
    if (hasUpdate && hasDelete) return 'update e delete';
    if (hasPost) return 'post';
    if (hasUpdate) return 'update';
    if (hasDelete) return 'deletando post';
    return 'sincronização';
  }

  async discardChanges() {
    if (confirm('Tem certeza? As mudanças locais NÃO serão enviadas ao GitHub.')) {
      await this.db.clearPendingActions();
      this.pendingActions = [];
      this.cdr.detectChanges();
    }
  }

  async openDiffModal() {
    this.diffEntries = await this.db.computeDiff();
    this.showDiffModal = true;
    this.cdr.detectChanges();
  }

  closeDiffModal() {
    this.showDiffModal = false;
    this.cdr.detectChanges();
  }

  getLines(content?: string): string[] {
    if (!content) return ['(vazio)'];
    return content.split('\n');
  }

  getDiffLines(oldContent?: string, newContent?: string): { type: string; sign: string; text: string }[] {
    const oldLines = (oldContent || '').split('\n');
    const newLines = (newContent || '').split('\n');
    const result: { type: string; sign: string; text: string }[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : undefined;
      const newLine = i < newLines.length ? newLines[i] : undefined;

      if (oldLine === newLine) {
        result.push({ type: 'unchanged', sign: ' ', text: oldLine || '' });
      } else {
        if (oldLine !== undefined) {
          result.push({ type: 'deleted', sign: '-', text: oldLine });
        }
        if (newLine !== undefined) {
          result.push({ type: 'added', sign: '+', text: newLine });
        }
      }
    }
    return result;
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
