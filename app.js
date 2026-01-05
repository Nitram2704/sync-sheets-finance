// Configuration
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw-7bxJicml2RCfGd_gX5nWQKuuHppsG3tZxFUKqt-qf1hAeZwwbePL8VTYDhYWnfM5/exec';

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
const categoryList = document.getElementById('category-list');

// Stats Elements
const totalIngresosEl = document.getElementById('total-ingresos');
const totalEgresosEl = document.getElementById('total-egresos');
const budgetAmountEl = document.getElementById('budget-amount');
const budgetPercentEl = document.getElementById('budget-percent');
const budgetBarEl = document.getElementById('budget-bar');
const budgetStatusEl = document.getElementById('budget-status');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchDashboardData();
    setupEventListeners();
});

function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
}

// Helper for COP formatting
function formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

async function fetchCategories() {
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=getCategories`);
        const data = await response.json();
        if (data && !data.error) {
            categories = data;
        } else {
            showToast('Error al cargar categorías', 'error');
        }
        updateCategoryDropdown();
    } catch (error) {
        console.error('Error fetching categories:', error);
        showToast(`Error de conexión`, 'error');
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
            renderStats(data.totals, data.budget, data.month, data.categoryBreakdown);
        } else {
            recentList.innerHTML = '<p class="text-sm text-rose-500 text-center py-10">Error al cargar datos.</p>';
        }
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        recentList.innerHTML = '<p class="text-sm text-rose-500 text-center py-10">Error de conexión.</p>';
    }
}

function renderStats(totals, budget, month, categoryBreakdown) {
    if (!totals) {
        budgetStatusEl.textContent = '⚠️ Por favor, actualiza el código en Google Apps Script.';
        budgetStatusEl.className = 'text-[10px] text-amber-400 italic font-bold';
        return;
    }

    totalIngresosEl.textContent = formatCOP(totals.ingresos || 0);
    totalEgresosEl.textContent = formatCOP(totals.egresos || 0);

    // Render Budget
    if (budget > 0) {
        budgetAmountEl.textContent = formatCOP(budget);
        const percent = totals.egresos > 0 ? Math.min(100, (totals.egresos / budget) * 100) : 0;
        budgetPercentEl.textContent = `${Math.round(percent)}%`;
        budgetBarEl.style.width = `${percent}%`;

        if (percent > 90) {
            budgetBarEl.className = 'bg-gradient-to-r from-rose-500 to-rose-400 h-full transition-all duration-1000';
            budgetStatusEl.textContent = `¡Cuidado! Has usado el ${Math.round(percent)}% de tu presupuesto.`;
            budgetStatusEl.className = 'text-[10px] text-rose-400 italic font-bold';
        } else if (percent > 70) {
            budgetBarEl.className = 'bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-1000';
            budgetStatusEl.textContent = `Has usado el ${Math.round(percent)}% de tu presupuesto.`;
            budgetStatusEl.className = 'text-[10px] text-amber-400 italic';
        } else {
            budgetBarEl.className = 'bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-1000';
            budgetStatusEl.textContent = `Vas bien. Te quedan ${formatCOP(budget - totals.egresos)} para ${month}.`;
            budgetStatusEl.className = 'text-[10px] text-slate-500 italic';
        }
    } else {
        budgetAmountEl.textContent = '$0';
        budgetPercentEl.textContent = '0%';
        budgetBarEl.style.width = '0%';
        budgetStatusEl.textContent = 'Crea una pestaña "Presupuesto" con tu límite en A2.';
        budgetStatusEl.className = 'text-[10px] text-slate-600 italic';
    }

    // Render Category Breakdown
    renderCategoryBreakdown(categoryBreakdown, totals.egresos);
}

function renderCategoryBreakdown(breakdown, totalEgresos) {
    if (!breakdown || Object.keys(breakdown).length === 0) {
        categoryList.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-4">No hay gastos registrados este mes.</p>';
        return;
    }

    categoryList.innerHTML = '';
    const sortedCategories = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

    sortedCategories.forEach(([category, amount]) => {
        const percent = totalEgresos > 0 ? (amount / totalEgresos) * 100 : 0;
        const div = document.createElement('div');
        div.className = 'space-y-1.5';
        div.innerHTML = `
            <div class="flex justify-between items-end px-1">
                <p class="text-xs font-semibold text-slate-300">${category}</p>
                <p class="text-xs font-bold text-slate-100">${formatCOP(amount)} <span class="text-[10px] text-slate-500 font-normal ml-1">${Math.round(percent)}%</span></p>
            </div>
            <div class="w-full bg-slate-900/40 rounded-full h-1.5 overflow-hidden">
                <div class="bg-slate-700 h-full transition-all duration-1000" style="width: ${percent}%"></div>
            </div>
        `;
        categoryList.appendChild(div);
    });
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
                <p class="text-sm font-bold ${typeColor}">${symbol}${formatCOP(entry[3] || 0)}</p>
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

        const colorMap = {
            ingreso: 'from-emerald-500 to-teal-600',
            egreso: 'from-rose-500 to-pink-600',
            ahorro: 'from-amber-500 to-orange-600'
        };

        submitBtn.className = `w-full bg-gradient-to-r ${colorMap[tab]} hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-lg transition-all duration-300 transform active:scale-[0.98]`;
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
        setTimeout(() => switchTab('dashboard'), 1500);
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
    setTimeout(() => toast.classList.remove('toast-show'), 3000);
}

window.switchTab = switchTab;
