// IntraStore TV - Admin Hub Controller
let currentApps = [];
let currentViewMode = 'table'; // 'table' ou 'grid'

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadApps();
  checkR2Status();
  setupEventListeners();
  setupDropzoneAndPreviews();
});


let currentImageSearchTarget = 'icon'; // 'icon' ou 'banner'

// Função para Resetar completamente o Formulário de Novo App (evita que dados antigos fiquem salvos)
function resetNewAppForm() {
  const form = document.getElementById('formNewApp');
  if (form) form.reset();

  const previewIcon = document.getElementById('previewIcon');
  const previewBanner = document.getElementById('previewBanner');
  if (previewIcon) previewIcon.src = '/uploads/icons/default-icon.svg';
  if (previewBanner) previewBanner.src = '/uploads/icons/default-icon.svg';

  const labelIcon = document.getElementById('labelIconStatus');
  const labelBanner = document.getElementById('labelBannerStatus');
  const labelScreenshots = document.getElementById('labelScreenshotsStatus');
  if (labelIcon) labelIcon.textContent = 'Nenhum arquivo selecionado';
  if (labelBanner) labelBanner.textContent = 'Nenhum arquivo selecionado';
  if (labelScreenshots) {
    labelScreenshots.textContent = 'Nenhuma captura selecionada';
    labelScreenshots.className = 'text-[11px] text-gray-500';
  }

  const badgeIcon = document.getElementById('badgeIconSource');
  const badgeBanner = document.getElementById('badgeBannerSource');
  if (badgeIcon) {
    badgeIcon.textContent = 'Padrão';
    badgeIcon.className = 'text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-gray-400 border border-zinc-700';
  }
  if (badgeBanner) {
    badgeBanner.textContent = 'Padrão';
    badgeBanner.className = 'text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-gray-400 border border-zinc-700';
  }

  const inputIconExt = document.getElementById('inputIconExternalUrl');
  const inputBannerExt = document.getElementById('inputBannerExternalUrl');
  if (inputIconExt) inputIconExt.value = '';
  if (inputBannerExt) inputBannerExt.value = '';

  const inputIcon = document.getElementById('inputIconFile');
  const inputBanner = document.getElementById('inputBannerFile');
  const inputScreenshots = document.getElementById('inputScreenshotsFile');
  const inputApk = document.getElementById('inputApkFile');
  if (inputIcon) inputIcon.value = '';
  if (inputBanner) inputBanner.value = '';
  if (inputScreenshots) inputScreenshots.value = '';
  if (inputApk) inputApk.value = '';

  const dropText = document.getElementById('apkDropText');
  const fileInfo = document.getElementById('apkFileInfo');
  if (dropText) dropText.innerHTML = '<span class="font-bold text-white">Clique para selecionar</span> ou arraste o arquivo APK aqui';
  if (fileInfo) fileInfo.textContent = 'Suporta arquivos de até 500MB (.apk)';

  const dropzone = document.getElementById('apkDropzone');
  if (dropzone) dropzone.classList.remove('border-emerald-500', 'bg-emerald-500/10');

  const progressContainer = document.getElementById('uploadProgressContainer');
  if (progressContainer) progressContainer.classList.add('hidden');
}

// Abrir Seletor de Imagens Online usando o Nome do App
function openImageSearchModal(targetType) {
  currentImageSearchTarget = targetType;
  const modal = document.getElementById('modalImageSearch');
  const title = document.getElementById('imageSearchModalTitle');
  const subtitle = document.getElementById('imageSearchModalSubtitle');
  const queryInput = document.getElementById('inputImageSearchQuery');
  const nameInput = document.querySelector('input[name="name"]');

  const currentAppName = nameInput ? nameInput.value.trim() : '';

  if (targetType === 'icon') {
    title.textContent = 'Buscar Ícone do App na Web';
    subtitle.textContent = 'Escolha um ícone quadrado de alta resolução para o aplicativo';
  } else {
    title.textContent = 'Buscar Capa / Banner Hero na Web';
    subtitle.textContent = 'Escolha um banner 16:9 de destaque para a tela da TV';
  }

  queryInput.value = currentAppName || 'Android TV App';
  openModal(modal);
  executeImageSearch();
}

