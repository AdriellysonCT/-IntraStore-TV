// IntraStore TV - Motor de Navegação Espacial por Zonas para Android TV
// Otimizado para Zero Lag (0ms) e precisão estrita de direções

class RemoteNavEngine {
  constructor() {
    this.currentFocusedElement = null;
    this.lastContentFocusedElement = null;
    this.currentZone = 'content'; // 'navrail' | 'content' | 'header' | 'modal'
    this.onBackHandler = null;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Suporte a mouse/cursor caso usado em PC
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[tabindex="0"], button:not([disabled]), a:not([disabled])');
      if (target && target !== this.currentFocusedElement && !target.closest('.hidden')) {
        this.setFocus(target, false);
      }
    });
  }

  handleKeyDown(e) {
    const key = e.key;
    const keyCode = e.keyCode;

    // Teclas D-Pad Android TV (Leanback) e Teclado
    // 38=Up, 40=Down, 37=Left, 39=Right, 13=Enter, 23=DPAD_CENTER, 27=Esc, 8=Backspace, 4=ANDROID_BACK
    const isUp = key === 'ArrowUp' || keyCode === 38 || keyCode === 19;
    const isDown = key === 'ArrowDown' || keyCode === 40 || keyCode === 20;
    const isLeft = key === 'ArrowLeft' || keyCode === 37 || keyCode === 21;
    const isRight = key === 'ArrowRight' || keyCode === 39 || keyCode === 22;
    const isEnter = key === 'Enter' || keyCode === 13 || keyCode === 23;
    const isBack = key === 'Escape' || key === 'Backspace' || keyCode === 27 || keyCode === 8 || keyCode === 4;

    if (isBack) {
      e.preventDefault();
      this.handleBack();
      return;
    }

    if (isEnter) {
      if (this.currentFocusedElement) {
        e.preventDefault();
        this.currentFocusedElement.click();
      }
      return;
    }

    if (isUp || isDown || isLeft || isRight) {
      e.preventDefault();
      let direction = '';
      if (isUp) direction = 'up';
      if (isDown) direction = 'down';
      if (isLeft) direction = 'left';
      if (isRight) direction = 'right';

      this.navigateDirection(direction);
    }
  }

  handleBack() {
    // 1. Se modal de Auto Update estiver aberto, fecha
    const updateModal = document.getElementById('tvUpdateModalOverlay');
    if (updateModal && !updateModal.classList.contains('hidden')) {
      const btnCancel = document.getElementById('btnCancelStoreUpdate');
      if (btnCancel) btnCancel.click();
      return;
    }

    // 2. Se modal de diálogo padrão estiver ativo, fecha
    const modalOverlay = document.getElementById('tvModalOverlay');
    if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
      const btnCancel = document.getElementById('tvModalBtnCancel');
      if (btnCancel) btnCancel.click();
      return;
    }

    // 3. Se estiver na tela de detalhes ou configurações, volta para home restaurando foco
    if (window.currentView && window.currentView !== 'home') {
      if (typeof window.navigateTo === 'function') {
        window.navigateTo('home');
      }
      return;
    }

    // 4. Se estiver na área de conteúdo da Home, passa o foco para a barra lateral
    if (this.currentZone === 'content') {
      this.focusNavRail();
      return;
    }

    // 5. Se já estiver na barra lateral, abre confirmação para sair
    if (typeof window.handleExitApp === 'function') {
      window.handleExitApp();
    }
  }

  detectZone(el) {
    if (!el) return 'content';
    if (el.closest('#tvUpdateModalOverlay') || el.closest('#tvModalOverlay') || el.closest('.tv-modal')) return 'modal';
    if (el.closest('#mainNavRail')) return 'navrail';
    if (el.closest('header')) return 'header';
    return 'content';
  }

  setFocus(el, scroll = true) {
    if (!el) return;

    if (this.currentFocusedElement) {
      this.currentFocusedElement.classList.remove('tv-focused');
      this.currentFocusedElement.blur();
    }

    this.currentFocusedElement = el;
    this.currentZone = this.detectZone(el);

    if (this.currentZone === 'content') {
      this.lastContentFocusedElement = el;
    }

    el.classList.add('tv-focused');
    el.focus();

    // Expande ou recolhe visualmente a barra lateral
    const navRail = document.getElementById('mainNavRail');
    if (navRail) {
      if (this.currentZone === 'navrail') {
        navRail.classList.add('nav-rail-active');
      } else {
        navRail.classList.remove('nav-rail-active');
      }
    }

    if (scroll) {
      // Rolagem com 'auto' instantâneo para eliminar lag de animações acumuladas na TV
      el.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  navigateDirection(direction) {
    if (!this.currentFocusedElement || !document.body.contains(this.currentFocusedElement)) {
      this.focusInitial();
      return;
    }

    const currentEl = this.currentFocusedElement;
    const currentZone = this.currentZone;

    if (currentZone === 'modal') {
      this.navigateInModal(currentEl, direction);
      return;
    }

    if (currentZone === 'navrail') {
      this.navigateInNavRail(currentEl, direction);
      return;
    }

    if (currentZone === 'content') {
      this.navigateInContent(currentEl, direction);
      return;
    }

    if (currentZone === 'header') {
      this.navigateInHeader(currentEl, direction);
      return;
    }
  }

  navigateInModal(currentEl, direction) {
    const modal = currentEl.closest('#tvUpdateModalOverlay, #tvModalOverlay');
    if (!modal) return;

    const buttons = Array.from(modal.querySelectorAll('button:not([disabled])')).filter(b => !b.closest('.hidden'));
    if (buttons.length <= 1) return;

    const currentIndex = buttons.indexOf(currentEl);
    if (direction === 'left' || direction === 'up') {
      if (currentIndex > 0) this.setFocus(buttons[currentIndex - 1], false);
    } else if (direction === 'right' || direction === 'down') {
      if (currentIndex < buttons.length - 1) this.setFocus(buttons[currentIndex + 1], false);
    }
  }

  navigateInNavRail(currentEl, direction) {
    const navButtons = Array.from(document.querySelectorAll('#mainNavRail button:not([disabled])')).filter(b => !b.closest('.hidden'));
    const currentIndex = navButtons.indexOf(currentEl);

    if (direction === 'up') {
      if (currentIndex > 0) {
        this.setFocus(navButtons[currentIndex - 1], false);
      }
    } else if (direction === 'down') {
      if (currentIndex < navButtons.length - 1) {
        this.setFocus(navButtons[currentIndex + 1], false);
      }
    } else if (direction === 'right') {
      this.focusContentFromNavRail();
    }
  }

  focusContentFromNavRail() {
    if (this.lastContentFocusedElement && document.body.contains(this.lastContentFocusedElement) && !this.lastContentFocusedElement.closest('.hidden')) {
      const rect = this.lastContentFocusedElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.setFocus(this.lastContentFocusedElement);
        return;
      }
    }

    const firstContentItem = document.querySelector('#viewHome:not(.hidden) .shelf-card, #viewDetails:not(.hidden) #btnActionApp, #viewSettings:not(.hidden) .btn-tv');
    if (firstContentItem) {
      this.setFocus(firstContentItem);
    }
  }

  focusNavRail() {
    const activeTab = document.querySelector('#mainNavRail .active-tab, #mainNavRail #navHome, #mainNavRail button');
    if (activeTab) {
      this.setFocus(activeTab, false);
    }
  }

  navigateInContent(currentEl, direction) {
    // Identificar a prateleira horizontal da linha
    const shelfRow = currentEl.closest('.shelf-row');

    if (shelfRow) {
      const items = Array.from(shelfRow.querySelectorAll('.shelf-card, button:not([disabled]), [tabindex="0"]:not([disabled])')).filter(el => !el.closest('.hidden'));
      const index = items.indexOf(currentEl);

      // MOVIMENTO HORIZONTAL (ESQUERDA / DIREITA)
      if (direction === 'left') {
        if (index > 0) {
          this.setFocus(items[index - 1]);
          return;
        } else {
          // Primeiro card da esquerda: passa intencionalmente para a barra lateral
          this.focusNavRail();
          return;
        }
      } else if (direction === 'right') {
        if (index < items.length - 1) {
          this.setFocus(items[index + 1]);
          return;
        }
        return; // Fim da linha
      }

      // MOVIMENTO VERTICAL (CIMA / BAIXO ENTRE PRATELEIRAS)
      if (direction === 'up' || direction === 'down') {
        this.navigateBetweenShelves(shelfRow, currentEl, direction);
        return;
      }
    }

    // Caso layout livre (ex: tela de detalhes ou configurações)
    this.navigateGeometrically(currentEl, direction);
  }

  navigateBetweenShelves(currentShelf, currentEl, direction) {
    // Selecionar rigorosamente todas as prateleiras da tela Home
    const allShelves = Array.from(document.querySelectorAll('#viewHome .shelf-row')).filter(s => {
      const rect = s.getBoundingClientRect();
      return rect.height > 0 && !s.closest('.hidden');
    });

    const currentShelfIndex = allShelves.indexOf(currentShelf);

    if (direction === 'up') {
      if (currentShelfIndex > 0) {
        const targetShelf = allShelves[currentShelfIndex - 1];
        this.findBestAlignedItemInShelf(targetShelf, currentEl);
      } else {
        // Se estiver no topo e apertar UP, foca nos controles do header
        const headerBtn = document.querySelector('header button[tabindex="0"]');
        if (headerBtn) this.setFocus(headerBtn, false);
      }
    } else if (direction === 'down') {
      if (currentShelfIndex < allShelves.length - 1) {
        const targetShelf = allShelves[currentShelfIndex + 1];
        this.findBestAlignedItemInShelf(targetShelf, currentEl);
      }
    }
  }

  findBestAlignedItemInShelf(targetShelf, currentEl) {
    const targetItems = Array.from(targetShelf.querySelectorAll('.shelf-card, button:not([disabled]), [tabindex="0"]:not([disabled])')).filter(el => !el.closest('.hidden'));
    if (targetItems.length === 0) return;

    const currentRect = currentEl.getBoundingClientRect();
    const currentX = currentRect.left + currentRect.width / 2;

    let closestItem = targetItems[0];
    let minDiff = Infinity;

    targetItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const itemX = itemRect.left + itemRect.width / 2;
      const diff = Math.abs(itemX - currentX);
      if (diff < minDiff) {
        minDiff = diff;
        closestItem = item;
      }
    });

    this.setFocus(closestItem);
  }

  navigateInHeader(currentEl, direction) {
    if (direction === 'down') {
      this.focusContentFromNavRail();
    } else if (direction === 'left') {
      const headerButtons = Array.from(document.querySelectorAll('header button[tabindex="0"]'));
      const idx = headerButtons.indexOf(currentEl);
      if (idx > 0) {
        this.setFocus(headerButtons[idx - 1], false);
      } else {
        this.focusNavRail();
      }
    } else if (direction === 'right') {
      const headerButtons = Array.from(document.querySelectorAll('header button[tabindex="0"]'));
      const idx = headerButtons.indexOf(currentEl);
      if (idx < headerButtons.length - 1) {
        this.setFocus(headerButtons[idx + 1], false);
      }
    }
  }

  navigateGeometrically(currentEl, direction) {
    const focusables = Array.from(document.querySelectorAll('[tabindex="0"]:not([disabled]), button:not([disabled])')).filter(el => {
      if (el.closest('#mainNavRail') || el.closest('#tvModalOverlay') || el.closest('#tvUpdateModalOverlay') || el.closest('.hidden')) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (focusables.length === 0) return;

    const currentRect = currentEl.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate = null;
    let shortestDistance = Infinity;

    focusables.forEach(candidate => {
      if (candidate === currentEl) return;

      const candRect = candidate.getBoundingClientRect();
      const candCenter = {
        x: candRect.left + candRect.width / 2,
        y: candRect.top + candRect.height / 2
      };

      const dx = candCenter.x - currentCenter.x;
      const dy = candCenter.y - currentCenter.y;

      let isCandidateInDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      switch (direction) {
        case 'up':
          if (dy < -10) {
            isCandidateInDirection = true;
            primaryDistance = Math.abs(dy);
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'down':
          if (dy > 10) {
            isCandidateInDirection = true;
            primaryDistance = Math.abs(dy);
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'left':
          if (dx < -10) {
            isCandidateInDirection = true;
            primaryDistance = Math.abs(dx);
            secondaryDistance = Math.abs(dy);
          }
          break;
        case 'right':
          if (dx > 10) {
            isCandidateInDirection = true;
            primaryDistance = Math.abs(dx);
            secondaryDistance = Math.abs(dy);
          }
          break;
      }

      if (isCandidateInDirection) {
        const distance = primaryDistance + (secondaryDistance * 1.5);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          bestCandidate = candidate;
        }
      }
    });

    if (bestCandidate) {
      this.setFocus(bestCandidate);
    } else if (direction === 'left') {
      this.focusNavRail();
    }
  }

  focusInitial() {
    const firstItem = document.querySelector('#heroCarouselContainer .shelf-card, .shelf-card, #mainNavRail #navHome, button[tabindex="0"]');
    if (firstItem) {
      this.setFocus(firstItem);
    }
  }
}

window.remoteNav = new RemoteNavEngine();
