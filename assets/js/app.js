document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('news-container');
    const loading = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    const tabs = document.querySelectorAll('.category-tab');
    const savedCountEl = document.getElementById('saved-count');
    const readLaterBtn = document.getElementById('btn-read-later');

    let allNews = [];
    let savedIds = JSON.parse(localStorage.getItem('savedIds') || '[]');
    let readIds = JSON.parse(localStorage.getItem('readIds') || '[]');
    let currentCategory = 'all';
    let showOnlySaved = false;

    // --- Core Logic ---

    function init() {
        updateSavedCount();
        fetchNews();
    }

    async function fetchNews() {
        try {
            const response = await fetch('data/news.json');
            if (!response.ok) throw new Error('ニュースの読み込みに失敗しました。');
            allNews = await response.json();

            // Initial Sort: Created date desc
            allNews.sort((a, b) => new Date(b.updated) - new Date(a.updated));

            loading.classList.add('hidden');
            container.classList.remove('hidden');
            renderNews();
        } catch (error) {
            console.error(error);
            loading.innerHTML = '<p class="text-red-500">ニュースの読み込みに失敗しました。</p>';
        }
    }

    function renderNews() {
        container.innerHTML = '';

        const filtered = allNews.filter(item => {
            if (showOnlySaved && !savedIds.includes(item.id)) return false;
            if (currentCategory === 'all') return true;
            // Fuzzy matching for categories or specific logic
            if (currentCategory === 'AI') return item.category === 'AI';
            if (currentCategory === 'Programming') return item.category === 'Programming';
            if (currentCategory === 'IT') return item.category === 'IT' || !['AI', 'Programming'].includes(item.category);
            return true;
        });

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        filtered.forEach(item => {
            const card = createCard(item);
            container.appendChild(card);
        });
    }

    function createCard(item) {
        const isSaved = savedIds.includes(item.id);
        const isRead = readIds.includes(item.id);
        const dateStr = new Date(item.updated).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = `bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300 group ${isRead ? 'opacity-70 bg-slate-50' : ''}`;

        div.innerHTML = `
            <div class="p-5 flex-grow">
                <div class="flex items-center justify-between mb-3 text-xs">
                    <span class="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">${item.source}</span>
                    <span class="text-slate-400">${dateStr}</span>
                </div>
                
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block mb-3" onclick="handleRead('${item.id}')">
                    <h2 class="text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        ${item.title}
                    </h2>
                </a>

                <div class="text-sm text-slate-600 leading-relaxed space-y-1">
                    ${formatSummary(item.summary)}
                </div>
            </div>

            <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm">
                <button onclick="handleToggleSave('${item.id}')" class="flex items-center gap-1.5 transition-colors ${isSaved ? 'text-amber-500 font-medium' : 'text-slate-500 hover:text-amber-500'}">
                    <svg class="w-5 h-5" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    ${isSaved ? '保存済み' : 'あとで読む'}
                </button>
                
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" onclick="handleRead('${item.id}')" class="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                    記事を読む
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
            </div>
        `;
        return div;
    }

    function formatSummary(text) {
        if (!text) return '<span class="text-slate-400 italic">要約を生成中...</span>';

        // Simple heuristic: if it contains bullets (・ or -), render nicely
        if (text.includes('・') || text.includes('- ')) {
            return text.split('\n').map(line => {
                line = line.trim();
                if (!line) return '';
                if (line.startsWith('・') || line.startsWith('-')) {
                    return `<div class="flex items-start gap-2"><span class="text-blue-400 mt-1.5 text-[0.6rem]">●</span><span>${line.replace(/^[・-]\s*/, '')}</span></div>`;
                }
                return `<p>${line}</p>`;
            }).join('');
        }
        return `<p>${text}</p>`;
    }

    // --- Global Exposed Handlers ---

    window.handleToggleSave = (id) => {
        if (savedIds.includes(id)) {
            savedIds = savedIds.filter(i => i !== id);
        } else {
            savedIds.push(id);
        }
        localStorage.setItem('savedIds', JSON.stringify(savedIds));
        updateSavedCount();
        renderNews(); // Re-render to update icon state
    };

    window.handleRead = (id) => {
        if (!readIds.includes(id)) {
            readIds.push(id);
            localStorage.setItem('readIds', JSON.stringify(readIds));
            // Optional: Visually mark as read immediately without full re-render
            // But re-render is safer for consistent state
            setTimeout(renderNews, 500); // Slight delay to let user see click feedback
        }
    };

    // --- Tab Switching ---

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Update UI
            tabs.forEach(t => {
                t.classList.remove('text-blue-600', 'border-blue-600');
                t.classList.add('text-slate-500', 'border-transparent');
            });
            e.target.classList.remove('text-slate-500', 'border-transparent');
            e.target.classList.add('text-blue-600', 'border-blue-600');

            // Update State
            currentCategory = e.target.dataset.category;
            showOnlySaved = false; // Reset filtered view when changing category
            renderNews();
        });
    });

    readLaterBtn.addEventListener('click', () => {
        showOnlySaved = !showOnlySaved;
        if (showOnlySaved) {
            // Deselect tabs visually
            tabs.forEach(t => {
                t.classList.remove('text-blue-600', 'border-blue-600');
                t.classList.add('text-slate-500', 'border-transparent');
            });
            readLaterBtn.classList.add('bg-blue-100', 'hover:bg-blue-200'); // Active state
            readLaterBtn.querySelector('span').classList.add('text-blue-700');
        } else {
            // Select "All" by default or whatever was last? Let's just reset to all
            currentCategory = 'all';
            const allTab = document.querySelector('[data-category="all"]');
            allTab.click(); // Trigger click logic to reset styles
            readLaterBtn.classList.remove('bg-blue-100', 'hover:bg-blue-200');
        }
        renderNews();
    });

    function updateSavedCount() {
        savedCountEl.textContent = savedIds.length;
        if (savedIds.length > 0) {
            savedCountEl.classList.remove('hidden');
        } else {
            savedCountEl.classList.add('hidden');
        }
    }

    // Initialize
    init();
});
