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
  customFields?: Record<string, jspreadsheet.CellValue>;
};

type OrderColumnConfig = {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'numeric' | 'dropdown' | 'autocomplete' | 'checkbox' | 'radio' | 'calendar' | 'image' | 'color' | 'html' | 'hidden';
  width: number;
  source?: 'materials' | 'designs';
  isCustom?: boolean;
};

const API_BASE = 'http://127.0.0.1:3000/api/v1';
const TOKEN_KEY = 'om_token';
const ACTIVE_MENU_KEY = 'om_active_menu';
const SIDEBAR_COLLAPSED_KEY = 'om_sidebar_collapsed';
const DB_MENU_EXPANDED_KEY = 'om_db_expanded';
const DB_MENU_ITEMS_KEY = 'om_db_menu_items';
const EDITOR_PREVIEW_VISIBLE_KEY = 'om_editor_preview_visible';

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

const appEl = document.querySelector<HTMLDivElement>('#app');
if (!appEl) throw new Error('App root not found');
const app: HTMLDivElement = appEl;

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
let isPreviewVisible = localStorage.getItem(EDITOR_PREVIEW_VISIBLE_KEY) !== '0';
let editorSplitRatio = 68;
let orderSheet: jspreadsheet.WorksheetInstance | null = null;
let orderColumns: OrderColumnConfig[] = [];
let orderColumnsUserKey = '';
let lastPreviewSelectionRow = -1;
let isColumnsEditorOpen = false;

const NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End', 'PageUp', 'PageDown']);

const BASE_ORDER_COLUMNS: OrderColumnConfig[] = [
  { id: 'manualNumber', title: '№', description: 'Ручной номер позиции', type: 'text', width: 72 },
  { id: 'elementType', title: 'T', description: 'Тип элемента', type: 'text', width: 70 },
  { id: 'height', title: 'H', description: 'Высота детали', type: 'numeric', width: 62 },
  { id: 'width', title: 'W', description: 'Ширина детали', type: 'numeric', width: 62 },
  { id: 'quantity', title: 'Q', description: 'Количество деталей', type: 'numeric', width: 62 },
  { id: 'materialCode', title: 'M', description: 'Материал', type: 'dropdown', width: 90, source: 'materials' },
  { id: 'designCode', title: 'D', description: 'Дизайн', type: 'dropdown', width: 90, source: 'designs' },
  { id: 'edging', title: 'S', description: 'Обработка кромки', type: 'text', width: 70 },
  { id: 'decor', title: 'DEC', description: 'Декор', type: 'text', width: 80 },
  { id: 'modification', title: 'MOD', description: 'Модификация', type: 'text', width: 80 },
  { id: 'attachments', title: 'ATT', description: 'Вложения/примечания (изображение)', type: 'image', width: 120 },
];

function getOrderColumnsStorageKey() {
  const userKey = currentUser?.id || currentUser?.username || 'anonymous';
  return `om_order_columns_${userKey}`;
}

function loadOrderColumnsForUser() {
  const raw = localStorage.getItem(getOrderColumnsStorageKey());
  if (!raw) return [...BASE_ORDER_COLUMNS];
  try {
    const parsed = JSON.parse(raw) as OrderColumnConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...BASE_ORDER_COLUMNS];
    const baseMap = new Map(BASE_ORDER_COLUMNS.map((column) => [column.id, column]));
    const merged: OrderColumnConfig[] = [];
    parsed.forEach((column) => {
      const base = baseMap.get(column.id);
      if (base) {
        merged.push({
          ...base,
          title: column.title || base.title,
          width: column.width || base.width,
          description: column.description || base.description,
          type: normalizeColumnType(column.type || base.type),
        });
        baseMap.delete(column.id);
      } else if (column?.id && column.isCustom) {
        merged.push({
          ...column,
          type: normalizeColumnType(column.type || 'text'),
          width: column.width || 120,
          description: column.description || column.title || column.id,
          isCustom: true,
        });
      }
    });
    baseMap.forEach((column) => merged.push({ ...column }));
    return merged;
  } catch {
    return [...BASE_ORDER_COLUMNS];
  }
}

