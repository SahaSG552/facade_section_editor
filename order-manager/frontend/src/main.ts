import './styles.css';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

type Role = {
  id: string;
  code: string;
  name: string;
  menus: string[];
  panels: string[];
  permissions: string[];
};

type User = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: Role | null;
  isBlocked: boolean;
  deletedAt: string | null;
};

type Customer = { id: string; name: string; email: string | null };
type Order = {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  status: string;
  status_code?: string;
  created_at: string;
  order_kind?: string;
};
type Material = {
  id: string;
  code: string;
  name: string;
  thickness?: string | null;
  cost_per_sqm?: string | null;
  in_stock?: string | null;
};
type Design = { id: string; code: string; name: string };
type Ban = { id: string; kind: 'email' | 'username'; value: string; reason: string | null };
type Paged<T> = { data: T[]; total: number; page: number; limit: number };

type DbMenuItem = {
  key: string;
  label: string;
  icon: string;
  isDefault?: boolean;
};

type GridRow = {
  idx: number;
  manualNumber: string;
  elementType: string;
  height: number;
  width: number;
  quantity: number;
  materialCode: string;
  designCode: string;
  edging: string;
  decor: string;
  modification: string;
  attachments: string;
  previewUrl: string;
};

const API_BASE = 'http://127.0.0.1:3000/api/v1';
const TOKEN_KEY = 'om_token';
const ACTIVE_MENU_KEY = 'om_active_menu';
const SIDEBAR_COLLAPSED_KEY = 'om_sidebar_collapsed';
const DB_MENU_EXPANDED_KEY = 'om_db_expanded';
const DB_MENU_ITEMS_KEY = 'om_db_menu_items';

const DEFAULT_DB_ITEMS: DbMenuItem[] = [
  { key: 'db:materials', label: 'Материалы', icon: 'MT', isDefault: true },
  { key: 'db:cutters', label: 'Фрезы', icon: 'FR', isDefault: true },
  { key: 'db:designs', label: 'Дизайны', icon: 'DZ', isDefault: true },
  { key: 'db:edgings', label: 'Обкатки', icon: 'OB', isDefault: true },
  { key: 'db:decors', label: 'Декоры', icon: 'DC', isDefault: true },
  { key: 'db:moldings', label: 'Погонаж', icon: 'PG', isDefault: true },
];

const MENU_META: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Дашборд', icon: 'DB' },
  customers: { label: 'Клиенты', icon: 'CL' },
  orders: { label: 'Заказы', icon: 'OR' },
  db: { label: 'БД', icon: 'BD' },
  users: { label: 'Пользователи', icon: 'US' },
  roles: { label: 'Роли', icon: 'RL' },
  bans: { label: 'Ban List', icon: 'BN' },
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

let token: string | null = localStorage.getItem(TOKEN_KEY);
let currentUser: User | null = null;
let activeMenu = localStorage.getItem(ACTIVE_MENU_KEY) || 'dashboard';
let sidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
let dbExpanded = localStorage.getItem(DB_MENU_EXPANDED_KEY) !== '0';
let dbMenuItems: DbMenuItem[] = loadDbMenuItems();
let editingOrderId: string | null = null;
let editingOrderNumber = '';
let gridRows: GridRow[] = [];
let previewRowIndex = 0;
let isPreviewVisible = true;
let editorSplitRatio = 68;
let orderSheet: jspreadsheet.WorksheetInstance | null = null;

function loadDbMenuItems() {
  const raw = localStorage.getItem(DB_MENU_ITEMS_KEY);
  if (!raw) return [...DEFAULT_DB_ITEMS];
  try {
    const parsed = JSON.parse(raw) as DbMenuItem[];
    if (!Array.isArray(parsed)) return [...DEFAULT_DB_ITEMS];
    const merged = [...DEFAULT_DB_ITEMS];
    parsed.forEach((item) => {
      if (!merged.find((x) => x.key === item.key)) merged.push(item);
    });
    return merged;
  } catch {
    return [...DEFAULT_DB_ITEMS];
  }
}

function saveDbMenuItems() {
  localStorage.setItem(DB_MENU_ITEMS_KEY, JSON.stringify(dbMenuItems));
}

function statusHtml(message: string, isError = false) {
  return `<div class="status${isError ? ' error' : ''}">${message}</div>`;
}

function parseCsv(input: string) {
  return input.split(',').map((x) => x.trim()).filter(Boolean);
}

function isAdmin() {
  return currentUser?.role?.code === 'admin';
}

function isClient() {
  return currentUser?.role?.code === 'client';
}

