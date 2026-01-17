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
        const dateObj = new Date(item.updated);
        const dateStr = dateObj.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const timeAgo = Math.floor((new Date() - dateObj) / (1000 * 60 * 60)) + 'h ago';

        const div = document.createElement('div');
        div.className = `glass-panel rounded-xl overflow-hidden flex flex-col hover:shadow-neon hover:border-cyan-500/30 transition-all duration-500 group relative ${isRead ? 'opacity-60 grayscale-[0.5]' : ''}`;

        div.innerHTML = `
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="p-6 flex-grow flex flex-col">
                <div class="flex items-center justify-between mb-4 text-xs font-mono">
                    <span class="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">${item.source}</span>
                    <span class="text-slate-500">${timeAgo} <span class="opacity-30">|</span> ${dateStr}</span>
                </div>
                
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block mb-4 flex-grow" onclick="handleRead('${item.id}')">
                    <h2 class="text-lg font-bold text-slate-100 leading-snug group-hover:text-cyan-400 transition-colors">
                        ${item.title}
                    </h2>
                </a>

                <div class="text-sm text-slate-400 leading-relaxed space-y-2 border-l-2 border-slate-700 pl-3 mb-2">
                    ${formatSummary(item.summary)}
                </div>
            </div>

            <div class="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center text-xs font-mono uppercase tracking-wider">
                <button onclick="handleToggleSave('${item.id}')" class="flex items-center gap-2 transition-colors ${isSaved ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'}">
                    <svg class="w-4 h-4" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    ${isSaved ? 'SAVED' : 'SAVE'}
                </button>
                
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" onclick="handleRead('${item.id}')" class="flex items-center gap-1 text-slate-500 hover:text-white transition-colors group/link">
                    READ
                    <svg class="w-3 h-3 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </a>
            </div>
        `;
        return div;
    }

    function formatSummary(text) {
        if (!text) return '<span class="text-slate-600 italic animate-pulse">ANALYZING CONTENT...</span>';

        // Simple heuristic: if it contains bullets (・ or -), render nicely
        if (text.includes('・') || text.includes('- ')) {
            return text.split('\n').map(line => {
                line = line.trim();
                if (!line) return '';
                if (line.startsWith('・') || line.startsWith('-')) {
                    // Remove bullet and wrap
                    const content = line.replace(/^[・-]\s*/, '');
                    return `<div class="flex items-start gap-2"><span class="text-cyan-500 mt-1.5 text-[0.6rem]">▶</span><span>${content}</span></div>`;
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