function saveOrderColumnsForUser() {
  localStorage.setItem(getOrderColumnsStorageKey(), JSON.stringify(orderColumns));
}

function ensureOrderColumnsLoaded() {
  const currentKey = getOrderColumnsStorageKey();
  if (orderColumns.length === 0 || orderColumnsUserKey !== currentKey) {
    orderColumnsUserKey = currentKey;
    orderColumns = loadOrderColumnsForUser();
  }
}

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

function setPreviewVisible(value: boolean) {
  isPreviewVisible = value;
  localStorage.setItem(EDITOR_PREVIEW_VISIBLE_KEY, value ? '1' : '0');
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

function renderAdminColumnsPanel() {
  if (!isAdmin()) return '';
  const rows = orderColumns
    .map((column, index) => {
      const lockDelete = column.isCustom ? '' : 'disabled';
      return `<tr class="admin-col-row" draggable="true" data-col-id="${column.id}"><td class="col-drag-handle" title="Перетащите для сортировки">::</td><td>${index + 1}</td><td><input class="col-title-input" data-col-id="${column.id}" value="${column.title}" /></td><td><input class="col-desc-input" data-col-id="${column.id}" value="${column.description}" /></td><td><select class="col-type-select" data-col-id="${column.id}"><option value="text" ${column.type === 'text' ? 'selected' : ''}>text</option><option value="numeric" ${column.type === 'numeric' ? 'selected' : ''}>numeric</option><option value="dropdown" ${column.type === 'dropdown' ? 'selected' : ''}>dropdown</option><option value="autocomplete" ${column.type === 'autocomplete' ? 'selected' : ''}>autocomplete</option><option value="checkbox" ${column.type === 'checkbox' ? 'selected' : ''}>checkbox (boolean)</option><option value="radio" ${column.type === 'radio' ? 'selected' : ''}>radio</option><option value="calendar" ${column.type === 'calendar' ? 'selected' : ''}>calendar</option><option value="image" ${column.type === 'image' ? 'selected' : ''}>image</option><option value="color" ${column.type === 'color' ? 'selected' : ''}>color</option><option value="html" ${column.type === 'html' ? 'selected' : ''}>html</option><option value="hidden" ${column.type === 'hidden' ? 'selected' : ''}>hidden</option></select></td><td><button type="button" class="btn small btn-secondary col-delete-btn" data-col-id="${column.id}" ${lockDelete}>X</button></td></tr>`;
    })
    .join('');

  return `<section class="panel column-admin-panel"><h3>Редактор колонок (Admin)</h3><div class="table-wrap"><table><thead><tr><th></th><th>#</th><th>Название</th><th>Tooltip</th><th>Тип</th><th>Действия</th></tr></thead><tbody>${rows}</tbody></table></div><form id="addColumnForm" class="grid" style="margin-top:10px;"><label>Название<input id="newColumnTitle" placeholder="Новая колонка" required /></label><label>Tooltip<input id="newColumnDescription" placeholder="Описание" /></label><label>Тип<select id="newColumnType"><option value="text">text</option><option value="numeric">numeric</option><option value="dropdown">dropdown</option><option value="autocomplete">autocomplete</option><option value="checkbox">checkbox (boolean)</option><option value="radio">radio</option><option value="calendar">calendar</option><option value="image">image</option><option value="color">color</option><option value="html">html</option><option value="hidden">hidden</option></select></label><button type="submit" class="btn btn-secondary">Добавить колонку</button></form><div class="header-actions" style="margin-top:8px;"><button type="button" id="saveColumnsConfigBtn" class="btn btn-secondary">Сохранить конфиг колонок</button></div></section>`;
}

function renderOrderEditor() {
  ensureOrderColumnsLoaded();
  const row = gridRows[Math.max(0, Math.min(previewRowIndex, gridRows.length - 1))];
  const columnsOverlay = isAdmin()
    ? `<div id="columnsEditorOverlay" class="editor-columns-overlay${isColumnsEditorOpen ? '' : ' is-hidden'}"><div class="editor-columns-dialog"><div class="header-actions" style="margin-bottom:10px;justify-content:space-between;"><h3>Редактор колонок</h3><button type="button" id="editorCloseColumnsBtn" class="btn btn-secondary">Закрыть</button></div>${renderAdminColumnsPanel()}</div></div>`
    : '';

  return `<section class="panel"><div class="header-actions" style="margin-bottom:12px;justify-content:space-between;"><h2>Заказ ${editingOrderNumber}</h2><div class="header-actions"><button type="button" id="editorShowPreviewBtn" class="btn btn-secondary${isPreviewVisible ? ' is-active' : ''}">Превью</button>${isAdmin() ? `<button type="button" id="editorShowColumnsBtn" class="btn btn-secondary${isColumnsEditorOpen ? ' is-active' : ''}">Редактор колонок</button>` : ''}<button type="button" id="editorSaveBtn" class="btn">Сохранить</button></div></div><div class="editor-split${isPreviewVisible ? '' : ' preview-hidden'}" id="editorSplit" style="--editor-main-width:${editorSplitRatio}%"><div class="editor-grid-stack"><div class="order-grid" id="orderGrid"></div><div class="editor-grid-tools"><button type="button" id="editorAddRowBottomBtn" class="btn btn-secondary">+</button><button type="button" id="editorCopyLastRowBtn" class="btn btn-secondary">Copy</button><button type="button" id="editorDeleteRowBtn" class="btn btn-secondary">Del</button></div></div><div class="editor-divider${isPreviewVisible ? '' : ' is-hidden'}" id="editorDivider" role="separator" aria-orientation="vertical" aria-label="Resize preview"></div><aside class="panel preview-panel${isPreviewVisible ? '' : ' is-hidden'}" id="editorPreviewPanel"><h3>Превью</h3><div id="editorPreviewBody">${row ? `<div><strong>Строка:</strong> ${row.idx}</div><div><strong>№:</strong> ${row.manualNumber || '-'}</div><div><strong>T:</strong> ${row.elementType || '-'}</div><div><strong>Размер:</strong> ${row.width} x ${row.height}</div><div><strong>Q:</strong> ${row.quantity}</div><div><strong>M:</strong> ${row.materialCode || '-'}</div><div><strong>D:</strong> ${row.designCode || '-'}</div><div><strong>S:</strong> ${row.edging || '-'}</div><div><strong>DEC:</strong> ${row.decor || '-'}</div><div><strong>MOD:</strong> ${row.modification || '-'}</div><div><strong>ATT:</strong> ${row.attachments || '-'}</div>` : '<div>Нет строк для превью</div>'}</div><p class="preview-hint">Если выделено несколько строк, показывается первая по порядку.</p></aside></div>${columnsOverlay}</section>`;
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
  const next = getPreviewRowIndexFromSelection();
  if (next !== null) previewRowIndex = next;
  if (!isPreviewVisible) return;
  if (previewRowIndex === lastPreviewSelectionRow) return;
  lastPreviewSelectionRow = previewRowIndex;
  updatePreviewPanel();
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

  const columnsButton = document.querySelector<HTMLElement>('#editorShowColumnsBtn');
  if (columnsButton) {
    columnsButton.classList.toggle('is-active', isColumnsEditorOpen);
  }
  const columnsOverlay = document.querySelector<HTMLElement>('#columnsEditorOverlay');
  if (columnsOverlay) {
    columnsOverlay.classList.toggle('is-hidden', !isColumnsEditorOpen);
  }

  const previewBody = document.querySelector<HTMLDivElement>('#editorPreviewBody');
  if (!previewBody) return;
  const row = gridRows[Math.max(0, Math.min(previewRowIndex, gridRows.length - 1))];
  if (!row) {
    previewBody.innerHTML = '<div>Нет строк для превью</div>';
    return;
  }

  previewBody.innerHTML = `<div><strong>Строка:</strong> ${row.idx}</div><div><strong>#:</strong> ${row.manualNumber || '-'}</div><div><strong>T:</strong> ${row.elementType || '-'}</div><div><strong>Размер:</strong> ${row.width} x ${row.height}</div><div><strong>Q:</strong> ${row.quantity}</div><div><strong>M:</strong> ${row.materialCode || '-'}</div><div><strong>D:</strong> ${row.designCode || '-'}</div><div><strong>S:</strong> ${row.edging || '-'}</div><div><strong>DEC:</strong> ${row.decor || '-'}</div><div><strong>MOD:</strong> ${row.modification || '-'}</div><div><strong>ATT:</strong> ${row.attachments || '-'}</div>`;
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

function asText(value: unknown) {
  return String(value ?? '').trim();
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getFieldValueByColumn(row: GridRow, columnId: string): jspreadsheet.CellValue {
  if (columnId === 'manualNumber') return row.manualNumber;
  if (columnId === 'elementType') return row.elementType;
  if (columnId === 'height') return row.height;
  if (columnId === 'width') return row.width;
  if (columnId === 'quantity') return row.quantity;
  if (columnId === 'materialCode') return row.materialCode;
  if (columnId === 'designCode') return row.designCode;
  if (columnId === 'edging') return row.edging;
  if (columnId === 'decor') return row.decor;
  if (columnId === 'modification') return row.modification;
  if (columnId === 'attachments') return row.attachments;
  return row.customFields?.[columnId] ?? '';
}

function assignFieldValueByColumn(row: GridRow, columnId: string, value: jspreadsheet.CellValue) {
  if (columnId === 'manualNumber') row.manualNumber = asText(value);
  else if (columnId === 'elementType') row.elementType = asText(value) || 'panel';
  else if (columnId === 'height') row.height = asNumber(value, 0);
  else if (columnId === 'width') row.width = asNumber(value, 0);
  else if (columnId === 'quantity') row.quantity = asNumber(value, 1);
  else if (columnId === 'materialCode') row.materialCode = asText(value);
  else if (columnId === 'designCode') row.designCode = asText(value);
  else if (columnId === 'edging') row.edging = asText(value);
  else if (columnId === 'decor') row.decor = asText(value);
  else if (columnId === 'modification') row.modification = asText(value);
  else if (columnId === 'attachments') row.attachments = asText(value);
  else row.customFields = { ...(row.customFields || {}), [columnId]: value ?? '' };
}

function toSheetRow(row: GridRow): jspreadsheet.CellValue[] {
  return orderColumns.map((column) => getFieldValueByColumn(row, column.id));
}

function toGridRow(values: jspreadsheet.CellValue[], index: number): GridRow {
  const row = makeEmptyRow(index + 1);
  orderColumns.forEach((column, columnIndex) => {
    assignFieldValueByColumn(row, column.id, values[columnIndex]);
  });
  row.idx = index + 1;
  return row;
}

function syncGridRowsFromSheet() {
  if (!orderSheet) return;
  const raw = orderSheet.getData(false, false);
  gridRows = raw.map((row, index) => toGridRow(row, index));
}

function applyColumnHeaderTooltips() {
  if (!orderSheet) return;
  orderSheet.headers.forEach((header, index) => {
    const column = orderColumns[index];
    if (!column) return;
    header.title = column.description;
  });
}

function moveColumnsState(oldPosition: number, newPosition: number, quantity: number) {
  if (quantity <= 0 || oldPosition === newPosition) return;
  const moved = orderColumns.splice(oldPosition, quantity);
  orderColumns.splice(newPosition, 0, ...moved);
}

function isFixedOrderColumn(column: OrderColumnConfig | undefined) {
  if (!column) return true;
  return !column.isCustom || BASE_ORDER_COLUMNS.some((base) => base.id === column.id);
}

function buildSheetColumns(materialCodes: string[], designCodes: string[]): jspreadsheet.Column[] {
  return orderColumns.map((column) => {
    const source = column.source === 'materials'
      ? ['', ...materialCodes]
      : column.source === 'designs'
        ? ['', ...designCodes]
        : undefined;

    if (column.type === 'dropdown' || column.type === 'autocomplete' || column.type === 'radio') {
      return {
        type: column.type,
        title: column.title,
        name: column.id,
        width: column.width,
        source: source || (column.type === 'radio' ? ['Да', 'Нет'] : []),
      };
    }

    if (column.type === 'checkbox') {
      return { type: 'checkbox', title: column.title, name: column.id, width: column.width };
    }

    return { type: column.type, title: column.title, name: column.id, width: column.width, align: column.type === 'numeric' ? 'right' : 'left' };
  });
}

function columnIndexToName(index: number) {
  let result = '';
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    n = Math.floor((n - mod) / 26);
  }
  return result;
}

function buildSheetFooters() {
  const footer = new Array(orderColumns.length).fill('');
  if (footer.length > 0) footer[0] = 'Итого';
  const qIndex = orderColumns.findIndex((column) => column.id === 'quantity');
  if (qIndex >= 0) {
    const col = columnIndexToName(qIndex);
    const rowCount = Math.max(gridRows.length, 1);
    footer[qIndex] = `=SUM(${col}1:${col}${rowCount})`;
  }
  return [footer];
}

function refreshQuantityFooterFormula() {
  if (!orderSheet) return;
  const qIndex = orderColumns.findIndex((column) => column.id === 'quantity');
  if (qIndex < 0) return;

  const rowCount = Math.max(orderSheet.getData(false, false).length, 1);
  const col = columnIndexToName(qIndex);
  const formula = `=SUM(${col}1:${col}${rowCount})`;
  const total = gridRows.reduce((sum, row) => sum + asNumber(row.quantity, 0), 0);

  const worksheet = orderSheet as unknown as { options?: { footers?: string[][] } };
  if (!worksheet.options) worksheet.options = {};
  if (!worksheet.options.footers || !worksheet.options.footers[0]) {
    worksheet.options.footers = buildSheetFooters();
  }
  worksheet.options.footers[0][qIndex] = formula;

  const worksheetWithTfoot = orderSheet as unknown as { tfoot?: HTMLTableSectionElement };
  const footerRow = worksheetWithTfoot.tfoot?.children?.[0] as HTMLTableRowElement | undefined;
  const footerCell = footerRow?.children?.[qIndex + 1] as HTMLTableCellElement | undefined;
  if (footerCell) footerCell.textContent = String(total);
}

function applyGridCellChange(colIndex: number, rowIndex: number, value: jspreadsheet.CellValue) {
  if (!Number.isInteger(colIndex) || !Number.isInteger(rowIndex) || colIndex < 0 || rowIndex < 0) return;
  const column = orderColumns[colIndex];
  if (!column) return;

  while (gridRows.length <= rowIndex) {
    gridRows.push(makeEmptyRow(gridRows.length + 1));
  }

  assignFieldValueByColumn(gridRows[rowIndex], column.id, value);
}

function applyGridChanges(changes: jspreadsheet.CellChange[]) {
  if (!Array.isArray(changes) || changes.length === 0) {
    syncGridRowsFromSheet();
    return;
  }

  changes.forEach((change) => {
    const x = Number(change.x);
    const y = Number(change.y);
    applyGridCellChange(x, y, change.value);
  });
}

function invalidatePreviewSelection() {
  lastPreviewSelectionRow = -1;
}

function clearSelectedCells(selection: number[]) {
  if (!orderSheet) return;

  const startX = Math.max(0, Math.min(selection[0], selection[2]));
  const endX = Math.max(0, Math.max(selection[0], selection[2]));
  const startY = Math.max(0, Math.min(selection[1], selection[3]));
  const endY = Math.max(0, Math.max(selection[1], selection[3]));

  const cells: { x: number; y: number; value: jspreadsheet.CellValue }[] = [];
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      cells.push({ x, y, value: '' });
    }
  }

  if (cells.length > 0) {
    orderSheet.setValue(cells);
  }
}