// Executar busca de imagens na API do backend
async function executeImageSearch() {
  const queryInput = document.getElementById('inputImageSearchQuery');
  const container = document.getElementById('imageSearchResultsContainer');
  const statusCount = document.getElementById('imageSearchStatusCount');
  const query = queryInput.value.trim();

  if (!query) {
    container.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400 text-xs">Digite um termo para pesquisar.</div>';
    return;
  }

  container.innerHTML = `
    <div class="col-span-full py-12 flex flex-col items-center justify-center gap-3 text-brand-cyan">
      <span class="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
      <span class="text-xs text-gray-300 font-semibold">Buscando imagens online para "${escapeHtml(query)}"...</span>
    </div>
  `;
  statusCount.textContent = 'Pesquisando na web...';

  try {
    const res = await fetch('/api/search-images?q=' + encodeURIComponent(query) + '&type=' + currentImageSearchTarget);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      container.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400 text-xs">Nenhuma imagem encontrada. Tente outro termo de busca.</div>';
      statusCount.textContent = '0 imagens encontradas.';
      return;
    }

    statusCount.textContent = data.results.length + ' imagens encontradas. Clique para selecionar.';

    container.innerHTML = data.results.map((item, idx) => {
      const isBanner = currentImageSearchTarget === 'banner';
      const aspectClass = isBanner ? 'aspect-video' : 'aspect-square';
      return `
        <div onclick="selectOnlineImage('${encodeURIComponent(item.url)}', '${encodeURIComponent(item.thumbnail)}', '${encodeURIComponent(item.title)}')"
          class="group cursor-pointer rounded-2xl overflow-hidden border border-brand-border hover:border-brand-cyan bg-brand-surface p-1.5 transition-all hover:scale-105 hover:shadow-xl flex flex-col justify-between">
          <div class="w-full ${aspectClass} rounded-xl overflow-hidden bg-black/60 relative">
            <img src="${item.thumbnail}" alt="${escapeHtml(item.title)}" loading="lazy" class="w-full h-full object-cover group-hover:opacity-90 transition-opacity" onerror="this.src='/uploads/icons/default-icon.svg'">
            <div class="absolute inset-0 bg-brand-cyan/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span class="material-symbols-outlined text-white text-2xl drop-shadow-md">check_circle</span>
            </div>
          </div>
          <div class="text-[10px] text-gray-400 truncate px-1 pt-1.5 group-hover:text-white" title="${escapeHtml(item.title)}">
            ${escapeHtml(item.title)}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<div class="col-span-full py-10 text-center text-red-400 text-xs">Erro ao buscar imagens: ' + escapeHtml(err.message) + '</div>';
    statusCount.textContent = 'Falha na busca.';
  }
}

// Aplicar a imagem selecionada ao formulário
window.selectOnlineImage = function(encUrl, encThumb, encTitle) {
  const url = decodeURIComponent(encUrl);
  const thumb = decodeURIComponent(encThumb);
  const title = decodeURIComponent(encTitle);

  if (currentImageSearchTarget === 'icon') {
    document.getElementById('previewIcon').src = thumb || url;
    document.getElementById('inputIconExternalUrl').value = url;
    document.getElementById('inputIconFile').value = '';
    document.getElementById('labelIconStatus').textContent = 'Web: ' + (title.length > 25 ? title.slice(0, 25) + '...' : title);
    const badge = document.getElementById('badgeIconSource');
    badge.textContent = 'Web Online';
    badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-brand-cyan border border-cyan-500/40';
  } else {
    document.getElementById('previewBanner').src = thumb || url;
    document.getElementById('inputBannerExternalUrl').value = url;
    document.getElementById('inputBannerFile').value = '';
    document.getElementById('labelBannerStatus').textContent = 'Web: ' + (title.length > 25 ? title.slice(0, 25) + '...' : title);
    const badge = document.getElementById('badgeBannerSource');
    badge.textContent = 'Web Online';
    badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40';
  }

  closeModal(document.getElementById('modalImageSearch'));
  showToast('Imagem selecionada da web com sucesso!', 'success', 2500);
};

// Utilitários Universais para Abertura e Fechamento Suave de Modais
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
  requestAnimationFrame(() => {
    modalEl.classList.add('active');
  });
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('active');
  setTimeout(() => {
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');
  }, 260);
}

// Sistema Moderno de Toast Notifications (Substitui os alerts nativos)
function showToast(message, type = 'success', duration = 4200) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-animate-in pointer-events-auto p-4 rounded-2xl glass-panel flex flex-col gap-2.5 shadow-2xl border transition-all duration-300 overflow-hidden';
  
  let iconName = 'check_circle';
  let iconColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  let borderColor = 'border-emerald-500/40';
  let barColor = 'bg-emerald-400';

  if (type === 'error') {
    iconName = 'error';
    iconColor = 'text-red-400 bg-red-500/15 border-red-500/30';
    borderColor = 'border-red-500/40';
    barColor = 'bg-red-400';
  } else if (type === 'warning') {
    iconName = 'warning';
    iconColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    borderColor = 'border-amber-500/40';
    barColor = 'bg-amber-400';
  } else if (type === 'info') {
    iconName = 'info';
    iconColor = 'text-brand-cyan bg-cyan-500/15 border-cyan-500/30';
    borderColor = 'border-cyan-500/40';
    barColor = 'bg-brand-cyan';
  }

  toast.classList.add(borderColor);
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconColor}">
        <span class="material-symbols-outlined text-xl">${iconName}</span>
      </div>
      <div class="text-xs font-semibold text-white flex-1 leading-snug">${escapeHtml(message)}</div>
      <button class="btn-close-toast text-gray-400 hover:text-white p-1 rounded-lg transition-colors">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
    <div class="w-full bg-white/10 h-0.5 rounded-full overflow-hidden">
      <div class="h-full ${barColor} toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
    </div>
  `;

  // Fechar no clique
  const closeBtn = toast.querySelector('.btn-close-toast');
  const dismiss = () => {
    toast.classList.remove('toast-animate-in');
    toast.classList.add('toast-animate-out');
    setTimeout(() => toast.remove(), 250);
  };
  closeBtn.addEventListener('click', dismiss);

  container.appendChild(toast);

  // Saída automática sincronizada
  setTimeout(() => {
    if (toast.isConnected) dismiss();
  }, duration);
}

// Modal de Confirmação Moderno (Substitui confirm nativo)
function showConfirm(title, message, confirmText = 'Confirmar', isDanger = true) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalConfirmDialog');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const btnExecute = document.getElementById('btnExecuteConfirm');
    const btnCancel = document.getElementById('btnCancelConfirm');
    const iconWrapper = document.getElementById('confirmIconWrapper');
    const icon = document.getElementById('confirmIcon');

    titleEl.textContent = title;
    messageEl.textContent = message;
    btnExecute.textContent = confirmText;

    if (isDanger) {
      btnExecute.className = 'px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg transition-all';
      iconWrapper.className = 'w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0';
      icon.textContent = 'delete_forever';
    } else {
      btnExecute.className = 'px-6 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-black text-sm font-bold shadow-lg transition-all';
      iconWrapper.className = 'w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-brand-cyan flex-shrink-0';
      icon.textContent = 'help';
    }

    openModal(modal);

    function cleanup() {
      closeModal(modal);
      btnExecute.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    btnExecute.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
  });
}