function getAllowedMenus() {
  const roleMenus = new Set(currentUser?.role?.menus || []);
  const menus = new Set<string>(['dashboard', 'orders']);
  if (roleMenus.has('customers') || isAdmin()) menus.add('customers');
  if (roleMenus.has('materials') || roleMenus.has('designs') || isAdmin()) menus.add('db');
  if (isAdmin()) {
    menus.add('users');
    menus.add('roles');
    menus.add('bans');
  }
  return Array.from(menus);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

const loadMe = () => api<{ user: User }>('/auth/me');
const loadCustomers = () => api<Paged<Customer>>('/customers');
const loadOrders = () => api<Paged<Order>>('/orders');
const loadMaterials = () => api<Paged<Material>>('/materials?page=1&limit=500');
const loadDesigns = () => api<Paged<Design>>('/designs?page=1&limit=500');
const loadUsers = () => api<{ data: User[] }>('/users');
const loadRoles = () => api<{ data: Role[] }>('/roles');
const loadBans = () => api<{ data: Ban[] }>('/bans');

function renderLogin(message = '') {
  app.innerHTML = `
    <main class="layout auth-layout">
      <section class="panel auth-card">
        <h1>Order Manager Access</h1>
        <p>Вход в систему и регистрация новых пользователей (без роли).</p>
        ${message ? statusHtml(message, true) : ''}
        <div class="grid two-col">
          <form id="loginForm" class="grid single-col">
            <h2>Вход</h2>
            <label>Логин или email<input id="login" required value="admin" /></label>
            <label>Пароль<input id="password" type="password" required value="admin123" /></label>
            <button class="btn" type="submit">Войти</button>
          </form>
          <form id="registerForm" class="grid single-col">
            <h2>Регистрация</h2>
            <label>Username<input id="regUsername" required /></label>
            <label>Email<input id="regEmail" required type="email" /></label>
            <label>Пароль<input id="regPassword" required type="password" /></label>
            <label>Имя<input id="regDisplayName" /></label>
            <button class="btn btn-secondary" type="submit">Зарегистрироваться</button>
          </form>
        </div>
      </section>
    </main>
  `;

  document.querySelector<HTMLFormElement>('#loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const login = (document.querySelector<HTMLInputElement>('#login')?.value || '').trim();
    const password = document.querySelector<HTMLInputElement>('#password')?.value || '';
    try {
      const result = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });
      token = result.token;
      currentUser = result.user;
      localStorage.setItem(TOKEN_KEY, token);
      activeMenu = 'dashboard';
      localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
      await renderApp('Успешный вход');
    } catch (error) {
      renderLogin(`Ошибка входа: ${(error as Error).message}`);
    }
  });

  document.querySelector<HTMLFormElement>('#registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = (document.querySelector<HTMLInputElement>('#regUsername')?.value || '').trim();
    const email = (document.querySelector<HTMLInputElement>('#regEmail')?.value || '').trim();
    const password = document.querySelector<HTMLInputElement>('#regPassword')?.value || '';
    const displayName = (document.querySelector<HTMLInputElement>('#regDisplayName')?.value || '').trim();

    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, displayName }),
      });
      renderLogin('Регистрация успешна. Ожидайте назначения роли администратором.');
    } catch (error) {
      renderLogin(`Ошибка регистрации: ${(error as Error).message}`);
    }
  });
}

function renderSidebar(allowedMenus: string[]) {
  const topButtons = allowedMenus
    .filter((menu) => menu !== 'db')
    .map((menu) => {
      const meta = MENU_META[menu] || { label: menu, icon: '::' };
      const active = activeMenu === menu ? 'active' : '';
      return `<button class="menu-item ${active}" title="${meta.label}" data-menu="${menu}"><span class="menu-icon">${meta.icon}</span>${sidebarCollapsed ? '' : `<span class="menu-label">${meta.label}</span>`}</button>`;
    })
    .join('');

  const dbBlock = allowedMenus.includes('db')
    ? `
    <div class="db-menu-block">
      <button class="menu-item ${activeMenu.startsWith('db:') ? 'active' : ''}" data-menu="db" id="dbMenuToggle" title="БД">
        <span class="menu-icon">${MENU_META.db.icon}</span>
        ${sidebarCollapsed ? '' : `<span class="menu-label">${MENU_META.db.label}</span><span class="menu-caret">${dbExpanded ? '-' : '+'}</span>`}
      </button>
      ${dbExpanded ? `<div class="db-submenu ${sidebarCollapsed ? 'icons-only' : ''}">
        ${dbMenuItems.map((item) => `<button class="submenu-item ${activeMenu === item.key ? 'active' : ''}" title="${item.label}" data-menu="${item.key}"><span class="menu-icon">${item.icon}</span>${sidebarCollapsed ? '' : `<span class="menu-label">${item.label}</span>`}${isAdmin() && !item.isDefault && !sidebarCollapsed ? `<span class="submenu-remove" data-remove-db-key="${item.key}">x</span>` : ''}</button>`).join('')}
        ${isAdmin() ? `<button class="submenu-item add" id="addDbItemBtn" type="button"><span class="menu-icon">+</span>${sidebarCollapsed ? '' : '<span class="menu-label">Добавить пункт</span>'}</button>` : ''}
      </div>` : ''}
    </div>`
    : '';

  return `
    <aside class="sidebar panel ${sidebarCollapsed ? 'collapsed' : ''}">
      <div class="sidebar-top">
        ${sidebarCollapsed ? '' : '<h2>Меню</h2>'}
        <button class="collapse-btn" id="toggleSidebarBtn" type="button" title="Свернуть/развернуть">${sidebarCollapsed ? '>>' : '<<'}</button>
      </div>
      <nav class="sidebar-nav">${topButtons}${dbBlock}</nav>
    </aside>
  `;
}

function renderDashboard(customers: Paged<Customer>, orders: Paged<Order>, materials: Paged<Material>) {
  return `<section class="panel"><h2>Дашборд</h2><div class="stats-grid"><div class="stat-card"><div class="stat-title">Клиенты</div><div class="stat-value">${customers.total}</div></div><div class="stat-card"><div class="stat-title">Заказы</div><div class="stat-value">${orders.total}</div></div><div class="stat-card"><div class="stat-title">Материалы</div><div class="stat-value">${materials.total}</div></div></div></section>`;
}