function normalizeColumnType(type: unknown): OrderColumnConfig['type'] {
  if (
    type === 'numeric'
    || type === 'dropdown'
    || type === 'autocomplete'
    || type === 'checkbox'
    || type === 'radio'
    || type === 'calendar'
    || type === 'image'
    || type === 'color'
    || type === 'html'
    || type === 'hidden'
  ) return type;
  return 'text';
}

function syncOrderColumnsFromWorksheet(instance: jspreadsheet.WorksheetInstance) {
  const headers = instance.getHeaders(true);
  const titleList = Array.isArray(headers) ? headers : String(headers).split(';');
  const columnsFromSheet = ((instance as unknown as { options?: { columns?: Array<Record<string, unknown>> } }).options?.columns || []) as Array<Record<string, unknown>>;

  const nextColumns = titleList.map((title, index) => {
    const sheetColumn = columnsFromSheet[index] || {};
    const sheetName = typeof sheetColumn.name === 'string' ? sheetColumn.name : '';
    const byId = sheetName ? orderColumns.find((column) => column.id === sheetName) : undefined;
    const fallback = orderColumns[index];
    const id = byId?.id || fallback?.id || sheetName || `custom_${Date.now()}_${index}`;
    return {
      id,
      title: title || byId?.title || fallback?.title || `COL ${index + 1}`,
      description: byId?.description || fallback?.description || title || `Колонка ${index + 1}`,
      type: normalizeColumnType(sheetColumn.type || byId?.type || fallback?.type),
      width: Number(sheetColumn.width || byId?.width || fallback?.width || 120),
      source: byId?.source || fallback?.source,
      isCustom: byId?.isCustom ?? fallback?.isCustom ?? !BASE_ORDER_COLUMNS.some((base) => base.id === id),
    } satisfies OrderColumnConfig;
  });

  orderColumns = nextColumns;
  saveOrderColumnsForUser();
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
    customFields: {},
  };
}