function setupEventListeners() {
  const modalNewApp = document.getElementById('modalNewApp');
  const modalUpdateApp = document.getElementById('modalUpdateApp');

  // Copiar link curto direto do APK
  const btnCopyShortLink = document.getElementById('btnCopyShortLink');
  if (btnCopyShortLink) {
    btnCopyShortLink.addEventListener('click', () => {
      const code = 'tinyurl.com/intrastore-v11';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          showToast('Código copiado: tinyurl.com/intrastore-v11 (pronto para o app Downloader da TV)', 'info', 4500);
        }).catch(() => {
          prompt('Copie o link direto para a TV:', code);
        });
      } else {
        prompt('Copie o link direto para a TV:', code);
      }
    });
  }

  document.getElementById('btnOpenNewAppModal').addEventListener('click', () => {
    resetNewAppForm();
    openModal(modalNewApp);
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(modalNewApp);
      closeModal(modalUpdateApp);
    });
  });

  // Fechar ao clicar no fundo escuro do modal (backdrop)
  [modalNewApp, modalUpdateApp, document.getElementById('modalConfirmDialog'), document.getElementById('modalImageSearch')].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) closeModal(m);
      });
    }
  });

  // Fechar com a tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(modalNewApp);
      closeModal(modalUpdateApp);
      closeModal(document.getElementById('modalConfirmDialog'));
      closeModal(document.getElementById('modalImageSearch'));
    }
  });

  document.getElementById('btnRefresh').addEventListener('click', () => {
    loadStats();
    loadApps();
    checkR2Status();
    showToast('Catálogo sincronizado com o Cloudflare R2!', 'info', 2500);
  });

  document.getElementById('categoryFilter').addEventListener('change', filterAndRender);
  document.getElementById('searchInput').addEventListener('input', filterAndRender);

  // Alternar Modos de Visualização
  document.getElementById('btnViewTable').addEventListener('click', () => {
    currentViewMode = 'table';
    document.getElementById('btnViewTable').className = 'p-1.5 rounded-lg bg-brand-purple text-white transition-all';
    document.getElementById('btnViewGrid').className = 'p-1.5 rounded-lg text-gray-400 hover:text-white transition-all';
    document.getElementById('tableViewWrapper').classList.remove('hidden');
    document.getElementById('gridViewWrapper').classList.add('hidden');
    filterAndRender();
  });

  document.getElementById('btnViewGrid').addEventListener('click', () => {
    currentViewMode = 'grid';
    document.getElementById('btnViewGrid').className = 'p-1.5 rounded-lg bg-brand-purple text-white transition-all';
    document.getElementById('btnViewTable').className = 'p-1.5 rounded-lg text-gray-400 hover:text-white transition-all';
    document.getElementById('tableViewWrapper').classList.add('hidden');
    document.getElementById('gridViewWrapper').classList.remove('hidden');
    filterAndRender();
  });

  // Validação e Envio de Novo App com Feedback Imediato
  const formNewApp = document.getElementById('formNewApp');
  const btnSubmitNewApp = document.getElementById('btnSubmitNewApp');

  function handleNewAppSubmit() {
    const apkInput = document.getElementById('inputApkFile');
    const nameInput = formNewApp.querySelector('input[name="name"]');
    const packageInput = formNewApp.querySelector('input[name="packageName"]');

    // 1. Validar APK
    if (!apkInput.files || apkInput.files.length === 0) {
      showToast('Por favor, selecione ou arraste o arquivo APK (.apk) do aplicativo.', 'warning');
      const dropzone = document.getElementById('apkDropzone');
      if (dropzone) {
        dropzone.classList.add('border-amber-500', 'bg-amber-500/15');
        dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2. Validar Package Name
    const packageVal = packageInput ? packageInput.value.trim() : '';
    if (!packageVal) {
      showToast('Por favor, informe o Package Name (ex: com.exemplo.tv).', 'warning');
      if (packageInput) {
        packageInput.focus();
        packageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 3. Validar Nome
    const nameVal = nameInput ? nameInput.value.trim() : '';
    if (!nameVal) {
      showToast('Por favor, informe o Nome do aplicativo na TV.', 'warning');
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Formulário válido: Dispara o envio com barra de progresso
    const formData = new FormData(formNewApp);
    submitAppWithProgress(formData);
  }

  if (formNewApp) {
    formNewApp.addEventListener('submit', (e) => {
      e.preventDefault();
      handleNewAppSubmit();
    });
  }

  if (btnSubmitNewApp) {
    btnSubmitNewApp.addEventListener('click', (e) => {
      e.preventDefault();
      handleNewAppSubmit();
    });
  }

  // Envio de Atualização
  document.getElementById('formUpdateApp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitUpdate');
    const appId = document.getElementById('updateAppId').value;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Gravando no R2...';

    try {
      const formData = new FormData(e.target);
      const res = await fetch('/api/apps/' + appId, {
        method: 'PUT',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar.');

      closeModal(modalUpdateApp);
      loadStats();
      loadApps();
      showToast('Nova versão disponibilizada com sucesso no Cloudflare R2!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-lg">publish</span> Publicar Atualização';
    }
  });
}

// Drag & Drop e Previews de Imagem
function setupDropzoneAndPreviews() {
  const dropzone = document.getElementById('apkDropzone');
  const inputApk = document.getElementById('inputApkFile');
  const dropText = document.getElementById('apkDropText');
  const fileInfo = document.getElementById('apkFileInfo');

  dropzone.addEventListener('click', () => inputApk.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      inputApk.files = e.dataTransfer.files;
      updateApkDisplay(e.dataTransfer.files[0]);
    }
  });

  inputApk.addEventListener('change', () => {
    if (inputApk.files.length > 0) {
      updateApkDisplay(inputApk.files[0]);
    }
  });

  function updateApkDisplay(file) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    dropText.innerHTML = '<span class="text-brand-cyan font-bold">' + escapeHtml(file.name) + '</span>';
    fileInfo.textContent = sizeMb + ' MB • Pronto para envio ao Cloudflare R2';
    dropzone.classList.add('border-emerald-500', 'bg-emerald-500/10');
  }

  // Controles do Ícone
  const inputIcon = document.getElementById('inputIconFile');
  const previewIcon = document.getElementById('previewIcon');
  const labelIcon = document.getElementById('labelIconStatus');
  const badgeIcon = document.getElementById('badgeIconSource');

  document.getElementById('btnChooseLocalIcon').addEventListener('click', () => inputIcon.click());
  document.getElementById('btnSearchOnlineIcon').addEventListener('click', () => openImageSearchModal('icon'));

  inputIcon.addEventListener('change', () => {
    if (inputIcon.files.length > 0) {
      const f = inputIcon.files[0];
      previewIcon.src = URL.createObjectURL(f);
      labelIcon.textContent = f.name + ' (' + (f.size / 1024).toFixed(0) + ' KB)';
      badgeIcon.textContent = 'Arquivo PC';
      badgeIcon.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      document.getElementById('inputIconExternalUrl').value = '';
    }
  });

  // Controles do Banner
  const inputBanner = document.getElementById('inputBannerFile');
  const previewBanner = document.getElementById('previewBanner');
  const labelBanner = document.getElementById('labelBannerStatus');
  const badgeBanner = document.getElementById('badgeBannerSource');

  document.getElementById('btnChooseLocalBanner').addEventListener('click', () => inputBanner.click());
  document.getElementById('btnSearchOnlineBanner').addEventListener('click', () => openImageSearchModal('banner'));

  inputBanner.addEventListener('change', () => {
    if (inputBanner.files.length > 0) {
      const f = inputBanner.files[0];
      previewBanner.src = URL.createObjectURL(f);
      labelBanner.textContent = f.name + ' (' + (f.size / 1024).toFixed(0) + ' KB)';
      badgeBanner.textContent = 'Arquivo PC';
      badgeBanner.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      document.getElementById('inputBannerExternalUrl').value = '';
    }
  });

  // Screenshots
  const inputScreenshots = document.getElementById('inputScreenshotsFile');
  const labelScreenshots = document.getElementById('labelScreenshotsStatus');
  inputScreenshots.addEventListener('change', () => {
    const c = inputScreenshots.files.length;
    if (c > 0) {
      labelScreenshots.textContent = c + ' captura(s) selecionada(s)';
      labelScreenshots.className = 'text-[11px] text-brand-cyan font-semibold';
    } else {
      labelScreenshots.textContent = 'Nenhuma captura selecionada';
      labelScreenshots.className = 'text-[11px] text-gray-500';
    }
  });

  // Controles do Modal de Busca de Imagens
  const modalImg = document.getElementById('modalImageSearch');
  document.getElementById('btnCloseImageSearch').addEventListener('click', () => closeModal(modalImg));
  document.getElementById('btnCancelImageSearch').addEventListener('click', () => closeModal(modalImg));
  document.getElementById('btnExecuteImageSearch').addEventListener('click', () => executeImageSearch());
  document.getElementById('inputImageSearchQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeImageSearch();
    }
  });
}