function renderCustomers(customers: Paged<Customer>) {
  return `<section class="panel"><h2>Клиенты</h2><form id="customerForm" class="grid"><label>Название<input id="customerName" required /></label><label>Email<input id="customerEmail" type="email" /></label><button class="btn" type="submit">Создать клиента</button></form><div class="table-wrap"><table><thead><tr><th>Название</th><th>Email</th></tr></thead><tbody>${customers.data.map((c) => `<tr><td>${c.name}</td><td>${c.email ?? ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderOrders(orders: Paged<Order>, customers: Paged<Customer>) {
  const clientMode = isClient();
  return `<section class="panel"><h2>Заказы</h2><div class="header-actions" style="margin-bottom:12px;"><button class="btn" id="createOrderBtn" type="button">Создать новый заказ</button></div>${!clientMode ? `<form id="orderForm" class="grid"><label>Клиент<select id="orderCustomer" required>${customers.data.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select></label><label>Тип элемента<input id="itemType" value="facade" required /></label><label>Ширина<input id="itemWidth" type="number" min="1" value="800" required /></label><label>Высота<input id="itemHeight" type="number" min="1" value="600" required /></label><label>Кол-во<input id="itemQty" type="number" min="1" value="1" required /></label><button class="btn" type="submit">Создать заказ с позицией</button></form>` : ''}<div class="table-wrap"><table><thead><tr><th>№</th><th>Номер заказа</th>${clientMode ? '' : '<th>Клиент</th>'}<th>Статус</th><th>Дата</th><th>Ред.</th><th>Коп.</th><th>Удал.</th></tr></thead><tbody>${orders.data.map((o, idx) => `<tr><td>${idx + 1}</td><td>${o.order_number}</td>${clientMode ? '' : `<td>${o.customer_name}</td>`}<td>${o.status_code || o.status}</td><td>${new Date(o.created_at).toLocaleString('ru-RU')}</td><td><button class="btn small btn-secondary editOrderBtn" data-order-id="${o.id}" type="button">Ред.</button></td><td><button class="btn small btn-secondary copyOrderBtn" data-order-id="${o.id}" type="button">Коп.</button></td><td><button class="btn small danger deleteOrderBtn" data-order-id="${o.id}" type="button">Удал.</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderDbMaterials(materials: Paged<Material>) {
  return `<section class="panel"><h2>БД: Материалы</h2><div class="table-wrap"><table><thead><tr><th>Code</th><th>Название</th><th>Толщина</th><th>Цена за м2</th><th>Остаток</th></tr></thead><tbody>${materials.data.map((m) => `<tr><td>${m.code}</td><td>${m.name}</td><td>${m.thickness ?? ''}</td><td>${m.cost_per_sqm ?? ''}</td><td>${m.in_stock ?? ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderDbDesigns(designs: Paged<Design>) {
  return `<section class="panel"><h2>БД: Дизайны</h2><div class="table-wrap"><table><thead><tr><th>Code</th><th>Название</th></tr></thead><tbody>${designs.data.map((d) => `<tr><td>${d.code || '-'}</td><td>${d.name}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderDbPlaceholder(title: string) {
  return `<section class="panel"><h2>БД: ${title}</h2><p>Раздел готов к наполнению и кастомизации администратором.</p></section>`;
}

function renderUsers(users: User[], roles: Role[]) {
  return `<section class="panel"><h2>Пользователи</h2><div class="table-wrap"><table><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${users.map((u) => `<tr><td>${u.username}</td><td>${u.email}</td><td>${u.role?.code || 'none'}</td><td>${u.deletedAt ? 'deleted' : u.isBlocked ? 'blocked' : 'active'}</td><td><div class="row-actions"><select class="assignRole" data-user-id="${u.id}"><option value="">-- role --</option>${roles.map((r) => `<option value="${r.id}" ${u.role?.id === r.id ? 'selected' : ''}>${r.code}</option>`).join('')}</select><button class="btn small assignBtn" data-user-id="${u.id}" type="button">Назначить</button><button class="btn small btn-secondary blockBtn" data-user-id="${u.id}" type="button">Блок</button><button class="btn small btn-secondary unblockBtn" data-user-id="${u.id}" type="button">Разблок</button><button class="btn small danger deleteBtn" data-user-id="${u.id}" type="button">Удалить</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderRoles(roles: Role[]) {
  return `<section class="panel"><h2>Роли</h2><form id="newRoleForm" class="grid"><label>Код роли<input id="newRoleCode" placeholder="designer" /></label><label>Название роли<input id="newRoleName" placeholder="Designer" /></label><label>Меню (через запятую)<input id="newRoleMenus" placeholder="dashboard,orders,db" /></label><label>Панели (через запятую)<input id="newRolePanels" placeholder="ordersTable" /></label><button class="btn" type="submit">Создать роль</button></form><form id="roleForm" class="grid"><label>Роль<select id="roleSelect">${roles.map((r) => `<option value="${r.id}">${r.code}</option>`).join('')}</select></label><label>Название<input id="roleName" /></label><label>Меню (через запятую)<input id="roleMenus" /></label><label>Панели (через запятую)<input id="rolePanels" /></label><button class="btn" type="submit">Сохранить роль</button></form></section>`;
}

function renderBans(bans: Ban[]) {
  return `<section class="panel"><h2>Ban List</h2><form id="banForm" class="grid"><label>Тип<select id="banKind"><option value="email">email</option><option value="username">username</option></select></label><label>Значение<input id="banValue" required /></label><label>Причина<input id="banReason" /></label><button class="btn" type="submit">Добавить в ban list</button></form><div class="table-wrap"><table><thead><tr><th>Type</th><th>Value</th><th>Reason</th><th>Action</th></tr></thead><tbody>${bans.map((b) => `<tr><td>${b.kind}</td><td>${b.value}</td><td>${b.reason || ''}</td><td><button class="btn small btn-secondary removeBanBtn" data-ban-id="${b.id}" type="button">Убрать</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderOrderEditor() {
  const row = gridRows[Math.max(0, Math.min(previewRowIndex, gridRows.length - 1))];
  return `<section class="panel"><div class="header-actions" style="margin-bottom:12px;justify-content:space-between;"><h2>Заказ ${editingOrderNumber}</h2><div class="header-actions"><button type="button" id="editorBackBtn" class="btn btn-secondary">К списку</button><button type="button" id="editorShowPreviewBtn" class="btn btn-secondary${isPreviewVisible ? ' is-active' : ''}">Превью</button><button type="button" id="editorSaveBtn" class="btn">Сохранить</button></div></div><div class="editor-split${isPreviewVisible ? '' : ' preview-hidden'}" id="editorSplit" style="--editor-main-width:${editorSplitRatio}%"><div class="editor-grid-stack"><div class="order-grid" id="orderGrid"></div><div class="editor-grid-tools"><button type="button" id="editorAddRowBottomBtn" class="btn btn-secondary">+</button><button type="button" id="editorCopyLastRowBtn" class="btn btn-secondary">Copy</button><button type="button" id="editorDeleteRowBtn" class="btn btn-secondary">Del</button></div></div><div class="editor-divider${isPreviewVisible ? '' : ' is-hidden'}" id="editorDivider" role="separator" aria-orientation="vertical" aria-label="Resize preview"></div><aside class="panel preview-panel${isPreviewVisible ? '' : ' is-hidden'}" id="editorPreviewPanel"><h3>Превью</h3><div id="editorPreviewBody">${row ? `<div><strong>Строка:</strong> ${row.idx}</div><div><strong>#:</strong> ${row.manualNumber || '-'}</div><div><strong>T:</strong> ${row.elementType || '-'}</div><div><strong>Размер:</strong> ${row.width} x ${row.height}</div><div><strong>Q:</strong> ${row.quantity}</div><div><strong>M:</strong> ${row.materialCode || '-'}</div><div><strong>D:</strong> ${row.designCode || '-'}</div><div><strong>S:</strong> ${row.edging || '-'}</div><div><strong>DEC:</strong> ${row.decor || '-'}</div><div><strong>MOD:</strong> ${row.modification || '-'}</div><div><strong>ATT:</strong> ${row.attachments || '-'}</div><div><strong>PRW:</strong> ${row.previewUrl || '-'}</div>` : '<div>Нет строк для превью</div>'}</div><p class="preview-hint">Если выделено несколько строк, показывается первая по порядку.</p></aside></div></section>`;
}

function getPreviewRowIndexFromSelection() {
  if (!orderSheet) return null;
  const rows = orderSheet.getSelectedRows(false);
  if (rows.length > 0) {
    return Math.max(0, Math.min(...rows));
  }
  const selection = orderSheet.getSelection();
  if (selection) return Math.max(0, Math.min(selection[1], selection[3]));
  return null;
}

function syncPreviewRowFromSelection() {
  const next = getPreviewRowIndexFromSelection();
  if (next !== null) previewRowIndex = next;
}

function updatePreviewFromCurrentSelection() {
  syncPreviewRowFromSelection();
  if (isPreviewVisible) updatePreviewPanel();
}

function updatePreviewPanel() {
  const split = document.querySelector<HTMLElement>('#editorSplit');
  const previewPanel = document.querySelector<HTMLElement>('#editorPreviewPanel');
  const divider = document.querySelector<HTMLElement>('#editorDivider');
  if (split) {
    split.classList.toggle('preview-hidden', !isPreviewVisible);
    split.style.setProperty('--editor-main-width', `${editorSplitRatio}%`);
  }
  if (previewPanel) {
    previewPanel.classList.toggle('is-hidden', !isPreviewVisible);
  }
  if (divider) {
    divider.classList.toggle('is-hidden', !isPreviewVisible);
  }

  const previewBody = document.querySelector<HTMLDivElement>('#editorPreviewBody');
  if (!previewBody) return;
  syncPreviewRowFromSelection();
  const row = gridRows[Math.max(0, Math.min(previewRowIndex, gridRows.length - 1))];
  if (!row) {
    previewBody.innerHTML = '<div>Нет строк для превью</div>';
    return;
  }

  previewBody.innerHTML = `<div><strong>Строка:</strong> ${row.idx}</div><div><strong>#:</strong> ${row.manualNumber || '-'}</div><div><strong>T:</strong> ${row.elementType || '-'}</div><div><strong>Размер:</strong> ${row.width} x ${row.height}</div><div><strong>Q:</strong> ${row.quantity}</div><div><strong>M:</strong> ${row.materialCode || '-'}</div><div><strong>D:</strong> ${row.designCode || '-'}</div><div><strong>S:</strong> ${row.edging || '-'}</div><div><strong>DEC:</strong> ${row.decor || '-'}</div><div><strong>MOD:</strong> ${row.modification || '-'}</div><div><strong>ATT:</strong> ${row.attachments || '-'}</div><div><strong>PRW:</strong> ${row.previewUrl || '-'}</div>`;
}

function bindEditorSplitter() {
  const split = document.querySelector<HTMLElement>('#editorSplit');
  const divider = document.querySelector<HTMLElement>('#editorDivider');
  if (!split || !divider) return;

  const onPointerMove = (event: PointerEvent) => {
    const rect = split.getBoundingClientRect();
    const nextRatio = ((event.clientX - rect.left) / rect.width) * 100;
    editorSplitRatio = Math.max(40, Math.min(82, nextRatio));
    split.style.setProperty('--editor-main-width', `${editorSplitRatio}%`);
  };

  const stopDrag = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
    document.body.classList.remove('editor-divider-dragging');
  };

  divider.addEventListener('pointerdown', (event) => {
    if (!isPreviewVisible) return;
    event.preventDefault();
    document.body.classList.add('editor-divider-dragging');
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
  });
}

const PREVIEW_URL_COLUMN_INDEX = 12;

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSheetRow(row: GridRow): jspreadsheet.CellValue[] {
  return [
    row.manualNumber,
    row.elementType,
    row.height,
    row.width,
    row.quantity,
    row.materialCode,
    row.designCode,
    row.edging,
    row.decor,
    row.modification,
    row.attachments,
    'PRW',
    row.previewUrl,
  ];
}

function toGridRow(row: jspreadsheet.CellValue[], index: number): GridRow {
  return {
    idx: index + 1,
    manualNumber: asText(row[0]),
    elementType: asText(row[1]) || 'panel',
    height: asNumber(row[2], 0),
    width: asNumber(row[3], 0),
    quantity: asNumber(row[4], 1),
    materialCode: asText(row[5]),
    designCode: asText(row[6]),
    edging: asText(row[7]),
    decor: asText(row[8]),
    modification: asText(row[9]),
    attachments: asText(row[10]),
    previewUrl: asText(row[PREVIEW_URL_COLUMN_INDEX]),
  };
}

function syncGridRowsFromSheet() {
  if (!orderSheet) return;
  const raw = orderSheet.getData(false, false);
  gridRows = raw.map((row, index) => toGridRow(row, index));
}

function makeEmptyRow(nextIdx: number): GridRow {
  return {
    idx: nextIdx,
    manualNumber: '',
    elementType: 'panel',
    height: 0,
    width: 0,
    quantity: 1,
    materialCode: '',
    designCode: '',
    edging: '',
    decor: '',
    modification: '',
    attachments: '',
    previewUrl: '',
  };
}

function cloneRow(source: GridRow, nextIdx: number): GridRow {
  return {
    ...source,
    idx: nextIdx,
  };
}

function appendRows(rowsToAppend: GridRow[]) {
  if (!orderSheet || rowsToAppend.length === 0) return;
  rowsToAppend.forEach((row) => {
    orderSheet?.insertRow(toSheetRow(row));
  });
  syncGridRowsFromSheet();
  previewRowIndex = Math.max(gridRows.length - 1, 0);
  isPreviewVisible = true;
  updatePreviewPanel();
}

function removeSelectedOrFocusedRows() {
  if (!orderSheet) return;
  const selection = orderSheet.getSelection();
  if (!selection) {
    if (gridRows.length > 0) {
      orderSheet.deleteRow(Math.max(0, Math.min(previewRowIndex, gridRows.length - 1)), 1);
    }
  } else {
    const startRow = Math.min(selection[1], selection[3]);
    const endRow = Math.max(selection[1], selection[3]);
    const count = endRow - startRow + 1;
    orderSheet.deleteRow(startRow, count);
  }

  if (orderSheet.getData(false, false).length === 0) {
    orderSheet.insertRow(toSheetRow(makeEmptyRow(1)));
  }

  syncGridRowsFromSheet();
  previewRowIndex = Math.min(previewRowIndex, Math.max(gridRows.length - 1, 0));
  if (gridRows.length === 0) isPreviewVisible = false;
  updatePreviewPanel();
}

function initOrderGrid(materials: Material[], designs: Design[]) {
  const gridEl = document.querySelector<HTMLElement>('#orderGrid');
  if (!gridEl) return;
  gridEl.innerHTML = '';
  orderSheet = null;

  const materialCodes = materials.map((m) => m.code);
  const designCodes = designs.map((d) => d.code || d.name);

  const worksheets = jspreadsheet(gridEl as HTMLDivElement, {
    worksheets: [
      {
        data: gridRows.map((row) => toSheetRow(row)),
        tableOverflow: true,
        tableWidth: '100%',
        tableHeight: '62vh',
        allowInsertColumn: false,
        allowDeleteColumn: false,
        allowRenameColumn: false,
        allowManualInsertColumn: false,
        allowManualInsertRow: false,
        rowDrag: false,
        columnDrag: false,
        columns: [
          { type: 'text', title: '№', width: 72 },
          { type: 'text', title: 'T', width: 70 },
          { type: 'numeric', title: 'H', width: 62 },
          { type: 'numeric', title: 'W', width: 62 },
          { type: 'numeric', title: 'Q', width: 62 },
          { type: 'dropdown', title: 'M', width: 90, source: ['', ...materialCodes] },
          { type: 'dropdown', title: 'D', width: 90, source: ['', ...designCodes] },
          { type: 'text', title: 'S', width: 70 },
          { type: 'text', title: 'DEC', width: 80 },
          { type: 'text', title: 'MOD', width: 80 },
          { type: 'text', title: 'ATT', width: 90 },
          {
            type: 'html',
            title: 'PRW',
            width: 70,
            readOnly: true,
            render: (cell, _value, _x, y) => {
              cell.innerHTML = `<button class="grid-prw-btn btn small btn-secondary" type="button" data-prw-row="${y}">PRW</button>`;
            },
          },
          { type: 'hidden', title: '__previewUrl', width: 1 },
        ],
        onafterchanges: () => {
          syncGridRowsFromSheet();
          updatePreviewFromCurrentSelection();
        },
        onselection: (_instance, _x1, y1) => {
          if (y1 >= 0) previewRowIndex = y1;
          updatePreviewFromCurrentSelection();
        },
      },
    ],
  });

  orderSheet = worksheets[0] || null;
  if (!orderSheet) return;

  if (gridRows.length === 0) {
    orderSheet.insertRow(toSheetRow(makeEmptyRow(1)));
  }

  syncGridRowsFromSheet();

  gridEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest('.grid-prw-btn') as HTMLElement | null;
    if (!button) return;
    const rowIndex = Number(button.getAttribute('data-prw-row') || '-1');
    if (rowIndex < 0) return;
    previewRowIndex = rowIndex;
    if (isPreviewVisible) updatePreviewPanel();
  });

  gridEl.addEventListener('keydown', (event) => {
    if (!orderSheet) return;
    if (event.key !== 'Delete' && event.key !== 'Del') return;
    if (!orderSheet.getSelection()) return;
    removeSelectedOrFocusedRows();
    event.preventDefault();
  });

  gridEl.addEventListener('mouseup', () => {
    updatePreviewFromCurrentSelection();
  });

  gridEl.addEventListener('keyup', (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    const keys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', 'PageUp', 'PageDown']);
    if (!keys.has(event.key)) return;
    updatePreviewFromCurrentSelection();
  });
}

function bindShellActions() {
  document.querySelector<HTMLButtonElement>('#reloadBtn')?.addEventListener('click', () => void renderApp('Данные обновлены'));
  document.querySelector<HTMLButtonElement>('#logoutBtn')?.addEventListener('click', () => {
    token = null;
    currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    renderLogin();
  });

  document.querySelector<HTMLButtonElement>('#toggleSidebarBtn')?.addEventListener('click', async () => {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    await renderApp();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach((button) => {
    button.addEventListener('click', async () => {
      const menu = button.dataset.menu || 'dashboard';
      if (menu === 'db') {
        dbExpanded = !dbExpanded;
        localStorage.setItem(DB_MENU_EXPANDED_KEY, dbExpanded ? '1' : '0');
      } else {
        activeMenu = menu;
        editingOrderId = null;
        localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
      }
      await renderApp();
    });
  });

  document.querySelector<HTMLButtonElement>('#addDbItemBtn')?.addEventListener('click', async () => {
    if (!isAdmin()) return;
    const rawKey = prompt('Ключ подпункта (латиница)');
    if (!rawKey) return;
    const key = `db:${rawKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    if (key === 'db:' || dbMenuItems.find((item) => item.key === key)) {
      await renderApp('Некорректный или дублирующийся ключ подпункта', true);
      return;
    }
    const label = prompt('Название подпункта', rawKey) || rawKey;
    const icon = (prompt('Иконка (2-3 символа)', 'DB') || 'DB').slice(0, 3);
    dbMenuItems = [...dbMenuItems, { key, label, icon, isDefault: false }];
    saveDbMenuItems();
    activeMenu = key;
    dbExpanded = true;
    localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
    localStorage.setItem(DB_MENU_EXPANDED_KEY, '1');
    await renderApp('Подпункт БД добавлен');
  });

  document.querySelectorAll<HTMLElement>('[data-remove-db-key]').forEach((el) => {
    el.addEventListener('click', async (event) => {
      event.stopPropagation();
      const key = el.dataset.removeDbKey || '';
      dbMenuItems = dbMenuItems.filter((item) => item.key !== key || item.isDefault);
      if (activeMenu === key) activeMenu = 'dashboard';
      saveDbMenuItems();
      localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
      await renderApp('Подпункт удален');
    });
  });
}

async function renderApp(message = '', isError = false) {
  if (!token) return renderLogin();

  try {
    currentUser = (await loadMe()).user;
  } catch (error) {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    return renderLogin(`Сессия завершена: ${(error as Error).message}`);
  }

  const allowedMenus = getAllowedMenus();
  if (!allowedMenus.includes(activeMenu) && !activeMenu.startsWith('db:')) {
    activeMenu = allowedMenus[0] || 'dashboard';
    localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
  }

  let customers: Paged<Customer> = { data: [], total: 0, page: 1, limit: 20 };
  let orders: Paged<Order> = { data: [], total: 0, page: 1, limit: 20 };
  let materials: Paged<Material> = { data: [], total: 0, page: 1, limit: 20 };
  let designs: Paged<Design> = { data: [], total: 0, page: 1, limit: 20 };
  let users: User[] = [];
  let roles: Role[] = [];
  let bans: Ban[] = [];

  if (activeMenu === 'dashboard') [customers, orders, materials] = await Promise.all([loadCustomers(), loadOrders(), loadMaterials()]);
  if (activeMenu === 'customers') customers = await loadCustomers();
  if (activeMenu === 'orders') {
    if (isClient()) {
      orders = await loadOrders();
    } else {
      [orders, customers] = await Promise.all([loadOrders(), loadCustomers()]);
    }

    if (editingOrderId) {
      const [orderDetails, m, d] = await Promise.all([api<any>(`/orders/${editingOrderId}`), loadMaterials(), loadDesigns()]);
      editingOrderNumber = orderDetails.order_number;
      materials = m;
      designs = d;
      gridRows = (orderDetails.items || []).map((item: any, index: number) => ({
        idx: index + 1,
        manualNumber: item.manual_number || '',
        elementType: item.element_type || 'panel',
        height: Number(item.height || 0),
        width: Number(item.width || 0),
        quantity: Number(item.quantity || 1),
        materialCode: item.material_code || '',
        designCode: item.design_name || '',
        edging: item.coating_name || '',
        decor: item.decor || '',
        modification: item.modification || '',
        attachments: Array.isArray(item.attachments) ? item.attachments.join(', ') : '',
        previewUrl: item.preview_url || '',
      }));
      if (gridRows.length === 0) {
        gridRows = [{ idx: 1, manualNumber: '', elementType: 'panel', height: 0, width: 0, quantity: 1, materialCode: '', designCode: '', edging: '', decor: '', modification: '', attachments: '', previewUrl: '' }];
      }
    }
  }

  if (activeMenu === 'db:materials') materials = await loadMaterials();
  if (activeMenu === 'db:designs') designs = await loadDesigns();
  if (activeMenu === 'users' && isAdmin()) [users, roles] = await Promise.all([loadUsers().then((x) => x.data), loadRoles().then((x) => x.data)]);
  if (activeMenu === 'roles' && isAdmin()) roles = (await loadRoles()).data;
  if (activeMenu === 'bans' && isAdmin()) bans = (await loadBans()).data;

  let content = '<section class="panel"><h2>Раздел недоступен</h2></section>';
  if (activeMenu === 'dashboard') content = renderDashboard(customers, orders, materials);
  if (activeMenu === 'customers') content = renderCustomers(customers);
  if (activeMenu === 'orders') content = editingOrderId ? renderOrderEditor() : renderOrders(orders, customers);
  if (activeMenu === 'db:materials') content = renderDbMaterials(materials);
  if (activeMenu === 'db:designs') content = renderDbDesigns(designs);
  if (activeMenu.startsWith('db:') && !['db:materials', 'db:designs'].includes(activeMenu)) content = renderDbPlaceholder(dbMenuItems.find((x) => x.key === activeMenu)?.label || activeMenu);
  if (activeMenu === 'users' && isAdmin()) content = renderUsers(users, roles);
  if (activeMenu === 'roles' && isAdmin()) content = renderRoles(roles);
  if (activeMenu === 'bans' && isAdmin()) content = renderBans(bans);

  app.innerHTML = `
    <main class="layout">
      <header class="header">
        <div>
          <h1>Order Manager</h1>
          <div class="subtitle">Пользователь: ${currentUser.displayName || currentUser.username} | Роль: ${currentUser.role?.name || 'not assigned'}</div>
        </div>
        <div class="header-actions">
          <button id="reloadBtn" class="btn btn-secondary" type="button">Обновить</button>
          <button id="logoutBtn" class="btn" type="button">Выйти</button>
        </div>
      </header>
      ${message ? statusHtml(message, isError) : ''}
      <section class="app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        ${renderSidebar(allowedMenus)}
        <section class="content-area">${content}</section>
      </section>
    </main>
  `;

  bindShellActions();

  document.querySelector<HTMLFormElement>('#customerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = (document.querySelector<HTMLInputElement>('#customerName')?.value || '').trim();
    const email = (document.querySelector<HTMLInputElement>('#customerEmail')?.value || '').trim();
    try {
      await api('/customers', { method: 'POST', body: JSON.stringify({ name, email: email || undefined }) });
      await renderApp('Клиент создан');
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });

  document.querySelector<HTMLFormElement>('#orderForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const customerId = (document.querySelector<HTMLSelectElement>('#orderCustomer')?.value || '').trim();
    const elementType = (document.querySelector<HTMLInputElement>('#itemType')?.value || '').trim();
    const width = Number(document.querySelector<HTMLInputElement>('#itemWidth')?.value || 0);
    const height = Number(document.querySelector<HTMLInputElement>('#itemHeight')?.value || 0);
    const quantity = Number(document.querySelector<HTMLInputElement>('#itemQty')?.value || 0);
    try {
      await api('/orders', { method: 'POST', body: JSON.stringify({ customerId, items: [{ elementType, width, height, quantity }] }) });
      await renderApp('Заказ создан');
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });

  document.querySelector<HTMLButtonElement>('#createOrderBtn')?.addEventListener('click', async () => {
    try {
      if (isClient()) {
        await api('/orders', { method: 'POST', body: JSON.stringify({ items: [] }) });
      } else {
        const customerId = (document.querySelector<HTMLSelectElement>('#orderCustomer')?.value || '').trim();
        if (!customerId) {
          await renderApp('Выберите клиента для заказа', true);
          return;
        }
        await api('/orders', { method: 'POST', body: JSON.stringify({ customerId, items: [] }) });
      }
      await renderApp('Заказ создан');
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.editOrderBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      editingOrderId = btn.dataset.orderId || null;
      previewRowIndex = 0;
      isPreviewVisible = true;
      await renderApp();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.copyOrderBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.orderId || '';
      try {
        const source = await api<{ customer_id: string; order_kind: string; items?: Array<any> }>(`/orders/${orderId}`);
        const payload: any = {
          orderKind: source.order_kind || 'normal',
          items: (source.items || []).map((item) => ({
            sequenceManual: item.sequence_manual,
            manualNumber: item.manual_number,
            elementType: item.element_type,
            width: Number(item.width),
            height: Number(item.height),
            quantity: item.quantity,
            materialId: item.material_id,
            coatingId: item.coating_id,
            designId: item.design_id,
            decor: item.decor,
            modification: item.modification,
            attachments: item.attachments || [],
            previewUrl: item.preview_url,
          })),
        };
        if (!isClient()) payload.customerId = source.customer_id;
        await api('/orders', { method: 'POST', body: JSON.stringify(payload) });
        await renderApp('Заказ скопирован');
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.deleteOrderBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.orderId || '';
      if (!confirm('Удалить заказ?')) return;
      try {
        await api(`/orders/${orderId}`, { method: 'DELETE' });
        await renderApp('Заказ удален');
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });
  });

  document.querySelector<HTMLButtonElement>('#editorBackBtn')?.addEventListener('click', async () => {
    editingOrderId = null;
    gridRows = [];
    previewRowIndex = 0;
    isPreviewVisible = true;
    orderSheet = null;
    await renderApp();
  });

  document.querySelector<HTMLButtonElement>('#editorAddRowBottomBtn')?.addEventListener('click', () => {
    const next = makeEmptyRow(gridRows.length + 1);
    appendRows([next]);
  });

  document.querySelector<HTMLButtonElement>('#editorCopyLastRowBtn')?.addEventListener('click', () => {
    const last = gridRows[gridRows.length - 1];
    if (!last) {
      appendRows([makeEmptyRow(1)]);
      return;
    }
    appendRows([cloneRow(last, gridRows.length + 1)]);
  });

  document.querySelector<HTMLButtonElement>('#editorDeleteRowBtn')?.addEventListener('click', () => {
    removeSelectedOrFocusedRows();
  });

  document.querySelector<HTMLButtonElement>('#editorShowPreviewBtn')?.addEventListener('click', () => {
    isPreviewVisible = !isPreviewVisible;
    if (isPreviewVisible) syncPreviewRowFromSelection();
    updatePreviewPanel();
  });

  document.querySelector<HTMLButtonElement>('#editorSaveBtn')?.addEventListener('click', async () => {
    if (!editingOrderId || !orderSheet) return;
    try {
      syncGridRowsFromSheet();
      const materialByCode = new Map(materials.data.map((m) => [m.code, m.id]));
      const designByCode = new Map(designs.data.map((d) => [d.code || d.name, d.id]));
      await api(`/orders/${editingOrderId}/items`, {
        method: 'PUT',
        body: JSON.stringify({
          items: gridRows.map((row) => ({
            sequenceManual: row.idx,
            manualNumber: row.manualNumber,
            elementType: row.elementType || 'panel',
            height: Number(row.height || 0),
            width: Number(row.width || 0),
            quantity: Number(row.quantity || 1),
            materialId: materialByCode.get(row.materialCode) || null,
            coatingId: row.edging || null,
            designId: designByCode.get(row.designCode) || null,
            decor: row.decor || null,
            modification: row.modification || null,
            attachments: row.attachments ? row.attachments.split(',').map((x) => x.trim()).filter(Boolean) : [],
            previewUrl: row.previewUrl || null,
          })),
        }),
      });
      await renderApp('Таблица заказа сохранена');
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });

  if (activeMenu === 'orders' && editingOrderId) {
    initOrderGrid(materials.data, designs.data);
    bindEditorSplitter();
    updatePreviewPanel();
  }

  if (activeMenu === 'users' && isAdmin()) {
    document.querySelectorAll<HTMLButtonElement>('.assignBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId || '';
        const roleId = document.querySelector<HTMLSelectElement>(`.assignRole[data-user-id="${userId}"]`)?.value || '';
        try {
          await api(`/users/${userId}/assign-role`, { method: 'PATCH', body: JSON.stringify({ roleId }) });
          await renderApp('Роль назначена');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    });
  }

  if (activeMenu === 'roles' && isAdmin()) {
    const roleSelect = document.querySelector<HTMLSelectElement>('#roleSelect');
    const rolesData = roles;
    document.querySelector<HTMLFormElement>('#newRoleForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/roles', {
          method: 'POST',
          body: JSON.stringify({
            code: (document.querySelector<HTMLInputElement>('#newRoleCode')?.value || '').trim(),
            name: (document.querySelector<HTMLInputElement>('#newRoleName')?.value || '').trim(),
            menus: parseCsv((document.querySelector<HTMLInputElement>('#newRoleMenus')?.value || '').trim()),
            panels: parseCsv((document.querySelector<HTMLInputElement>('#newRolePanels')?.value || '').trim()),
            permissions: [],
          }),
        });
        await renderApp('Роль создана');
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });

    if (roleSelect) {
      const syncRoleForm = () => {
        const selected = rolesData.find((r) => r.id === roleSelect.value);
        if (!selected) return;
        const roleName = document.querySelector<HTMLInputElement>('#roleName');
        const roleMenus = document.querySelector<HTMLInputElement>('#roleMenus');
        const rolePanels = document.querySelector<HTMLInputElement>('#rolePanels');
        if (roleName) roleName.value = selected.name;
        if (roleMenus) roleMenus.value = selected.menus.join(',');
        if (rolePanels) rolePanels.value = selected.panels.join(',');
      };
      syncRoleForm();
      roleSelect.addEventListener('change', syncRoleForm);
      document.querySelector<HTMLFormElement>('#roleForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await api(`/roles/${roleSelect.value}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: (document.querySelector<HTMLInputElement>('#roleName')?.value || '').trim(),
              menus: parseCsv((document.querySelector<HTMLInputElement>('#roleMenus')?.value || '').trim()),
              panels: parseCsv((document.querySelector<HTMLInputElement>('#rolePanels')?.value || '').trim()),
            }),
          });
          await renderApp('Роль обновлена');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    }
  }

  if (activeMenu === 'bans' && isAdmin()) {
    document.querySelector<HTMLFormElement>('#banForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/bans', {
          method: 'POST',
          body: JSON.stringify({
            kind: (document.querySelector<HTMLSelectElement>('#banKind')?.value || 'email') as 'email' | 'username',
            value: (document.querySelector<HTMLInputElement>('#banValue')?.value || '').trim(),
            reason: (document.querySelector<HTMLInputElement>('#banReason')?.value || '').trim(),
          }),
        });
        await renderApp('Запись добавлена в ban list');
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });

    document.querySelectorAll<HTMLButtonElement>('.removeBanBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/bans/${btn.dataset.banId || ''}`, { method: 'DELETE' });
          await renderApp('Запись удалена из ban list');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    });
  }
}

if (token) {
  void renderApp();
} else {
  renderLogin();
}