function cloneRow(source: GridRow, nextIdx: number): GridRow {
  return {
    ...source,
    idx: nextIdx,
    customFields: { ...(source.customFields || {}) },
  };
}

function appendRows(rowsToAppend: GridRow[]) {
  if (!orderSheet || rowsToAppend.length === 0) return;
  rowsToAppend.forEach((row) => {
    orderSheet?.insertRow(toSheetRow(row));
  });
  syncGridRowsFromSheet();
  previewRowIndex = Math.max(gridRows.length - 1, 0);
  lastPreviewSelectionRow = -1;
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
  lastPreviewSelectionRow = -1;
  if (gridRows.length === 0) setPreviewVisible(false);
  updatePreviewPanel();
}

function initOrderGrid(materials: Material[], designs: Design[]) {
  const gridEl = document.querySelector<HTMLElement>('#orderGrid');
  if (!gridEl) return;
  gridEl.innerHTML = '';
  orderSheet = null;
  ensureOrderColumnsLoaded();

  const materialCodes = materials.map((m) => m.code);
  const designCodes = designs.map((d) => d.code || d.name);

  const worksheets = jspreadsheet(gridEl as HTMLDivElement, {
    tabs: true,
    onbeforedeletecolumn: (_instance: jspreadsheet.WorksheetInstance, removedColumns: number[]) => {
      const hasFixedColumn = removedColumns.some((index) => isFixedOrderColumn(orderColumns[index]));
      return hasFixedColumn ? false : undefined;
    },
    onafterchanges: (_instance: jspreadsheet.WorksheetInstance, changes: jspreadsheet.CellChange[]) => {
      applyGridChanges(changes);
      refreshQuantityFooterFormula();
      invalidatePreviewSelection();
      updatePreviewFromCurrentSelection();
    },
    oninsertrow: () => {
      syncGridRowsFromSheet();
      refreshQuantityFooterFormula();
    },
    ondeleterow: () => {
      syncGridRowsFromSheet();
      refreshQuantityFooterFormula();
    },
    oninsertcolumn: (instance: jspreadsheet.WorksheetInstance) => {
      syncOrderColumnsFromWorksheet(instance);
      applyColumnHeaderTooltips();
    },
    ondeletecolumn: (instance: jspreadsheet.WorksheetInstance) => {
      syncOrderColumnsFromWorksheet(instance);
      applyColumnHeaderTooltips();
    },
    onchangeheader: (instance: jspreadsheet.WorksheetInstance) => {
      syncOrderColumnsFromWorksheet(instance);
      applyColumnHeaderTooltips();
    },
    onmovecolumn: (_instance: jspreadsheet.WorksheetInstance, oldPosition: number, newPosition: number, quantity: number) => {
      moveColumnsState(oldPosition, newPosition, quantity);
      saveOrderColumnsForUser();
      applyColumnHeaderTooltips();
    },
    onselection: (_instance: jspreadsheet.WorksheetInstance, _x1: number, y1: number) => {
      if (y1 >= 0) previewRowIndex = y1;
      updatePreviewFromCurrentSelection();
    },
    worksheets: [
      {
        worksheetName: 'Основной',
        data: gridRows.map((row) => toSheetRow(row)),
        footers: buildSheetFooters(),
        filters: true,
        tableOverflow: true,
        tableWidth: '100%',
        tableHeight: '62vh',
        allowInsertColumn: isAdmin(),
        allowDeleteColumn: isAdmin(),
        allowRenameColumn: isAdmin(),
        allowManualInsertColumn: isAdmin(),
        allowManualInsertRow: false,
        rowDrag: false,
        columnDrag: true,
        columns: buildSheetColumns(materialCodes, designCodes),
      },
      {
        worksheetName: 'Доп.',
        minDimensions: [Math.max(orderColumns.length, 5), 10],
        filters: true,
      },
    ],
  });

  orderSheet = worksheets[0] || null;
  if (!orderSheet) return;

  if (gridRows.length === 0) {
    orderSheet.insertRow(toSheetRow(makeEmptyRow(1)));
  }

  syncGridRowsFromSheet();
  refreshQuantityFooterFormula();
  applyColumnHeaderTooltips();

  gridEl.addEventListener('keydown', (event) => {
    if (!orderSheet) return;
    const target = event.target as HTMLElement | null;
    const isEditingField = !!target && (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
    );

    if ((event.key === 'Delete' || event.key === 'Del') && orderSheet.getSelection()) {
      removeSelectedOrFocusedRows();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === 'Backspace' && !isEditingField) {
      const selection = orderSheet.getSelection();
      if (!selection) return;

      clearSelectedCells(selection);

      syncGridRowsFromSheet();
      refreshQuantityFooterFormula();
      invalidatePreviewSelection();
      updatePreviewFromCurrentSelection();
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  gridEl.addEventListener('mouseup', () => {
    updatePreviewFromCurrentSelection();
  });

  gridEl.addEventListener('keyup', (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (!NAVIGATION_KEYS.has(event.key)) return;
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
      isColumnsEditorOpen = false;
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

  document.querySelector<HTMLButtonElement>('#editorAddRowBottomBtn')?.addEventListener('click', () => {
    const next = makeEmptyRow(gridRows.length + 1);
    appendRows([next]);
  });

  document.querySelector<HTMLButtonElement>('#editorCopyLastRowBtn')?.addEventListener('click', () => {
    const selection = orderSheet?.getSelection();
    let sourceIndexes: number[] = [];
    if (selection) {
      const top = Math.min(selection[1], selection[3]);
      const bottom = Math.max(selection[1], selection[3]);
      sourceIndexes = Array.from({ length: bottom - top + 1 }, (_, offset) => top + offset);
    } else {
      const selectedRows = orderSheet ? Array.from(new Set(orderSheet.getSelectedRows(false))).sort((a, b) => a - b) : [];
      sourceIndexes = selectedRows.length > 0 ? selectedRows : [Math.max(0, previewRowIndex)];
    }

    const rowsToCopy = sourceIndexes
      .map((rowIndex) => gridRows[rowIndex])
      .filter(Boolean)
      .map((row, offset) => cloneRow(row, gridRows.length + offset + 1));
    if (rowsToCopy.length === 0) {
      appendRows([makeEmptyRow(gridRows.length + 1)]);
      return;
    }
    appendRows(rowsToCopy);
  });

  document.querySelector<HTMLButtonElement>('#editorDeleteRowBtn')?.addEventListener('click', () => {
    removeSelectedOrFocusedRows();
  });

  document.querySelector<HTMLButtonElement>('#editorShowPreviewBtn')?.addEventListener('click', () => {
    setPreviewVisible(!isPreviewVisible);
    if (isPreviewVisible) syncPreviewRowFromSelection();
    updatePreviewPanel();
  });

  document.querySelector<HTMLButtonElement>('#editorShowColumnsBtn')?.addEventListener('click', () => {
    if (!isAdmin()) return;
    isColumnsEditorOpen = !isColumnsEditorOpen;
    updatePreviewPanel();
  });

  document.querySelector<HTMLButtonElement>('#editorCloseColumnsBtn')?.addEventListener('click', () => {
    isColumnsEditorOpen = false;
    updatePreviewPanel();
  });

  document.querySelector<HTMLElement>('#columnsEditorOverlay')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      isColumnsEditorOpen = false;
      updatePreviewPanel();
    }
  });

  if (isAdmin()) {
    const reinitSheet = async () => {
      syncGridRowsFromSheet();
      await renderApp();
    };

    document.querySelector<HTMLFormElement>('#addColumnForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = (document.querySelector<HTMLInputElement>('#newColumnTitle')?.value || '').trim();
      if (!title) return;
      const description = (document.querySelector<HTMLInputElement>('#newColumnDescription')?.value || title).trim();
      const type = ((document.querySelector<HTMLSelectElement>('#newColumnType')?.value || 'text') as OrderColumnConfig['type']);
      orderColumns = [...orderColumns, { id: `custom_${Date.now()}`, title, description, type, width: 140, isCustom: true }];
      saveOrderColumnsForUser();
      await reinitSheet();
    });

    let draggedColumnId = '';
    document.querySelectorAll<HTMLTableRowElement>('.admin-col-row').forEach((row) => {
      row.addEventListener('dragstart', (event) => {
        draggedColumnId = row.dataset.colId || '';
        event.dataTransfer?.setData('text/plain', draggedColumnId);
        event.dataTransfer?.setDragImage(row, 16, 16);
      });

      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        row.classList.add('drag-over');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });

      row.addEventListener('drop', async (event) => {
        event.preventDefault();
        row.classList.remove('drag-over');
        const targetId = row.dataset.colId || '';
        const sourceId = draggedColumnId || event.dataTransfer?.getData('text/plain') || '';
        if (!sourceId || !targetId || sourceId === targetId) return;

        const fromIndex = orderColumns.findIndex((column) => column.id === sourceId);
        const toIndex = orderColumns.findIndex((column) => column.id === targetId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

        const next = [...orderColumns];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        orderColumns = next;
        saveOrderColumnsForUser();
        await reinitSheet();
      });

      row.addEventListener('dragend', () => {
        draggedColumnId = '';
        document.querySelectorAll<HTMLTableRowElement>('.admin-col-row.drag-over').forEach((item) => item.classList.remove('drag-over'));
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.col-delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.colId || '';
        const candidate = orderColumns.find((column) => column.id === id);
        if (!candidate?.isCustom) return;
        orderColumns = orderColumns.filter((column) => column.id !== id);
        gridRows = gridRows.map((row) => {
          if (!row.customFields) return row;
          const nextCustom = { ...row.customFields };
          delete nextCustom[id];
          return { ...row, customFields: nextCustom };
        });
        saveOrderColumnsForUser();
        await reinitSheet();
      });
    });

    document.querySelector<HTMLButtonElement>('#saveColumnsConfigBtn')?.addEventListener('click', async () => {
      const titleInputs = document.querySelectorAll<HTMLInputElement>('.col-title-input');
      const descInputs = document.querySelectorAll<HTMLInputElement>('.col-desc-input');
      const typeInputs = document.querySelectorAll<HTMLSelectElement>('.col-type-select');
      const titleMap = new Map(Array.from(titleInputs).map((input) => [input.dataset.colId || '', input.value.trim()]));
      const descMap = new Map(Array.from(descInputs).map((input) => [input.dataset.colId || '', input.value.trim()]));
      const typeMap = new Map(Array.from(typeInputs).map((input) => [input.dataset.colId || '', input.value as OrderColumnConfig['type']]));
      orderColumns = orderColumns.map((column) => ({
        ...column,
        title: titleMap.get(column.id) || column.title,
        description: descMap.get(column.id) || column.description,
        type: typeMap.get(column.id) || column.type,
      }));
      saveOrderColumnsForUser();
      isColumnsEditorOpen = false;
      await reinitSheet();
    });
  }

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