// Upload com Barra de Progresso Real via XMLHttpRequest
function submitAppWithProgress(formData) {
  const btn = document.getElementById('btnSubmitNewApp');
  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressFill = document.getElementById('uploadProgressFill');
  const progressPercent = document.getElementById('uploadProgressPercent');
  const progressStatus = document.getElementById('uploadProgressStatus');

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Enviando APK...';
  progressContainer.classList.remove('hidden');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/apps', true);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = percent + '%';
      progressPercent.textContent = percent + '%';
      if (percent >= 100) {
        progressStatus.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Sincronizando com Cloudflare R2...';
      }
    }
  };

  xhr.onload = () => {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-lg">cloud_upload</span> Publicar no Cloudflare R2';
    progressContainer.classList.add('hidden');

    if (xhr.status >= 200 && xhr.status < 300) {
      resetNewAppForm();
      closeModal(document.getElementById('modalNewApp'));
      loadStats();
      loadApps();
      showToast('Aplicativo publicado com sucesso e disponível para a comunidade!', 'success');
    } else {
      try {
        const res = JSON.parse(xhr.responseText);
        showToast('Erro: ' + (res.error || 'Falha ao salvar aplicativo.'), 'error');
      } catch (err) {
        showToast('Erro no envio do aplicativo: ' + xhr.statusText, 'error');
      }
    }
  };

  xhr.onerror = () => {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-lg">cloud_upload</span> Publicar no Cloudflare R2';
    progressContainer.classList.add('hidden');
    showToast('Erro de conexão durante o envio do arquivo.', 'error');
  };

  xhr.send(formData);
}

