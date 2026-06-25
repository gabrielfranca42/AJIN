import { Directive, ElementRef, AfterViewInit, Input } from '@angular/core';
import { animate, stagger } from 'animejs';

@Directive({
  selector: '[appTypewriter]',
  standalone: true
})
export class TypewriterDirective implements AfterViewInit {
  @Input() delayOffset: number = 0;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const element = this.el.nativeElement as HTMLElement;
    
    const textSpans: HTMLElement[] = [];

    // Função recursiva para transformar nós de texto em spans individuais sem quebrar o HTML
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        // Ignorar nós apenas com espaços/quebras de linha se não houver texto real
        if (!text.trim() && text.length > 0) return; 
        
        const fragment = document.createDocumentFragment();
        const chars = text.split('');
        
        chars.forEach(char => {
          const span = document.createElement('span');
          span.textContent = char; // Usar textContent preserva o espaço real e permite word-wrap
          span.style.opacity = '0';
          span.style.fontFamily = 'var(--font-mono, monospace)';
          textSpans.push(span);
          fragment.appendChild(span);
        });
        
        node.parentNode?.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Não processar elementos script ou style
        const elName = (node as HTMLElement).tagName.toLowerCase();
        if (elName === 'script' || elName === 'style') return;
        
        // Cópia estática dos filhos pois vamos modificar a árvore do DOM
        const childNodes = Array.from(node.childNodes);
        childNodes.forEach(child => processNode(child));
      }
    };

    // Atrasar levemente para garantir que o Angular vinculou os dados no HTML
    setTimeout(() => {
      processNode(element);

      if (textSpans.length === 0) return;

      element.classList.add('typing-active');

      // Estratégia de Velocidade Seletiva:
      // Textos curtos = Digitação normal/lenta
      // Textos longos = Digitação extremamente rápida
      let charDelay = 25; // Velocidade padrão
      if (textSpans.length > 800) {
        charDelay = 1; // Para blogs gigantes, quase instantâneo
      } else if (textSpans.length > 300) {
        charDelay = 5; // Textos médios/grandes, muito rápido
      } else if (textSpans.length > 50) {
        charDelay = 15; // Textos médios (como os resumos da home)
      } else {
        charDelay = 35; // Textos curtos (como comandos e títulos), mais devagar e legível
      }

      animate(textSpans, {
        opacity: [0, 1],
        duration: 10,
        easing: 'linear',
        delay: stagger(charDelay, { start: this.delayOffset }), 
        complete: () => {
          element.classList.remove('typing-active');
        }
      });
    }, 50);
  }
}
