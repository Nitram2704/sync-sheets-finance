// Configuration
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwUNJCe5hTtvfq-ZMPHK0hDJP7VroXY3kZ_jVhCgPGTMhLTWFc6UoWMro22DWKXiZjK/exec';

// State
let categories = { ingresos: [], egresos: [], ahorro: [] };
let currentTab = 'dashboard';

// Elements
const form = document.getElementById('finance-form');
const dashboardView = document.getElementById('dashboard-view');
const formTypeInput = document.getElementById('form-type');
const categorySelect = document.getElementById('categoria');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const toastIcon = document.getElementById('toast-icon');
const sheetLink = document.getElementById('sheet-link');
const recentList = document.getElementById('recent-list');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchDashboardData();
    setupEventListeners();
});

function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
}

async function fetchCategories() {
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=getCategories`);
        const data = await response.json();
        if (data && !data.error) {
            categories = data;
            console.log('Categories loaded:', categories);
        } else {
            console.warn('Backend returned error or empty categories:', data?.error);
            showToast('Error al cargar categorías de la hoja', 'error');
        }
        updateCategoryDropdown();
    } catch (error) {
        console.error('Error fetching categories:', error);
        showToast(`Error de conexión: ${error.message}`, 'error');
    }
}

async function fetchDashboardData() {
    try {
        recentList.innerHTML = '<p class="text-sm text-slate-500 text-center py-10 italic">Actualizando...</p>';
        const response = await fetch(`${GAS_WEB_APP_URL}?action=getDashboard`);
        const data = await response.json();
        if (data && !data.error) {
            if (data.sheetUrl) sheetLink.href = data.sheetUrl;
            renderDashboard(data.recent);
        } else {
            recentList.innerHTML = '<p class="text-sm text-rose-500 text-center py-10">Error al cargar datos.</p>';
        }
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        recentList.innerHTML = '<p class="text-sm text-rose-500 text-center py-10">Error de conexión.</p>';
    }
}

function renderDashboard(recentData) {
    if (!recentData) return;
    recentList.innerHTML = '';

    const allEntries = [];
    Object.keys(recentData).forEach(tab => {
        recentData[tab].forEach(entry => {
            allEntries.push({ ...entry, tab: tab });
        });
    });

    // Sort by date (assuming first column is date)
    allEntries.sort((a, b) => new Date(b[0]) - new Date(a[0]));

    if (allEntries.length === 0) {
        recentList.innerHTML = '<p class="text-sm text-slate-500 text-center py-10">No hay registros recientes.</p>';
        return;
    }

    allEntries.slice(0, 10).forEach(entry => {
        const div = document.createElement('div');
        div.className = 'bg-slate-800/30 border border-slate-700/50 p-4 rounded-2xl flex justify-between items-center';

        const typeColor = entry.tab.includes('ingresos') ? 'text-emerald-400' : entry.tab.includes('egresos') ? 'text-rose-400' : 'text-amber-400';
        const symbol = entry.tab.includes('ingresos') ? '+' : '-';

        div.innerHTML = `
            <div>
                <p class="text-sm font-bold text-slate-200">${entry[2] || 'Sin categoría'}</p>
                <p class="text-[10px] text-slate-500 truncate max-w-[150px]">${entry[4] || ''}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold ${typeColor}">${symbol}$${parseFloat(entry[3] || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</p>
                <p class="text-[10px] text-slate-600 uppercase tracking-tighter">${entry[1] || ''}</p>
            </div>
        `;
        recentList.appendChild(div);
    });
}

function updateCategoryDropdown() {
    categorySelect.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
    const currentCategories = categories[currentTab === 'ingreso' ? 'ingresos' : currentTab === 'egreso' ? 'egresos' : 'ahorro'] || [];

    if (currentCategories.length === 0 && currentTab !== 'dashboard') {
        categorySelect.innerHTML = '<option value="" disabled selected>Sin categorías en la hoja</option>';
        return;
    }

    currentCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

function switchTab(tab) {
    currentTab = tab;

    // Update UI Tabs
    const tabs = ['dashboard', 'ingreso', 'egreso', 'ahorro'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            btn.className = `flex-none px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-300 ${t === tab ? `active-tab-${t === 'dashboard' ? 'ahorro' : t}` : 'text-slate-400'}`;
        }
    });

    if (tab === 'dashboard') {
        form.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        fetchDashboardData();
    } else {
        form.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        formTypeInput.value = tab;

        // Update Button Colors
        const colorMap = {
            ingreso: 'from-emerald-500 to-teal-600',
            egreso: 'from-rose-500 to-pink-600',
            ahorro: 'from-amber-500 to-orange-600'
        };

        submitBtn.className = `w-full bg-gradient-to-r ${colorMap[tab]} hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-lg transition-all duration-300 transform active:scale-[0.98]`;

        // Update ring color for focus
        const ringColor = tab === 'ingreso' ? 'focus:ring-emerald-500/50' : tab === 'egreso' ? 'focus:ring-rose-500/50' : 'focus:ring-amber-500/50';
        const inputs = [categorySelect, document.getElementById('valor'), document.getElementById('descripcion')];
        inputs.forEach(input => {
            input.className = input.className.replace(/focus:ring-\w+-\d+\/\d+/, ringColor);
        });

        updateCategoryDropdown();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtnOriginalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const now = new Date();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const data = {
        type: currentTab,
        fecha: now.toISOString().split('T')[0],
        mes: monthNames[now.getMonth()],
        categoria: categorySelect.value,
        valor: parseFloat(document.getElementById('valor').value),
        descripcion: document.getElementById('descripcion').value
    };

    try {
        await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        showToast('¡Registro exitoso!', 'success');
        form.reset();
        setTimeout(() => switchTab('dashboard'), 1500); // Return to dashboard after success
    } catch (error) {
        console.error('Error submitting form:', error);
        showToast('Error al guardar', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtnOriginalText;
    }
}

function showToast(message, type) {
    toastMsg.textContent = message;
    toastIcon.className = `w-6 h-6 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`;
    toastIcon.innerHTML = type === 'success' ? '✓' : '✕';

    toast.classList.add('toast-show');
    setTimeout(() => {
        toast.classList.remove('toast-show');
    }, 3000);
}

// Global exposure
window.switchTab = switchTab;