// Carregar Estatísticas
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const stats = await res.json();
    document.getElementById('statTotalApps').textContent = stats.totalApps;
    document.getElementById('statTotalDownloads').textContent = stats.totalDownloads;
    document.getElementById('statFeaturedCount').textContent = stats.featuredCount;
  } catch (err) {
    console.error('Erro carregando stats:', err);
  }
}

// Checar Status do Cloudflare R2
async function checkR2Status() {
  try {
    const res = await fetch('/api/r2/status');
    const data = await res.json();
    const badge = document.getElementById('r2StatusBadge');
    if (data.test && data.test.success) {
      badge.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('R2 status offline:', err);
  }
}

// Carregar Apps
async function loadApps() {
  const tbody = document.getElementById('appsTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-gray-500">Carregando catálogo...</td></tr>';

  try {
    const res = await fetch('/api/apps');
    currentApps = await res.json();
    filterAndRender();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-red-400">Erro: ' + err.message + '</td></tr>';
  }
}

function filterAndRender() {
  const category = document.getElementById('categoryFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  let filtered = [...currentApps];

  if (category !== 'Todos') {
    filtered = filtered.filter(a => a.category === category);
  }

  if (search) {
    filtered = filtered.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.packageName.toLowerCase().includes(search) ||
      (a.developer && a.developer.toLowerCase().includes(search))
    );
  }

  document.getElementById('appsCountBadge').textContent = filtered.length;

  if (currentViewMode === 'table') {
    renderTable(filtered);
  } else {
    renderGrid(filtered);
  }
}

function renderTable(apps) {
  const tbody = document.getElementById('appsTableBody');
  if (apps.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-16 text-center text-gray-400">
          <div class="w-16 h-16 rounded-3xl bg-brand-surface border border-brand-border mx-auto flex items-center justify-center text-brand-cyan mb-3 shadow-lg">
            <span class="material-symbols-outlined text-3xl">inventory_2</span>
          </div>
          <div class="text-base font-display font-bold text-white">Nenhum aplicativo publicado ainda</div>
          <p class="text-xs text-gray-400 max-w-md mx-auto mt-1 mb-4">
            Seu catálogo está limpo e pronto! Clique no botão abaixo para enviar o primeiro APK para sua comunidade.
          </p>
          <button onclick="document.getElementById('btnOpenNewAppModal').click()" class="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-600 text-white text-xs font-semibold shadow-lg glow-purple transition-all inline-flex items-center gap-2">
            <span class="material-symbols-outlined text-base">add_circle</span>
            <span>Publicar Primeiro App</span>
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = apps.map(app => {
    const iconSrc = app.iconUrl || '/uploads/icons/default-icon.svg';
    const isR2 = app.apkUrl && app.apkUrl.includes('r2.dev');
    const isFeaturedBadge = app.isFeatured 
      ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max"><span class="material-symbols-outlined text-xs">star</span> Hero</span>'
      : '<span class="text-xs text-gray-500">Padrão</span>';

    return `
      <tr class="hover:bg-brand-surface/40 transition-colors">
        <td class="py-4 px-5">
          <div class="flex items-center gap-3.5">
            <img src="${iconSrc}" class="w-11 h-11 rounded-2xl object-cover border border-brand-border bg-brand-surface" onerror="this.src='/uploads/icons/default-icon.svg'">
            <div>
              <div class="font-bold text-white text-sm flex items-center gap-2">
                <span>${escapeHtml(app.name)}</span>
                ${isR2 ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono" title="Hospedado no Cloudflare R2">R2</span>' : ''}
              </div>
              <div class="text-xs text-gray-400 mt-0.5">${escapeHtml(app.developer || 'Comunidade')}</div>
            </div>
          </div>
        </td>
        <td class="py-4 px-4 font-mono text-xs text-gray-300">${escapeHtml(app.packageName)}</td>
        <td class="py-4 px-4">
          <span class="px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-xs text-gray-300 font-medium">${escapeHtml(app.category)}</span>
        </td>
        <td class="py-4 px-4">
          <div class="text-xs text-white font-semibold">v${escapeHtml(app.versionName)}</div>
          <div class="text-[11px] text-gray-500 font-mono">code: ${app.versionCode} • ${app.sizeMb}MB</div>
        </td>
        <td class="py-4 px-4">${isFeaturedBadge}</td>
        <td class="py-4 px-4 font-bold text-white text-sm">${app.downloads || 0}</td>
        <td class="py-4 px-5 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="openUpdateModal('${app.id}')" class="px-3 py-1.5 rounded-xl bg-brand-cyan/10 hover:bg-brand-cyan text-brand-cyan hover:text-black text-xs font-bold border border-brand-cyan/30 transition-all flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">upgrade</span>
              <span>Atualizar</span>
            </button>
            <button onclick="deleteApp('${app.id}', '${escapeHtml(app.name)}')" class="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all" title="Excluir">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderGrid(apps) {
  const grid = document.getElementById('gridViewWrapper');
  if (apps.length === 0) {
    grid.innerHTML = '<div class="col-span-4 py-12 text-center text-gray-500">Nenhum aplicativo encontrado.</div>';
    return;
  }

  grid.innerHTML = apps.map(app => {
    const banner = app.bannerUrl || app.iconUrl || '/uploads/icons/default-icon.svg';
    return `
      <div class="glass-panel rounded-2xl overflow-hidden border border-brand-border flex flex-col justify-between hover:border-brand-cyan/40 transition-all">
        <div class="h-32 w-full relative bg-brand-surface overflow-hidden">
          <img src="${banner}" class="w-full h-full object-cover opacity-70" onerror="this.src='/uploads/icons/default-icon.svg'">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-between items-start">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-surface/80 border border-brand-border text-brand-cyan font-bold font-mono">v${app.versionName}</span>
            ${app.isFeatured ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/80 text-black font-bold">HERO</span>' : ''}
          </div>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <h4 class="font-display font-bold text-white text-base truncate">${escapeHtml(app.name)}</h4>
            <p class="text-xs text-gray-400 truncate">${escapeHtml(app.packageName)}</p>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-brand-border">
            <span>${app.sizeMb}MB</span>
            <span class="text-brand-cyan font-bold">${app.downloads || 0} downloads</span>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <button onclick="openUpdateModal('${app.id}')" class="flex-1 py-1.5 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-black text-xs font-bold border border-brand-cyan/30 transition-all">
              Atualizar
            </button>
            <button onclick="deleteApp('${app.id}', '${escapeHtml(app.name)}')" class="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openUpdateModal = function(appId) {
  const app = currentApps.find(a => a.id === appId);
  if (!app) return;

  document.getElementById('updateAppId').value = app.id;
  document.getElementById('updateAppName').textContent = app.name;
  document.getElementById('updateAppPackage').textContent = app.packageName;
  document.getElementById('updateAppCurrentVersion').textContent = 'Versão Atual: v' + app.versionName + ' (code: ' + app.versionCode + ')';
  document.getElementById('updateAppIcon').src = app.iconUrl || '/uploads/icons/default-icon.svg';
  
  document.getElementById('updateVersionCode').value = (Number(app.versionCode) || 1) + 1;
  document.getElementById('updateVersionName').value = app.versionName;
  document.getElementById('updateChangelog').value = 'Correções e melhorias de desempenho.';

  const modal = document.getElementById('modalUpdateApp');
  openModal(modal);
};

window.deleteApp = async function(appId, appName) {
  const confirmed = await showConfirm(
    'Excluir Aplicativo',
    'Deseja realmente remover "' + appName + '" do catálogo? Esta ação não pode ser desfeita.',
    'Sim, Excluir',
    true
  );

  if (!confirmed) return;

  try {
    const res = await fetch('/api/apps/' + appId, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');

    showToast('Aplicativo "' + appName + '" removido com sucesso!', 'info');
    loadStats();
    loadApps();
  } catch (err) {
    showToast('Erro ao remover: ' + err.message, 'error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
