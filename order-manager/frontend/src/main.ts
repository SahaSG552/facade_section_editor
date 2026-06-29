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
  userStatus?: 'registered' | 'profile_submitted' | 'approved' | 'rejected' | 'blocked';
  reviewNote?: string | null;
  profile?: {
    firstName: string;
    lastName: string;
    positionTitle: string;
    avatarUrl: string | null;
    companyId: string | null;
    companyName: string | null;
    companyStatus: string | null;
  };
};

type Customer = { id: string; name: string; email: string | null };
type Order = {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  status: string;
  status_code?: string;
  start_date?: string | null;
  due_date?: string | null;
  created_at: string;
  order_kind?: string;
};
type OrderStatus = {
  id: string;
  code: string;
  name: string;
  stage: string;
  is_active: boolean;
  sort_order: number;
  is_system?: boolean;
  responsible_user_ids?: string[];
};
type Material = {
  id: string;
  code: string;
  name: string;
  thickness?: string | null;
  density?: string | null;
  costPerSqm?: string | null;
  inStock?: string | null;
  quantity?: string | null;
  reserve?: string | null;
  category?: 'board' | 'linear' | 'coating' | 'paint';
  boardHeight?: number | null;
  boardWidth?: number | null;
  hasGrain?: boolean;
  coating1?: { id: string; code: string; name: string } | null;
  coating2?: { id: string; code: string; name: string } | null;
};
type Coating = {
  id: string;
  code: string;
  name: string;
  color?: string | null;
  texture?: string | null;
  direction?: 'none' | 'vertical' | 'horizontal' | null;
};
type Design = { id: string; code: string; name: string };
type Ban = { id: string; kind: 'email' | 'username'; value: string; reason: string | null };
type Company = {
  id: string;
  name: string;
  legalName?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  status: string;
};
type CompanyEmployee = {
  id: string;
  username: string;
  email: string;
  userStatus: string;
  firstName: string;
  lastName: string;
  positionTitle: string;
  companyName?: string | null;
  reviewNote?: string | null;
  roleCode?: string | null;
  roleName?: string | null;
};
type ReviewQueueItem = {
  id: string;
  username: string;
  email: string;
  userStatus: string;
  roleCode?: string | null;
  reviewNote?: string | null;
  profileSubmittedAt?: string | null;
  firstName: string;
  lastName: string;
  positionTitle: string;
  companyId?: string | null;
  companyName?: string | null;
};
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

type SimpleColumnConfig<T extends string = string> = { id: string; title: string; width: number; type: T; isCustom?: boolean };
type EmployeeColumnConfig = SimpleColumnConfig<'hidden' | 'text' | 'dropdown'>;
type CompanyColumnConfig = SimpleColumnConfig<'hidden' | 'text' | 'dropdown'>;
type OrdersTableColumnConfig = SimpleColumnConfig<'hidden' | 'text' | 'dropdown' | 'calendar' | 'html'>;

type OrdersTableViewState = {
  sort?: { columnId: string; order: 0 | 1 } | null;
  filters?: Record<string, string[]>;
};

type MaterialColumnConfig = SimpleColumnConfig<'hidden' | 'text' | 'numeric' | 'dropdown' | 'checkbox'>;
type MaterialsTableViewState = {
  sort?: { columnId: string; order: 0 | 1 } | null;
  filters?: Record<string, string[]>;
};

const API_BASE = 'http://127.0.0.1:3000/api/v1';
const TOKEN_KEY = 'om_token';
const ACTIVE_MENU_KEY = 'om_active_menu';
const SIDEBAR_COLLAPSED_KEY = 'om_sidebar_collapsed';
const DB_MENU_EXPANDED_KEY = 'om_db_expanded';
const COMPANY_MENU_EXPANDED_KEY = 'om_company_expanded';
const DB_MENU_ITEMS_KEY = 'om_db_menu_items';
const EDITOR_PREVIEW_VISIBLE_KEY = 'om_editor_preview_visible';

const DEFAULT_DB_ITEMS: DbMenuItem[] = [
  { key: 'db:materials', label: 'Плитные материалы', icon: 'MT', isDefault: true },
  { key: 'db:coatings', label: 'Покрытия', icon: 'CT', isDefault: true },
  { key: 'db:cutters', label: 'Фрезы', icon: 'FR', isDefault: true },
  { key: 'db:designs', label: 'Дизайны', icon: 'DZ', isDefault: true },
  { key: 'db:edgings', label: 'Обкатки', icon: 'OB', isDefault: true },
  { key: 'db:decors', label: 'Декоры', icon: 'DC', isDefault: true },
  { key: 'db:moldings', label: 'Погонаж', icon: 'PG', isDefault: true },
];

const MENU_META: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Дашборд', icon: 'DB' },
  company: { label: 'Компания', icon: 'CP' },
  db: { label: 'БД', icon: 'BD' },
};

const appEl = document.querySelector<HTMLDivElement>('#app');
if (!appEl) throw new Error('App root not found');
const app: HTMLDivElement = appEl;

let token: string | null = localStorage.getItem(TOKEN_KEY);
let currentUser: User | null = null;
let activeMenu = localStorage.getItem(ACTIVE_MENU_KEY) || 'dashboard';
let sidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
let dbExpanded = localStorage.getItem(DB_MENU_EXPANDED_KEY) !== '0';
let companyExpanded = localStorage.getItem(COMPANY_MENU_EXPANDED_KEY) !== '0';
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
let rolesSheet: jspreadsheet.WorksheetInstance | null = null;
let companyEmployeesSheet: jspreadsheet.WorksheetInstance | null = null;
let employeeColumns: EmployeeColumnConfig[] = [];
let employeeColumnsUserKey = '';
let isEmployeeColumnsEditorOpen = false;
let companyOverviewSheet: jspreadsheet.WorksheetInstance | null = null;
let ordersSheet: jspreadsheet.WorksheetInstance | null = null;
let statusesSheet: jspreadsheet.WorksheetInstance | null = null;
let materialsSheet: jspreadsheet.WorksheetInstance | null = null;
let coatingsSheet: jspreadsheet.WorksheetInstance | null = null;
let coatingIdByName = new Map<string, string>();
let companyColumns: CompanyColumnConfig[] = [];
let companyColumnsUserKey = '';
let isCompanyColumnsEditorOpen = false;
let materialColumns: MaterialColumnConfig[] = [];
let materialColumnsUserKey = '';
let isMaterialColumnsEditorOpen = false;
let materialsTableViewState: MaterialsTableViewState = {};
let materialsTableViewUserKey = '';
let ordersTableColumns: OrdersTableColumnConfig[] = [];
let ordersTableColumnsUserKey = '';
let isOrdersTableColumnsEditorOpen = false;
let ordersTableViewState: OrdersTableViewState = {};
let ordersTableViewUserKey = '';

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

const BASE_EMPLOYEE_COLUMNS: EmployeeColumnConfig[] = [
  { id: 'id', title: 'id', width: 0, type: 'hidden', isCustom: false },
  { id: 'username', title: 'User', width: 120, type: 'text', isCustom: false },
  { id: 'email', title: 'Email', width: 190, type: 'text', isCustom: false },
  { id: 'profile', title: 'Профиль', width: 180, type: 'text', isCustom: false },
  { id: 'positionTitle', title: 'Должность', width: 130, type: 'text', isCustom: false },
  { id: 'lifecycle', title: 'Lifecycle', width: 110, type: 'dropdown', isCustom: false },
  { id: 'companyName', title: 'Компания', width: 180, type: 'dropdown', isCustom: false },
  { id: 'roleCode', title: 'Роль', width: 140, type: 'dropdown', isCustom: false },
  { id: 'reviewNote', title: 'Комментарий', width: 220, type: 'text', isCustom: false },
];

const BASE_COMPANY_COLUMNS: CompanyColumnConfig[] = [
  { id: 'id', title: 'id', width: 0, type: 'hidden', isCustom: false },
  { id: 'name', title: 'Название', width: 220, type: 'text', isCustom: false },
  { id: 'legalName', title: 'Юр. название', width: 220, type: 'text', isCustom: false },
  { id: 'contactEmail', title: 'Email', width: 220, type: 'text', isCustom: false },
  { id: 'website', title: 'Сайт', width: 220, type: 'text', isCustom: false },
  { id: 'status', title: 'Статус', width: 140, type: 'text', isCustom: false },
];

const BASE_ORDERS_TABLE_COLUMNS: OrdersTableColumnConfig[] = [
  { id: 'id', title: 'id', width: 0, type: 'hidden', isCustom: false },
  { id: 'customerId', title: 'customerId', width: 0, type: 'hidden', isCustom: false },
  { id: 'orderNumber', title: 'Номер заказа', width: 180, type: 'text', isCustom: false },
  { id: 'customerName', title: 'Клиент', width: 220, type: 'dropdown', isCustom: false },
  { id: 'statusCode', title: 'Статус', width: 200, type: 'dropdown', isCustom: false },
  { id: 'startDate', title: 'Дата старта', width: 140, type: 'calendar', isCustom: false },
  { id: 'dueDate', title: 'Дата срока', width: 140, type: 'calendar', isCustom: false },
  { id: 'createdAt', title: 'Создан', width: 170, type: 'text', isCustom: false },
  { id: 'editAction', title: 'Ред.', width: 82, type: 'html', isCustom: false },
];

const BASE_MATERIAL_COLUMNS: MaterialColumnConfig[] = [
  { id: 'id', title: 'id', width: 0, type: 'hidden', isCustom: false },
  { id: 'code', title: 'Код', width: 110, type: 'text', isCustom: false },
  { id: 'name', title: 'Название', width: 200, type: 'text', isCustom: false },
  { id: 'category', title: 'Категория', width: 130, type: 'dropdown', isCustom: false },
  { id: 'thickness', title: 'Толщина', width: 110, type: 'numeric', isCustom: false },
  { id: 'density', title: 'Плотность', width: 110, type: 'numeric', isCustom: false },
  { id: 'boardHeight', title: 'Длина заготовки', width: 140, type: 'numeric', isCustom: false },
  { id: 'boardWidth', title: 'Ширина заготовки', width: 140, type: 'numeric', isCustom: false },
  { id: 'hasGrain', title: 'Grain', width: 80, type: 'checkbox', isCustom: false },
  { id: 'coating1', title: 'Покрытие 1', width: 130, type: 'dropdown', isCustom: false },
  { id: 'coating2', title: 'Покрытие 2', width: 130, type: 'dropdown', isCustom: false },
  { id: 'costPerSqm', title: 'Цена за м2', width: 120, type: 'numeric', isCustom: false },
  { id: 'quantity', title: 'Количество', width: 110, type: 'numeric', isCustom: false },
  { id: 'reserve', title: 'Резерв', width: 110, type: 'numeric', isCustom: false },
  { id: 'inStock', title: 'Остаток', width: 110, type: 'numeric', isCustom: false },
];

// --- Generic column config helpers ---

function getUserKey() {
  return currentUser?.id || currentUser?.username || 'anonymous';
}

function saveColumnsToStorage<T>(storageKey: string, columns: T[]) {
  localStorage.setItem(storageKey, JSON.stringify(columns));
}

function moveArrayElements<T>(arr: T[], oldPosition: number, newPosition: number, quantity: number) {
  if (quantity <= 0 || oldPosition === newPosition) return;
  const moved = arr.splice(oldPosition, quantity);
  arr.splice(newPosition, 0, ...moved);
}

function isFixedBaseColumn(col: { id: string } | undefined, baseColumns: readonly { id: string }[]) {
  if (!col) return true;
  return baseColumns.some((base) => base.id === col.id);
}

function loadColumnsFromStorage<Base extends { id: string }, Merged extends { id: string; isCustom?: boolean }>(
  storageKey: string,
  baseColumns: readonly Base[],
  mergeBase: (base: Base, parsed: any) => Merged,
  mergeCustom: (parsed: any) => Merged | null,
): Merged[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [...baseColumns] as unknown as Merged[];
  try {
    const parsed = JSON.parse(raw) as Merged[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...baseColumns] as unknown as Merged[];
    const baseMap = new Map(baseColumns.map((col) => [col.id, col]));
    const merged: Merged[] = [];
    parsed.forEach((col) => {
      const base = baseMap.get(col.id);
      if (base) {
        merged.push(mergeBase(base, col));
        baseMap.delete(col.id);
      } else if (col?.id && col.isCustom) {
        const custom = mergeCustom(col);
        if (custom) merged.push(custom);
      }
    });
    baseMap.forEach((base) => merged.push(mergeBase(base, {} as any)));
    return merged;
  } catch {
    return [...baseColumns] as unknown as Merged[];
  }
}

// --- Order columns ---

function getOrderColumnsStorageKey() {
  return `om_order_columns_${getUserKey()}`;
}

function loadOrderColumnsForUser() {
  return loadColumnsFromStorage<OrderColumnConfig, OrderColumnConfig>(
    getOrderColumnsStorageKey(),
    BASE_ORDER_COLUMNS,
    (base, col) => ({
      ...base,
      title: col.title || base.title,
      width: col.width || base.width,
      description: col.description || base.description,
      type: normalizeColumnType(col.type || base.type),
    }),
    (col) => ({
      ...col,
      type: normalizeColumnType(col.type || 'text'),
      width: col.width || 120,
      description: col.description || col.title || col.id,
      isCustom: true,
    }),
  );
}

function normalizeMaterialCategory(category: string | null | undefined) {
  if (category === 'leaf') return 'board';
  return category || 'board';
}

function ensureOrderColumnsLoaded() {
  const currentKey = getOrderColumnsStorageKey();
  if (orderColumns.length === 0 || orderColumnsUserKey !== currentKey) {
    orderColumnsUserKey = currentKey;
    orderColumns = loadOrderColumnsForUser();
  }
}

function isFixedOrderColumn(column: OrderColumnConfig | undefined) {
  if (!column) return true;
  return !column.isCustom || BASE_ORDER_COLUMNS.some((base) => base.id === column.id);
}

// --- Employee columns ---

function getEmployeeColumnsStorageKey() {
  return `om_employee_columns_${getUserKey()}`;
}

function loadEmployeeColumnsForUser() {
  return loadColumnsFromStorage<EmployeeColumnConfig, EmployeeColumnConfig>(
    getEmployeeColumnsStorageKey(),
    BASE_EMPLOYEE_COLUMNS,
    (base, col) => ({
      ...base,
      title: col.title || base.title,
      width: Number(col.width || base.width || 120),
    }),
    () => null,
  );
}

function ensureEmployeeColumnsLoaded() {
  const currentKey = getEmployeeColumnsStorageKey();
  if (employeeColumns.length === 0 || employeeColumnsUserKey !== currentKey) {
    employeeColumnsUserKey = currentKey;
    employeeColumns = loadEmployeeColumnsForUser();
  }
}

// --- Company columns ---

function getCompanyColumnsStorageKey() {
  return `om_company_columns_${getUserKey()}`;
}

function loadCompanyColumnsForUser() {
  return loadColumnsFromStorage<CompanyColumnConfig, CompanyColumnConfig>(
    getCompanyColumnsStorageKey(),
    BASE_COMPANY_COLUMNS,
    (base, col) => ({
      ...base,
      title: col.title || base.title,
      width: Number(col.width || base.width || 120),
    }),
    (col) => ({
      ...col,
      title: col.title || col.id,
      width: Number(col.width || 140),
      type: col.type === 'dropdown' ? 'dropdown' : 'text',
      isCustom: true,
    }),
  );
}

function ensureCompanyColumnsLoaded() {
  const currentKey = getCompanyColumnsStorageKey();
  if (companyColumns.length === 0 || companyColumnsUserKey !== currentKey) {
    companyColumnsUserKey = currentKey;
    companyColumns = loadCompanyColumnsForUser();
  }
}

// --- Orders table columns ---

function getOrdersTableColumnsStorageKey() {
  return `om_orders_table_columns_${getUserKey()}`;
}

function loadOrdersTableColumnsForUser() {
  return loadColumnsFromStorage<OrdersTableColumnConfig, OrdersTableColumnConfig>(
    getOrdersTableColumnsStorageKey(),
    BASE_ORDERS_TABLE_COLUMNS,
    (base, col) => ({
      ...base,
      title: col.title || base.title,
      width: Number(col.width || base.width || 120),
    }),
    (col) => ({
      ...col,
      title: col.title || col.id,
      width: Number(col.width || 140),
      type: ['text', 'dropdown', 'calendar', 'html', 'hidden'].includes(col.type) ? col.type : 'text',
      isCustom: true,
    }),
  );
}

function ensureOrdersTableColumnsLoaded() {
  const currentKey = getOrdersTableColumnsStorageKey();
  if (ordersTableColumns.length === 0 || ordersTableColumnsUserKey !== currentKey) {
    ordersTableColumnsUserKey = currentKey;
    ordersTableColumns = loadOrdersTableColumnsForUser();
  }
}

// --- Material columns ---

function getMaterialColumnsStorageKey() {
  return `om_material_columns_${getUserKey()}`;
}

function loadMaterialColumnsForUser() {
  return loadColumnsFromStorage<MaterialColumnConfig, MaterialColumnConfig>(
    getMaterialColumnsStorageKey(),
    BASE_MATERIAL_COLUMNS,
    (base, col) => ({
      ...base,
      title: col.title || base.title,
      width: Number(col.width || base.width || 120),
    }),
    (col) => ({
      ...col,
      title: col.title || col.id,
      width: Number(col.width || 140),
      type: ['text', 'numeric', 'dropdown', 'checkbox', 'hidden'].includes(col.type) ? col.type : 'text',
      isCustom: true,
    }),
  );
}

function ensureMaterialColumnsLoaded() {
  const currentKey = getMaterialColumnsStorageKey();
  if (materialColumns.length === 0 || materialColumnsUserKey !== currentKey) {
    materialColumnsUserKey = currentKey;
    materialColumns = loadMaterialColumnsForUser();
  }
}

function getOrdersTableViewStorageKey() {
  const userKey = currentUser?.id || currentUser?.username || 'anonymous';
  return `om_orders_table_view_${userKey}`;
}

function loadOrdersTableViewStateForUser(): OrdersTableViewState {
  const raw = localStorage.getItem(getOrdersTableViewStorageKey());
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as OrdersTableViewState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOrdersTableViewStateForUser(state: OrdersTableViewState) {
  ordersTableViewState = state;
  localStorage.setItem(getOrdersTableViewStorageKey(), JSON.stringify(state));
}

function ensureOrdersTableViewStateLoaded() {
  const currentKey = getOrdersTableViewStorageKey();
  if (!ordersTableViewState || ordersTableViewUserKey !== currentKey) {
    ordersTableViewUserKey = currentKey;
    ordersTableViewState = loadOrdersTableViewStateForUser();
  }
}

function persistOrdersTableFilters(instance: jspreadsheet.WorksheetInstance | null) {
  if (!instance) return;
  ensureOrdersTableViewStateLoaded();
  const filtersByColumnId: Record<string, string[]> = {};
  const activeFilters = instance.filters || [];
  ordersTableColumns.forEach((column, index) => {
    const values = activeFilters[index];
    if (Array.isArray(values) && values.length > 0) {
      filtersByColumnId[column.id] = values.map((value) => String(value));
    }
  });
  saveOrdersTableViewStateForUser({
    ...ordersTableViewState,
    filters: filtersByColumnId,
  });
}

function computeAutoOrdersTableColumnWidth(
  columnId: string,
  title: string,
  orders: Order[],
  customers: Customer[],
  statuses: OrderStatus[],
) {
  if (columnId === 'id' || columnId === 'customerId') return 0;
  if (columnId === 'editAction') return 82;

  const customerNames = customers.map((customer) => customer.name || '');
  const statusCodes = statuses.map((status) => status.code || '');
  const orderStrings = orders.map((order) => {
    if (columnId === 'orderNumber') return String(order.order_number || '');
    if (columnId === 'customerName') return String(order.customer_name || '');
    if (columnId === 'statusCode') return String(order.status_code || order.status || '');
    if (columnId === 'startDate') return formatDateCell(order.start_date) || '';
    if (columnId === 'dueDate') return formatDateCell(order.due_date) || '';
    if (columnId === 'createdAt') return new Date(order.created_at).toLocaleString('ru-RU');
    return '';
  });

  if (columnId === 'customerName') {
    return estimateColumnWidthByValues(title, [...orderStrings, ...customerNames], 140, 420);
  }
  if (columnId === 'statusCode') {
    return estimateColumnWidthByValues(title, [...orderStrings, ...statusCodes], 130, 300);
  }
  if (columnId === 'orderNumber') {
    return estimateColumnWidthByValues(title, orderStrings, 150, 320);
  }
  if (columnId === 'createdAt') {
    return estimateColumnWidthByValues(title, orderStrings, 160, 260);
  }
  if (columnId === 'startDate' || columnId === 'dueDate') {
    return estimateColumnWidthByValues(title, orderStrings, 130, 200);
  }

  return estimateColumnWidthByValues(title, orderStrings);
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

const BUTTON_ICON_SVGS = {
  add: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3.25v9.5M3.25 8h9.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>',
  copy: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="5.25" y="2.25" width="8.5" height="8.5" rx="1.6" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.4"/><path d="M2.25 5.25v7.25c0 .8.65 1.5 1.5 1.5h7.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"/></svg>',
  edit: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10.9 2.6a1.2 1.2 0 0 1 1.7 0l.8.8a1.2 1.2 0 0 1 0 1.7L6.1 12.4 3 13l.6-3.1 7.3-7.3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.4"/><path d="M9.6 3.9 12.1 6.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"/></svg>',
  delete: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 4.25h9M6.1 4.25V3.5c0-.69.56-1.25 1.25-1.25h1.3c.69 0 1.25.56 1.25 1.25v.75m-5.2 0 .45 8.1c.03.55.48.98 1.03.98h2.05c.55 0 1-.43 1.03-.98l.45-8.1M7 6.5v4m2 0v-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35"/></svg>',
  save: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.25 2.75h7.1l2.4 2.4v7.1a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.4"/><path d="M5 2.75v4.1h5.8v-4.1M5.4 11.25h5.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"/></svg>',
} as const;

function buttonContent(label: string, icon?: keyof typeof BUTTON_ICON_SVGS) {
  const iconMarkup = icon ? `<span class="btn-icon" aria-hidden="true">${BUTTON_ICON_SVGS[icon]}</span>` : '';
  return `${iconMarkup}<span class="btn-label">${label}</span>`;
}

function getSelectedWorksheetRows(sheet: jspreadsheet.WorksheetInstance | null) {
  if (!sheet) return [] as number[];

  const selection = sheet.getSelection();
  if (selection) {
    const startRow = Math.min(selection[1], selection[3]);
    const endRow = Math.max(selection[1], selection[3]);
    return Array.from({ length: endRow - startRow + 1 }, (_, index) => startRow + index);
  }

  return Array.from(new Set(sheet.getSelectedRows(false)))
    .map((row) => Number(row))
    .filter((row) => Number.isInteger(row) && row >= 0)
    .sort((left, right) => left - right);
}

function duplicateSelectedWorksheetRows(sheet: jspreadsheet.WorksheetInstance | null) {
  if (!sheet) return;

  const selectedRows = getSelectedWorksheetRows(sheet);
  if (selectedRows.length === 0) return;

  const data = sheet.getData();
  const copiedRows = selectedRows
    .map((rowIndex) => data[rowIndex])
    .filter(Boolean)
    .map((row) => {
      const copiedRow = [...row] as unknown[];
      copiedRow[0] = '';
      return copiedRow;
    });

  if (copiedRows.length === 0) return;

  const insertAt = selectedRows[selectedRows.length - 1] + 1;
  copiedRows.forEach((row, offset) => {
    sheet.insertRow(row as string[], insertAt + offset);
  });
}

function deleteSelectedWorksheetRows(sheet: jspreadsheet.WorksheetInstance | null) {
  if (!sheet) return;

  const selectedRows = getSelectedWorksheetRows(sheet);
  if (selectedRows.length === 0) return;

  [...selectedRows].sort((left, right) => right - left).forEach((rowIndex) => {
    sheet.deleteRow(rowIndex, 1);
  });
}

type ManagedWorksheetConfig = {
  data: unknown[][];
  columns: jspreadsheet.Column[];
  minColumns?: number;
  tableHeight?: string;
  filters?: boolean;
  columnDrag?: boolean;
  allowDeleteRow?: boolean;
  onload?: (instance: jspreadsheet.WorksheetInstance) => void;
  onafterchanges?: (instance: jspreadsheet.WorksheetInstance, changes: jspreadsheet.CellChange[]) => void;
  onmovecolumn?: (instance: jspreadsheet.WorksheetInstance, oldPosition: number, newPosition: number, quantity: number) => void;
  onresizecolumn?: (
    instance: jspreadsheet.WorksheetInstance,
    colIndex: number | number[],
    newWidth: number | number[],
    oldWidth: number | number[],
  ) => void;
  onsort?: (instance: jspreadsheet.WorksheetInstance, colIndex: number, order: 0 | 1, newOrderValues: number[]) => void;
};

function createManagedWorksheet(container: HTMLDivElement, config: ManagedWorksheetConfig) {
  const rows = config.data.length > 0 ? config.data : [Array.from({ length: config.minColumns || config.columns.length }, () => '')];
  container.innerHTML = '';
  // ponytail: jspreadsheet-ce types SpreadsheetInstance for top-level callbacks but callers use WorksheetInstance; cast is safe at runtime
  const jspreadsheetConfig = {
    onload: config.onload,
    onafterchanges: config.onafterchanges,
    onmovecolumn: config.onmovecolumn,
    onresizecolumn: config.onresizecolumn,
    onsort: config.onsort,
    worksheets: [{
      data: rows as any,
      minDimensions: [config.minColumns || config.columns.length, Math.max(rows.length, 1)],
      filters: config.filters ?? true,
      allowDeleteRow: config.allowDeleteRow,
      tableOverflow: true,
      tableWidth: '100%',
      tableHeight: config.tableHeight || '62vh',
      columnDrag: config.columnDrag ?? true,
      columns: config.columns,
    }],
  };
  const [sheet] = jspreadsheet(container, jspreadsheetConfig as any) as unknown as jspreadsheet.WorksheetInstance[];
  return sheet;
}

function estimateColumnWidthByValues(title: string, values: string[], min = 90, max = 420) {
  const maxLength = Math.max(title.length, ...values.map((value) => String(value || '').length));
  return Math.max(min, Math.min(max, Math.round(maxLength * 8.2 + 28)));
}

function isAdmin() {
  return currentUser?.role?.code === 'admin';
}

function isClient() {
  return currentUser?.role?.code === 'client';
}

function getAllowedMenus() {
  const roleMenus = new Set(currentUser?.role?.menus || []);
  const menus = new Set<string>(['dashboard', 'company']);
  if (roleMenus.has('materials') || roleMenus.has('designs') || isAdmin()) menus.add('db');
  return Array.from(menus);
}

function needsOnboarding() {
  return currentUser?.userStatus && currentUser.userStatus !== 'approved';
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
const loadReviewQueue = () => api<{ data: ReviewQueueItem[] }>('/users/review-queue');
const loadCompanies = () => api<{ data: Company[] }>('/companies');
const loadMyCompany = () => api<{ company: Company | null }>('/companies/my');
const loadCompanyEmployees = (companyId: string) => api<{ data: CompanyEmployee[] }>(`/companies/${companyId}/employees`);
const loadOrderStatuses = () => api<{ data: OrderStatus[] }>('/order-statuses');
const loadCoatings = () => api<Paged<Coating>>('/coatings?page=1&limit=500');

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

    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      renderLogin('Регистрация успешна. Войдите в систему и заполните профиль компании для отправки на ревью.');
    } catch (error) {
      renderLogin(`Ошибка регистрации: ${(error as Error).message}`);
    }
  });
}

function renderOnboarding(message = '', isError = false) {
  const profile = currentUser?.profile;
  const status = currentUser?.userStatus || 'registered';
  const waiting = status === 'profile_submitted';

  app.innerHTML = `
    <main class="layout auth-layout">
      <section class="panel auth-card">
        <h1>Онбординг компании</h1>
        <p>Пользователь: ${currentUser?.username || ''}</p>
        <p>Статус: <strong>${status}</strong></p>
        ${currentUser?.reviewNote ? statusHtml(`Комментарий ревью: ${currentUser.reviewNote}`, true) : ''}
        ${message ? statusHtml(message, isError) : ''}
        ${waiting
          ? '<p>Профиль отправлен на ревью. Дождитесь решения администратора.</p>'
          : `
            <form id="onboardingForm" class="grid single-col">
              <label>Имя<input id="onbFirstName" required value="${profile?.firstName || ''}" /></label>
              <label>Фамилия<input id="onbLastName" required value="${profile?.lastName || ''}" /></label>
              <label>Должность<input id="onbPosition" required value="${profile?.positionTitle || ''}" /></label>
              <label>Компания<input id="onbCompany" required value="${profile?.companyName || ''}" /></label>
              <label>Ссылка на аватар<input id="onbAvatar" type="url" value="${profile?.avatarUrl || ''}" /></label>
              <button class="btn" type="submit">Отправить на ревью</button>
            </form>
          `}
        <div class="header-actions" style="margin-top:12px;">
          <button id="reloadBtn" class="btn btn-secondary" type="button">Обновить статус</button>
          <button id="logoutBtn" class="btn" type="button">Выйти</button>
        </div>
      </section>
    </main>
  `;

  document.querySelector<HTMLButtonElement>('#reloadBtn')?.addEventListener('click', async () => {
    await renderApp();
  });

  document.querySelector<HTMLButtonElement>('#logoutBtn')?.addEventListener('click', () => {
    token = null;
    currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    renderLogin('Вы вышли из системы');
  });

  document.querySelector<HTMLFormElement>('#onboardingForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/auth/onboarding-profile', {
        method: 'POST',
        body: JSON.stringify({
          firstName: (document.querySelector<HTMLInputElement>('#onbFirstName')?.value || '').trim(),
          lastName: (document.querySelector<HTMLInputElement>('#onbLastName')?.value || '').trim(),
          positionTitle: (document.querySelector<HTMLInputElement>('#onbPosition')?.value || '').trim(),
          companyName: (document.querySelector<HTMLInputElement>('#onbCompany')?.value || '').trim(),
          avatarUrl: (document.querySelector<HTMLInputElement>('#onbAvatar')?.value || '').trim() || null,
        }),
      });
      await renderApp('Профиль отправлен на ревью администратора.');
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });
}

function renderSidebar(allowedMenus: string[], pendingEmployeesEvents = 0) {
  const topButtons = allowedMenus
    .filter((menu) => !['company', 'db'].includes(menu))
    .map((menu) => {
      const meta = MENU_META[menu] || { label: menu, icon: '::' };
      const active = activeMenu === menu ? 'active' : '';
      return `<button class="menu-item ${active}" title="${meta.label}" data-menu="${menu}"><span class="menu-icon">${meta.icon}</span>${sidebarCollapsed ? '' : `<span class="menu-label">${meta.label}</span>`}</button>`;
    })
    .join('');

  const companyLabel = isAdmin() ? 'Компании' : 'Компания';
  const companyBlock = allowedMenus.includes('company')
    ? `
    <div class="db-menu-block">
      <button class="menu-item ${activeMenu.startsWith('company:') ? 'active' : ''}" data-menu="company" id="companyMenuToggle" title="${companyLabel}">
        <span class="menu-icon">${MENU_META.company.icon}</span>
        ${sidebarCollapsed ? '' : `<span class="menu-label">${companyLabel}</span><span class="menu-caret">${companyExpanded ? '-' : '+'}</span>`}
      </button>
      ${companyExpanded ? `<div class="db-submenu ${sidebarCollapsed ? 'icons-only' : ''}">
        <button class="submenu-item ${activeMenu === 'company:employees' ? 'active' : ''}" data-menu="company:employees" title="Сотрудники"><span class="menu-icon">US</span>${sidebarCollapsed ? '' : `<span class="menu-label">Сотрудники</span>${pendingEmployeesEvents > 0 ? `<span class="menu-badge">${pendingEmployeesEvents}</span>` : ''}`}</button>
        <button class="submenu-item ${activeMenu === 'company:roles' ? 'active' : ''}" data-menu="company:roles" title="Роли"><span class="menu-icon">RL</span>${sidebarCollapsed ? '' : '<span class="menu-label">Роли</span>'}</button>
        <button class="submenu-item ${activeMenu === 'company:customers' ? 'active' : ''}" data-menu="company:customers" title="Клиенты"><span class="menu-icon">CL</span>${sidebarCollapsed ? '' : '<span class="menu-label">Клиенты</span>'}</button>
        <button class="submenu-item ${activeMenu === 'company:orders' ? 'active' : ''}" data-menu="company:orders" title="Заказы"><span class="menu-icon">OR</span>${sidebarCollapsed ? '' : '<span class="menu-label">Заказы</span>'}</button>
        ${isAdmin() ? `<button class="submenu-item ${activeMenu === 'company:statuses' ? 'active' : ''}" data-menu="company:statuses" title="Статусы"><span class="menu-icon">ST</span>${sidebarCollapsed ? '' : '<span class="menu-label">Статусы</span>'}</button>` : ''}
      </div>` : ''}
    </div>`
    : '';

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
      <nav class="sidebar-nav">${topButtons}${companyBlock}${dbBlock}</nav>
    </aside>
  `;
}

function renderDashboard(customers: Paged<Customer>, orders: Paged<Order>, materials: Paged<Material>) {
  return `<section class="panel"><h2>Дашборд</h2><div class="stats-grid"><div class="stat-card"><div class="stat-title">Клиенты</div><div class="stat-value">${customers.total}</div></div><div class="stat-card"><div class="stat-title">Заказы</div><div class="stat-value">${orders.total}</div></div><div class="stat-card"><div class="stat-title">Материалы</div><div class="stat-value">${materials.total}</div></div></div></section>`;
}

function renderCustomers(customers: Paged<Customer>) {
  return `<section class="panel"><h2>Клиенты</h2><form id="customerForm" class="grid"><label>Название<input id="customerName" required /></label><label>Email<input id="customerEmail" type="email" /></label><button class="btn" type="submit">Создать клиента</button></form><div class="table-wrap"><table><thead><tr><th>Название</th><th>Email</th></tr></thead><tbody>${customers.data.map((c) => `<tr><td>${c.name}</td><td>${c.email ?? ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderOrders() {
  ensureOrdersTableColumnsLoaded();
  const ordersColumnsOverlay = isAdmin()
    ? `<div id="ordersColumnsOverlay" class="editor-columns-overlay${isOrdersTableColumnsEditorOpen ? '' : ' is-hidden'}"><div class="editor-columns-dialog"><div class="header-actions" style="margin-bottom:10px;justify-content:space-between;"><h3>Редактор колонок заказов</h3><button type="button" id="ordersCloseColumnsBtn" class="btn btn-secondary">Закрыть</button></div>${renderOrdersColumnsPanel()}</div></div>`
    : '';

  return `
    <section class="panel">
      <div class="header-actions" style="margin-bottom:12px;justify-content:space-between;">
        <h2>Заказы</h2>
        <div class="header-actions">
          ${isAdmin() ? `<button class="btn btn-secondary${isOrdersTableColumnsEditorOpen ? ' is-active' : ''}" id="ordersShowColumnsBtn" type="button">Редактор колонок</button>` : ''}
          <button class="btn btn-secondary" id="ordersAddRowBtn" type="button">${buttonContent('Добавить строку', 'add')}</button>
          <button class="btn" id="ordersSaveTableBtn" type="button">${buttonContent('Сохранить таблицу', 'save')}</button>
        </div>
      </div>
      <div id="ordersGrid" class="order-grid"></div>
      ${ordersColumnsOverlay}
    </section>
  `;
}

function renderOrderStatusesManager() {
  return `
    <section class="panel">
      <div class="header-actions" style="margin-bottom:12px;justify-content:space-between;">
        <h2>Статусы заказов</h2>
        <div class="header-actions">
          <button class="btn btn-secondary" id="statusesAddRowBtn" type="button">${buttonContent('Добавить строку', 'add')}</button>
          <button class="btn btn-secondary" id="statusesCopyRowBtn" type="button">${buttonContent('Копировать строку', 'copy')}</button>
          <button class="btn btn-secondary" id="statusesDeleteRowBtn" type="button">${buttonContent('Удалить строку', 'delete')}</button>
          <button class="btn" id="statusesSaveTableBtn" type="button">${buttonContent('Сохранить', 'save')}</button>
        </div>
      </div>
      <div id="statusesGrid" class="order-grid"></div>
    </section>
  `;
}

function applyCoatingTextureOrientation() {
  const container = document.querySelector<HTMLDivElement>('#coatingsGrid');
  if (!container || !coatingsSheet) return;

  const rows = coatingsSheet.getData(false, false);
  const tableRows = container.querySelectorAll<HTMLTableRowElement>('tbody tr');

  tableRows.forEach((rowElement, rowIndex) => {
    const direction = String(rows[rowIndex]?.[5] || 'none');
    const img = rowElement.querySelector<HTMLImageElement>('img');
    if (!img) return;
    img.style.transform = direction === 'horizontal' ? 'rotate(90deg)' : 'rotate(0deg)';
    img.style.transformOrigin = 'center center';
    img.style.objectFit = 'contain';
  });
}

function renderDbCoatings() {
  return `
    <section class="panel">
      <div class="header-actions" style="margin-bottom:12px;justify-content:space-between;">
        <h2>БД: Покрытия</h2>
        <div class="header-actions">
          <button class="btn btn-secondary" id="coatingsAddRowBtn" type="button">${buttonContent('Добавить строку', 'add')}</button>
          <button class="btn btn-secondary" id="coatingsCopyRowBtn" type="button">${buttonContent('Копировать строку', 'copy')}</button>
          <button class="btn btn-secondary" id="coatingsDeleteRowBtn" type="button">${buttonContent('Удалить строку', 'delete')}</button>
          <button class="btn" id="coatingsSaveTableBtn" type="button">${buttonContent('Сохранить таблицу', 'save')}</button>
        </div>
      </div>
      <div id="coatingsGrid" class="order-grid"></div>
    </section>
  `;
}

function initCoatingsGrid(coatings: Coating[] = []) {
  const container = document.querySelector<HTMLDivElement>('#coatingsGrid');
  if (!container) return;

  const rows = coatings.length > 0
    ? coatings.map((coating) => ([
        coating.id,
        coating.code,
        coating.name,
        coating.color || '#ffffff',
        coating.texture || '',
        coating.direction || 'none',
      ]))
    : [['', '', '', '#ffffff', '', 'none']];

  const codeWidth = estimateColumnWidthByValues('Код', coatings.map((coating) => coating.code), 110, 200);
  const nameWidth = estimateColumnWidthByValues('Название', coatings.map((coating) => coating.name), 180, 360);

  coatingsSheet = createManagedWorksheet(container, {
    data: rows,
    minColumns: 6,
    onload: () => applyCoatingTextureOrientation(),
    onafterchanges: () => applyCoatingTextureOrientation(),
    columns: [
      { type: 'hidden', title: 'id', name: 'id', width: 0, readOnly: true },
      { type: 'text', title: 'Код', name: 'code', width: codeWidth },
      { type: 'text', title: 'Название', name: 'name', width: nameWidth },
      { type: 'color', title: 'Цвет', name: 'color', width: 110 },
      { type: 'image', title: 'Текстура', name: 'texture', width: 160 },
      { type: 'dropdown', title: 'Направление', name: 'direction', width: 140, source: ['none', 'vertical', 'horizontal'] },
    ],
  });

  bindCoatingsTableHandlers();
}

function bindCoatingsTableHandlers() {
  const saveBtn = document.querySelector<HTMLButtonElement>('#coatingsSaveTableBtn');
  const addRowBtn = document.querySelector<HTMLButtonElement>('#coatingsAddRowBtn');
  const copyRowBtn = document.querySelector<HTMLButtonElement>('#coatingsCopyRowBtn');
  const deleteBtn = document.querySelector<HTMLButtonElement>('#coatingsDeleteRowBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!coatingsSheet) return;
      try {
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
        const data = coatingsSheet.getData();

        for (const rowData of data) {
          if (!rowData || rowData.length === 0) continue;

          const id = String(rowData[0] || '').trim();
          const code = String(rowData[1] || '').trim();
          const name = String(rowData[2] || '').trim();
          const color = String(rowData[3] || '').trim();
          const texture = String(rowData[4] || '').trim();
          const direction = String(rowData[5] || 'none').trim() || 'none';

          if (!code || !name || !color) continue;

          const payload = {
            code,
            name,
            color,
            texture: texture || null,
            direction,
          };

          if (id) {
            await api(`/coatings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
          } else {
            await api('/coatings', { method: 'POST', body: JSON.stringify(payload) });
          }
        }

        await renderApp('Покрытия сохранены');
      } catch (error) {
        console.error('Error saving coatings:', error);
        await renderApp((error as Error).message, true);
      }
    });
  }

  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      if (!coatingsSheet) return;
      coatingsSheet.insertRow(['', '', '', '#ffffff', '', 'none'], coatingsSheet.getData().length);
    });
  }

  if (copyRowBtn) {
    copyRowBtn.addEventListener('click', () => {
      if (!coatingsSheet) return;
      duplicateSelectedWorksheetRows(coatingsSheet);
      applyCoatingTextureOrientation();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!coatingsSheet) return;
      const rows = getSelectedWorksheetRows(coatingsSheet);
      if (rows.length === 0) return;

      try {
        for (const rowIndex of [...rows].sort((left, right) => right - left)) {
          const rowData = coatingsSheet.getData()[rowIndex];
          if (!rowData || rowData.length === 0) continue;

          const id = String(rowData[0] || '').trim();
          if (id) {
            await api(`/coatings/${id}`, { method: 'DELETE' });
          }
          coatingsSheet.deleteRow(rowIndex, 1);
        }
        applyCoatingTextureOrientation();
      } catch (error) {
        console.error('Error deleting coating:', error);
        await renderApp((error as Error).message, true);
      }
    });
  }
}

function renderDbMaterials() {
  ensureMaterialColumnsLoaded();
  const materialsColumnsOverlay = isAdmin()
    ? `<div id="materialsColumnsOverlay" class="editor-columns-overlay${isMaterialColumnsEditorOpen ? '' : ' is-hidden'}"><div class="editor-columns-dialog"><div class="header-actions" style="margin-bottom:10px;justify-content:space-between;"><h3>Редактор колонок материалов</h3><button type="button" id="materialsCloseColumnsBtn" class="btn btn-secondary">Закрыть</button></div>${renderMaterialsColumnsPanel()}</div></div>`
    : '';

  return `
    <section class="panel">
      <div class="header-actions" style="margin-bottom:12px;justify-content:space-between;">
        <h2>БД: Плитные материалы</h2>
        <div class="header-actions">
          ${isAdmin() ? `<button class="btn btn-secondary${isMaterialColumnsEditorOpen ? ' is-active' : ''}" id="materialsShowColumnsBtn" type="button">Редактор колонок</button>` : ''}
          <button class="btn btn-secondary" id="materialsAddRowBtn" type="button">${buttonContent('Добавить строку', 'add')}</button>
          <button class="btn btn-secondary" id="materialsCopyRowBtn" type="button">${buttonContent('Копировать строку', 'copy')}</button>
          <button class="btn btn-secondary" id="materialsDeleteRowBtn" type="button">${buttonContent('Удалить строку', 'delete')}</button>
          <button class="btn" id="materialsSaveTableBtn" type="button">${buttonContent('Сохранить таблицу', 'save')}</button>
        </div>
      </div>
      <div id="materialsGrid" class="order-grid"></div>
      ${materialsColumnsOverlay}
    </section>
  `;
}

function renderDbDesigns(designs: Paged<Design>) {
  return `<section class="panel"><h2>БД: Дизайны</h2><div class="table-wrap"><table><thead><tr><th>Code</th><th>Название</th></tr></thead><tbody>${designs.data.map((d) => `<tr><td>${d.code || '-'}</td><td>${d.name}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderDbPlaceholder(title: string) {
  return `<section class="panel"><h2>БД: ${title}</h2><p>Раздел готов к наполнению и кастомизации администратором.</p></section>`;
}

function renderUsers(users: User[], roles: Role[]) {
  return `<section class="panel"><h2>Пользователи</h2><div class="table-wrap"><table><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Lifecycle</th><th>Status</th><th>Action</th></tr></thead><tbody>${users.map((u) => `<tr><td>${u.username}</td><td>${u.email}</td><td>${u.role?.code || 'none'}</td><td>${u.userStatus || 'registered'}</td><td>${u.deletedAt ? 'deleted' : u.isBlocked ? 'blocked' : 'active'}</td><td><div class="row-actions"><select class="assignRole" data-user-id="${u.id}"><option value="">-- role --</option>${roles.map((r) => `<option value="${r.id}" ${u.role?.id === r.id ? 'selected' : ''}>${r.code}</option>`).join('')}</select><button class="btn small assignBtn" data-user-id="${u.id}" type="button">Назначить</button><button class="btn small btn-secondary blockBtn" data-user-id="${u.id}" type="button">Блок</button><button class="btn small btn-secondary unblockBtn" data-user-id="${u.id}" type="button">Разблок</button><button class="btn small danger deleteBtn" data-user-id="${u.id}" type="button">Удалить</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderRoles(roles: Role[]) {
  return `<section class="panel"><h2>Роли (JSpreadsheet)</h2><p>Обязательные поля: Роль, Меню, Панели. Название можно оставить пустым.</p><div id="rolesStatus"></div><div id="rolesGrid" class="order-grid"></div><div class="header-actions" style="margin-top:12px;"><button id="rolesAddRowBtn" class="btn btn-secondary" type="button">${buttonContent('Добавить строку', 'add')}</button><button id="rolesCopyRowBtn" class="btn btn-secondary" type="button">${buttonContent('Копировать строку', 'copy')}</button><button id="rolesDeleteRowBtn" class="btn btn-secondary" type="button">${buttonContent('Удалить строку', 'delete')}</button><button id="rolesSaveBtn" class="btn" type="button">${buttonContent('Сохранить роли', 'save')}</button></div></section>`;
}

function normalizeMultiCellValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  const raw = String(value || '').trim();
  if (!raw) return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Fallback to delimiter parsing below.
    }
  }
  const normalized = raw.replace(/;/g, ',');
  return normalized.split(',').map((item) => item.trim()).filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildRoleMenuOptions(roles: Role[]): string[] {
  return Array.from(new Set([
    'dashboard',
    'company',
    'company:overview',
    'company:employees',
    'company:roles',
    'company:customers',
    'company:orders',
    'company:statuses',
    'db',
    ...DEFAULT_DB_ITEMS.map((item) => item.key),
    ...dbMenuItems.map((item) => item.key),
    ...roles.flatMap((role) => role.menus || []),
  ])).sort();
}

function buildRolePanelOptions(roles: Role[]): string[] {
  return Array.from(new Set([
    'customersTable',
    'ordersTable',
    'materialsTable',
    'usersTable',
    'rolesEditor',
    ...roles.flatMap((role) => role.panels || []),
  ])).sort();
}

function initRolesGrid(roles: Role[]) {
  const container = document.querySelector<HTMLDivElement>('#rolesGrid');
  if (!container) return;

  const menuOptions = buildRoleMenuOptions(roles);
  const panelOptions = buildRolePanelOptions(roles);

  const data: unknown[][] = roles.map((role) => ([
    role.code,
    role.name,
    role.menus || [],
    role.panels || [],
  ]));

  if (data.length === 0) {
    data.push(['', '', [], []]);
  }

  const roleColWidth = estimateColumnWidthByValues('Роль', roles.map((role) => role.code), 140, 260);
  const nameColWidth = estimateColumnWidthByValues('Название', roles.map((role) => role.name), 180, 340);
  const menuColWidth = estimateColumnWidthByValues('Меню', menuOptions, 220, 420);
  const panelColWidth = estimateColumnWidthByValues('Панели', panelOptions, 220, 420);

  const sheet = createManagedWorksheet(container, {
    data,
    minColumns: 4,
    columns: [
      {
        type: 'autocomplete',
        title: 'Роль',
        source: roles.map((role) => role.code),
        width: roleColWidth,
      },
      {
        type: 'text',
        title: 'Название',
        width: nameColWidth,
      },
      {
        type: 'dropdown',
        title: 'Меню',
        source: menuOptions,
        multiple: true,
        width: menuColWidth,
      },
      {
        type: 'dropdown',
        title: 'Панели',
        source: panelOptions,
        multiple: true,
        width: panelColWidth,
      },
    ],
  });

  rolesSheet = sheet;
  validateRolesSheet();
}

function renderRolesStatus(message: string, isError = false) {
  const statusEl = document.querySelector<HTMLDivElement>('#rolesStatus');
  if (!statusEl) return;
  statusEl.innerHTML = message ? statusHtml(message, isError) : '';
}

function validateRolesSheet() {
  if (!rolesSheet) return { valid: false, rows: [] as unknown[][] };

  const rows = rolesSheet.getData(false, false) as unknown[][];
  const requiredColumns = [0, 2, 3];
  let hasErrors = false;

  document.querySelectorAll('#rolesGrid td.cell-required-error').forEach((cell) => {
    cell.classList.remove('cell-required-error');
  });

  rows.forEach((row, rowIndex) => {
    const isEmptyRow = String(row?.[0] || '').trim().length === 0
      && String(row?.[1] || '').trim().length === 0
      && normalizeMultiCellValue(row?.[2]).length === 0
      && normalizeMultiCellValue(row?.[3]).length === 0;
    if (isEmptyRow) return;

    requiredColumns.forEach((columnIndex) => {
      const value = row?.[columnIndex];
      const isValid = columnIndex === 0
        ? String(value || '').trim().length > 0
        : normalizeMultiCellValue(value).length > 0;

      if (!isValid) {
        hasErrors = true;
        const cell = document.querySelector<HTMLTableCellElement>(`#rolesGrid td[data-x="${columnIndex}"][data-y="${rowIndex}"]`);
        if (cell) cell.classList.add('cell-required-error');
      }
    });
  });

  return { valid: !hasErrors, rows };
}

function renderBans(bans: Ban[]) {
  return `<section class="panel"><h2>Ban List</h2><form id="banForm" class="grid"><label>Тип<select id="banKind"><option value="email">email</option><option value="username">username</option></select></label><label>Значение<input id="banValue" required /></label><label>Причина<input id="banReason" /></label><button class="btn" type="submit">Добавить в ban list</button></form><div class="table-wrap"><table><thead><tr><th>Type</th><th>Value</th><th>Reason</th><th>Action</th></tr></thead><tbody>${bans.map((b) => `<tr><td>${b.kind}</td><td>${b.value}</td><td>${b.reason || ''}</td><td><button class="btn small btn-secondary removeBanBtn" data-ban-id="${b.id}" type="button">Убрать</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderCompanyOverview(companies: Company[], myCompany: Company | null) {
  if (!isAdmin()) {
    if (!myCompany) {
      return '<section class="panel"><h2>Компания</h2><p>Компания пока не назначена.</p></section>';
    }
    return `<section class="panel"><h2>Компания</h2><div class="table-wrap"><table><tbody><tr><th>Название</th><td>${myCompany.name}</td></tr><tr><th>Юр. название</th><td>${myCompany.legalName || '-'}</td></tr><tr><th>Email</th><td>${myCompany.contactEmail || '-'}</td></tr><tr><th>Сайт</th><td>${myCompany.website || '-'}</td></tr><tr><th>Статус</th><td>${myCompany.status}</td></tr></tbody></table></div></section>`;
  }

  ensureCompanyColumnsLoaded();
  const companyColumnsOverlay = `<div id="companyColumnsOverlay" class="editor-columns-overlay${isCompanyColumnsEditorOpen ? '' : ' is-hidden'}"><div class="editor-columns-dialog"><div class="header-actions" style="margin-bottom:10px;justify-content:space-between;"><h3>Редактор колонок компаний</h3><button type="button" id="companyCloseColumnsBtn" class="btn btn-secondary">Закрыть</button></div>${renderColumnPanel(companyColumns, COMPANY_PANEL_OPTS)}</div></div>`;

  return `
    <section class="panel">
      <div class="header-actions" style="margin-bottom:12px;justify-content:space-between;">
        <h2>Компании</h2>
        <div class="header-actions">
          <button class="btn btn-secondary${isCompanyColumnsEditorOpen ? ' is-active' : ''}" id="companyShowColumnsBtn" type="button">Редактор колонок</button>
          <button class="btn btn-secondary" id="companyAddRowBtn" type="button">${buttonContent('Добавить строку', 'add')}</button>
          <button class="btn btn-secondary" id="companyCopyRowBtn" type="button">${buttonContent('Копировать строку', 'copy')}</button>
          <button class="btn btn-secondary" id="companyDeleteRowBtn" type="button">${buttonContent('Удалить строку', 'delete')}</button>
          <button class="btn" id="companySaveTableBtn" type="button">${buttonContent('Сохранить', 'save')}</button>
        </div>
      </div>
      <div id="companiesGrid" class="order-grid"></div>
      ${companyColumnsOverlay}
    </section>
  `;
}

function renderCompanyEmployees(reviewQueue: ReviewQueueItem[], roles: Role[], companies: Company[], employees: CompanyEmployee[]) {
  ensureEmployeeColumnsLoaded();
  const employeeColumnsOverlay = isAdmin()
    ? `<div id="employeeColumnsOverlay" class="editor-columns-overlay${isEmployeeColumnsEditorOpen ? '' : ' is-hidden'}"><div class="editor-columns-dialog"><div class="header-actions" style="margin-bottom:10px;justify-content:space-between;"><h3>Редактор колонок сотрудников</h3><button type="button" id="employeesCloseColumnsBtn" class="btn btn-secondary">Закрыть</button></div>${renderColumnPanel(employeeColumns, EMPLOYEE_PANEL_OPTS)}</div></div>`
    : '';
  return `
    <section class="panel">
      <div class="header-actions" style="margin-bottom:12px;justify-content:space-between;">
        <h2>Сотрудники</h2>
        ${isAdmin() ? `
          <div class="header-actions">
            <button class="btn btn-secondary${isEmployeeColumnsEditorOpen ? ' is-active' : ''}" id="employeesShowColumnsBtn" type="button">Редактор колонок</button>
            <button class="btn btn-secondary" id="employeesDeleteRowBtn" type="button">${buttonContent('Удалить строку', 'delete')}</button>
            <button class="btn" id="saveEmployeeRowBtn" type="button">${buttonContent('Сохранить', 'save')}</button>
          </div>
        ` : '<div></div>'}
      </div>
      ${isAdmin() ? `
        <p style="margin:0 0 10px;">Единая таблица. Все поля управления доступны для редактирования администратору, включая Lifecycle (approved/review).</p>
      ` : ''}

      <div id="companyEmployeesGrid" class="order-grid"></div>
      ${employeeColumnsOverlay}
    </section>
  `;
}

interface ColumnPanelOpts {
  rowClass: string;
  titleInputClass: string;
  widthInputClass: string;
  deleteBtnClass: string;
  addFormId: string;
  addTitleInputId: string;
  addTypeSelectId: string;
  saveBtnId: string;
  typeOptionsHtml: string;
  filterIds?: string[];
}

function renderColumnPanel(columns: SimpleColumnConfig<string>[], opts: ColumnPanelOpts): string {
  if (!isAdmin()) return '';
  const filtered = columns.filter((col) => !(opts.filterIds || ['id']).includes(col.id));
  const rows = filtered.map((col, index) => `
      <tr class="${opts.rowClass}" draggable="true" data-col-id="${col.id}">
        <td class="col-drag-handle" title="Перетащите для сортировки">::</td>
        <td>${index + 1}</td>
        <td>${col.id}</td>
        <td><input class="${opts.titleInputClass}" data-col-id="${col.id}" value="${col.title}" /></td>
        <td><input class="${opts.widthInputClass}" data-col-id="${col.id}" type="number" min="60" max="500" value="${col.width}" /></td>
        <td><button type="button" class="btn small btn-secondary ${opts.deleteBtnClass}" data-col-id="${col.id}" ${col.isCustom ? '' : 'disabled'}>X</button></td>
      </tr>
    `).join('');

  return `
    <section class="panel column-admin-panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>#</th><th>Ключ</th><th>Заголовок</th><th>Ширина</th><th>Действие</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <form id="${opts.addFormId}" class="grid" style="margin-top:10px;">
        <label>Название<input id="${opts.addTitleInputId}" placeholder="Новая колонка" required /></label>
        <label>Тип<select id="${opts.addTypeSelectId}">${opts.typeOptionsHtml}</select></label>
        <button type="submit" class="btn btn-secondary">Добавить колонку</button>
      </form>
      <div class="header-actions" style="margin-top:8px;">
        <button type="button" id="${opts.saveBtnId}" class="btn btn-secondary">Сохранить конфиг колонок</button>
      </div>
    </section>
  `;
}

const EMPLOYEE_PANEL_OPTS: ColumnPanelOpts = {
  rowClass: 'employee-col-row',
  titleInputClass: 'employee-col-title-input',
  widthInputClass: 'employee-col-width-input',
  deleteBtnClass: 'employee-col-delete-btn',
  addFormId: 'employeesAddColumnForm',
  addTitleInputId: 'employeesNewColumnTitle',
  addTypeSelectId: 'employeesNewColumnType',
  saveBtnId: 'employeesSaveColumnsConfigBtn',
  typeOptionsHtml: '<option value="text">text</option><option value="dropdown">dropdown</option>',
};

const COMPANY_PANEL_OPTS: ColumnPanelOpts = {
  rowClass: 'company-col-row',
  titleInputClass: 'company-col-title-input',
  widthInputClass: 'company-col-width-input',
  deleteBtnClass: 'company-col-delete-btn',
  addFormId: 'companyAddColumnForm',
  addTitleInputId: 'companyNewColumnTitle',
  addTypeSelectId: 'companyNewColumnType',
  saveBtnId: 'companySaveColumnsConfigBtn',
  typeOptionsHtml: '<option value="text">text</option><option value="dropdown">dropdown</option>',
};

const ORDERS_PANEL_OPTS: ColumnPanelOpts = {
  rowClass: 'orders-col-row',
  titleInputClass: 'orders-col-title-input',
  widthInputClass: 'orders-col-width-input',
  deleteBtnClass: 'orders-col-delete-btn',
  addFormId: 'ordersAddColumnForm',
  addTitleInputId: 'ordersNewColumnTitle',
  addTypeSelectId: 'ordersNewColumnType',
  saveBtnId: 'ordersSaveColumnsConfigBtn',
  typeOptionsHtml: '<option value="text">text</option><option value="dropdown">dropdown</option><option value="calendar">calendar</option><option value="html">html</option>',
  filterIds: ['id', 'customerId'],
};

const MATERIALS_PANEL_OPTS: ColumnPanelOpts = {
  rowClass: 'materials-col-row',
  titleInputClass: 'materials-col-title-input',
  widthInputClass: 'materials-col-width-input',
  deleteBtnClass: 'materials-col-delete-btn',
  addFormId: 'materialsAddColumnForm',
  addTitleInputId: 'materialsNewColumnTitle',
  addTypeSelectId: 'materialsNewColumnType',
  saveBtnId: 'materialsSaveColumnsConfigBtn',
  typeOptionsHtml: '<option value="text">text</option><option value="numeric">numeric</option><option value="dropdown">dropdown</option><option value="checkbox">checkbox</option>',
};

// --- Generic column admin event handlers ---

function bindColumnDragHandlers<T extends { id: string }>(
  rowSelector: string,
  getColumns: () => T[],
  setColumns: (cols: T[]) => void,
  saveFn: () => void,
) {
  let draggedId = '';
  document.querySelectorAll<HTMLTableRowElement>(rowSelector).forEach((row) => {
    row.addEventListener('dragstart', (event) => {
      draggedId = row.dataset.colId || '';
      event.dataTransfer?.setData('text/plain', draggedId);
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
      const sourceId = draggedId || event.dataTransfer?.getData('text/plain') || '';
      if (!sourceId || !targetId || sourceId === targetId) return;

      const cols = getColumns();
      const fromIndex = cols.findIndex((c) => c.id === sourceId);
      const toIndex = cols.findIndex((c) => c.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const next = [...cols];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setColumns(next);
      saveFn();
      await renderApp();
    });

    row.addEventListener('dragend', () => {
      draggedId = '';
      document.querySelectorAll<HTMLTableRowElement>(`${rowSelector}.drag-over`).forEach((item) => item.classList.remove('drag-over'));
    });
  });
}

function bindSaveColumnsConfig<T extends { id: string; title: string; width: number }>(
  titleSelector: string,
  widthSelector: string,
  getColumns: () => T[],
  setColumns: (cols: T[]) => void,
  saveFn: () => void,
  closeEditor: () => void,
) {
  const titleInputs = document.querySelectorAll<HTMLInputElement>(titleSelector);
  const widthInputs = document.querySelectorAll<HTMLInputElement>(widthSelector);
  const titleMap = new Map(Array.from(titleInputs).map((input) => [input.dataset.colId || '', input.value.trim()]));
  const widthMap = new Map(Array.from(widthInputs).map((input) => [input.dataset.colId || '', Number(input.value || 120)]));
  setColumns(getColumns().map((col) => ({
    ...col,
    title: titleMap.get(col.id) || col.title,
    width: Math.max(60, Math.min(500, Number(widthMap.get(col.id) || col.width || 120))),
  })));
  saveFn();
  closeEditor();
}

function bindAddColumnForm<T extends { id: string; title: string; width: number; isCustom?: boolean }>(
  formId: string,
  titleInputId: string,
  typeSelectId: string,
  getColumns: () => T[],
  setColumns: (cols: T[]) => void,
  saveFn: () => void,
  makeNew: (title: string, typeValue: string) => T,
) {
  document.querySelector<HTMLFormElement>(`#${formId}`)?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = (document.querySelector<HTMLInputElement>(`#${titleInputId}`)?.value || '').trim();
    if (!title) return;
    const typeValue = (document.querySelector<HTMLSelectElement>(`#${typeSelectId}`)?.value || 'text');
    setColumns([...getColumns(), makeNew(title, typeValue)]);
    saveFn();
    await renderApp();
  });
}

function bindDeleteColumnButtons(
  btnSelector: string,
  getColumns: () => { id: string; isCustom?: boolean }[],
  setColumns: (cols: any[]) => void,
  saveFn: () => void,
  isFixed: (col: any) => boolean,
) {
  document.querySelectorAll<HTMLButtonElement>(btnSelector).forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.colId || '';
      const candidate = getColumns().find((c) => c.id === id);
      if (!candidate?.isCustom || isFixed(candidate)) return;
      setColumns(getColumns().filter((c) => c.id !== id));
      saveFn();
      await renderApp();
    });
  });
}

const EMPLOYEE_FIELD_MAP: Record<string, (item: CompanyEmployee) => string> = {
  id: (item) => item.id,
  username: (item) => item.username,
  email: (item) => item.email,
  profile: (item) => `${item.firstName || ''} ${item.lastName || ''}`.trim(),
  positionTitle: (item) => item.positionTitle || '',
  lifecycle: (item) => item.userStatus || '',
  companyName: (item) => item.companyName || '',
  roleCode: (item) => item.roleCode || '',
  reviewNote: (item) => item.reviewNote || '',
};

function getEmployeeValueByColumn(item: CompanyEmployee, columnId: string) {
  return EMPLOYEE_FIELD_MAP[columnId]?.(item) ?? '';
}

const COMPANY_FIELD_MAP: Record<string, (item: Company) => string> = {
  id: (item) => item.id,
  name: (item) => item.name,
  legalName: (item) => item.legalName || '',
  contactEmail: (item) => item.contactEmail || '',
  website: (item) => item.website || '',
  status: (item) => item.status || '',
};

function getCompanyValueByColumn(item: Company, columnId: string) {
  return COMPANY_FIELD_MAP[columnId]?.(item) ?? '';
}

function buildCompanySheetColumns(hasRows: boolean): jspreadsheet.Column[] {
  return companyColumns.map((column) => {
    if (column.id === 'id') {
      return { type: 'hidden', title: column.title, name: column.id, width: 0, readOnly: true } as jspreadsheet.Column;
    }

    const editableForAdmin = isAdmin() && hasRows && !['status'].includes(column.id);
    return {
      type: column.type,
      title: column.title,
      name: column.id,
      width: column.width,
      readOnly: !editableForAdmin,
    } as jspreadsheet.Column;
  });
}

function getCellByColumnId(row: jspreadsheet.CellValue[], columns: readonly { id: string }[], columnId: string): jspreadsheet.CellValue {
  const index = columns.findIndex((col) => col.id === columnId);
  return index >= 0 ? row[index] : '';
}

function getCompanyCell(row: jspreadsheet.CellValue[], columnId: string) {
  ensureCompanyColumnsLoaded();
  return getCellByColumnId(row, companyColumns, columnId);
}

function initCompaniesGrid(companies: Company[] = []) {
  ensureCompanyColumnsLoaded();
  const container = document.querySelector<HTMLDivElement>('#companiesGrid');
  if (!container) return;

  const hasSavedColumnsConfig = Boolean(localStorage.getItem(getCompanyColumnsStorageKey()));
  if (!hasSavedColumnsConfig) {
    companyColumns = companyColumns.map((column) => {
      if (column.id === 'id') return { ...column, width: 0 };
      const values = companies.map((company) => String(getCompanyValueByColumn(company, column.id) || ''));
      return {
        ...column,
        width: estimateColumnWidthByValues(column.title, values, 110, 420),
      };
    });
    saveColumnsToStorage(getCompanyColumnsStorageKey(), companyColumns);
  }

  const rows = companies.map((company) => companyColumns.map((column) => getCompanyValueByColumn(company, column.id)));
  const hasRows = rows.length > 0;

  const sheet = createManagedWorksheet(container, {
    data: hasRows ? rows : [companyColumns.map((column) => (column.id === 'name' ? 'Компаний пока нет' : ''))],
    minColumns: companyColumns.length,
    columns: buildCompanySheetColumns(hasRows),
    onmovecolumn: (_instance: jspreadsheet.WorksheetInstance, oldPosition: number, newPosition: number, quantity: number) => {
      moveArrayElements(companyColumns, oldPosition, newPosition, quantity);
      saveColumnsToStorage(getCompanyColumnsStorageKey(), companyColumns);
    },
  });

  companyOverviewSheet = sheet;
}

function buildEmployeeSheetColumns(companyNames: string[], roleCodes: string[], hasRows: boolean) {
  return employeeColumns.map((column) => {
    if (column.id === 'id') {
      return { type: 'hidden', title: column.title, name: column.id, width: 0, readOnly: true } as jspreadsheet.Column;
    }

    const editableForAdmin = isAdmin() && hasRows && !['username', 'email', 'profile'].includes(column.id);
    if (column.id === 'lifecycle') {
      return {
        type: 'dropdown',
        title: column.title,
        name: column.id,
        width: column.width,
        source: ['approved', 'review'],
        readOnly: !editableForAdmin,
      } as jspreadsheet.Column;
    }

    if (column.id === 'companyName') {
      return {
        type: 'dropdown',
        title: column.title,
        name: column.id,
        width: column.width,
        source: companyNames,
        readOnly: !editableForAdmin,
      } as jspreadsheet.Column;
    }

    if (column.id === 'roleCode') {
      return {
        type: 'dropdown',
        title: column.title,
        name: column.id,
        width: column.width,
        source: roleCodes,
        readOnly: !editableForAdmin,
      } as jspreadsheet.Column;
    }

    return {
      type: column.type,
      title: column.title,
      name: column.id,
      width: column.width,
      readOnly: !editableForAdmin,
    } as jspreadsheet.Column;
  });
}

function getEmployeeCell(row: jspreadsheet.CellValue[], columnId: string) {
  ensureEmployeeColumnsLoaded();
  return getCellByColumnId(row, employeeColumns, columnId);
}

function initCompanyEmployeesGrids(
  employees: CompanyEmployee[] = [],
  companies: Company[] = [],
  roles: Role[] = [],
) {
  ensureEmployeeColumnsLoaded();
  const employeesContainer = document.querySelector<HTMLDivElement>('#companyEmployeesGrid');
  if (employeesContainer) {
    const companyNames = companies.map((company) => company.name);
    const roleCodes = roles.map((role) => role.code);

    const hasSavedColumnsConfig = Boolean(localStorage.getItem(getEmployeeColumnsStorageKey()));
    if (!hasSavedColumnsConfig) {
      employeeColumns = employeeColumns.map((column) => {
        if (column.id === 'id') return { ...column, width: 0 };
        const values = employees.map((employee) => String(getEmployeeValueByColumn(employee, column.id) || ''));
        return {
          ...column,
          width: estimateColumnWidthByValues(column.title, values, 100, 420),
        };
      });
      saveColumnsToStorage(getEmployeeColumnsStorageKey(), employeeColumns);
    }

    const employeesData = employees.map((item) => employeeColumns.map((column) => getEmployeeValueByColumn(item, column.id)));

    const hasEmployeesRows = employeesData.length > 0;
    const sheet = createManagedWorksheet(employeesContainer, {
      data: hasEmployeesRows
        ? employeesData
        : [employeeColumns.map((column) => (column.id === 'username' ? 'Сотрудников пока нет' : ''))],
      minColumns: employeeColumns.length,
      columns: buildEmployeeSheetColumns(companyNames, roleCodes, hasEmployeesRows),
      allowDeleteRow: false,
      onmovecolumn: (_instance: jspreadsheet.WorksheetInstance, oldPosition: number, newPosition: number, quantity: number) => {
        moveArrayElements(employeeColumns, oldPosition, newPosition, quantity);
        saveColumnsToStorage(getEmployeeColumnsStorageKey(), employeeColumns);
      },
    });
    companyEmployeesSheet = sheet;

    if (hasEmployeesRows) {
      const lifecycleColumnIndex = employeeColumns.findIndex((column) => column.id === 'lifecycle');
      for (let rowIndex = 0; rowIndex < employeesData.length; rowIndex += 1) {
        const status = String((lifecycleColumnIndex >= 0 ? employeesData[rowIndex][lifecycleColumnIndex] : '') || '').trim();
        if (status !== 'approved') {
          document.querySelectorAll(`#companyEmployeesGrid td[data-y="${rowIndex}"]`).forEach((cell) => {
            cell.classList.add('review-new-row-cell');
          });
        }
      }
    }
  }
}

function formatDateCell(value: string | null | undefined) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function renderOrdersColumnsPanel() {
  return renderColumnPanel(ordersTableColumns, ORDERS_PANEL_OPTS);
}

function renderMaterialsColumnsPanel() {
  return renderColumnPanel(materialColumns, MATERIALS_PANEL_OPTS);
}

function getOrderTableValueByColumn(order: Order, columnId: string, defaultStatusCode: string) {
  if (columnId === 'id') return order.id;
  if (columnId === 'customerId') return order.customer_id || '';
  if (columnId === 'orderNumber') return order.order_number || '';
  if (columnId === 'customerName') return order.customer_name || '';
  if (columnId === 'statusCode') return order.status_code || order.status || defaultStatusCode;
  if (columnId === 'startDate') return formatDateCell(order.start_date);
  if (columnId === 'dueDate') return formatDateCell(order.due_date);
  if (columnId === 'createdAt') return new Date(order.created_at).toLocaleString('ru-RU');
  if (columnId === 'editAction') return `<button class="btn small btn-secondary orders-edit-btn" type="button">${buttonContent('Ред.', 'edit')}</button>`;
  return '';
}

function getOrderTableDefaultValueByColumn(columnId: string, defaultStatusCode: string) {
  if (columnId === 'statusCode') return defaultStatusCode;
  if (columnId === 'editAction') return `<button class="btn small btn-secondary orders-edit-btn" type="button">${buttonContent('Ред.', 'edit')}</button>`;
  return '';
}

function getOrdersTableSheetColumns(customerNames: string[], statusCodes: string[]): jspreadsheet.Column[] {
  return ordersTableColumns.map((column) => {
    if (column.id === 'customerName') {
      return {
        type: 'dropdown',
        title: column.title,
        name: column.id,
        width: column.width,
        source: customerNames,
        readOnly: isClient(),
      } as jspreadsheet.Column;
    }
    if (column.id === 'statusCode') {
      return {
        type: 'dropdown',
        title: column.title,
        name: column.id,
        width: column.width,
        source: statusCodes,
      } as jspreadsheet.Column;
    }
    if (column.id === 'startDate' || column.id === 'dueDate') {
      return {
        type: 'calendar',
        title: column.title,
        name: column.id,
        width: column.width,
        options: { format: 'YYYY-MM-DD' },
      } as jspreadsheet.Column;
    }
    if (column.id === 'editAction') {
      return {
        type: 'html',
        title: column.title,
        name: column.id,
        width: column.width,
        readOnly: true,
        align: 'center',
      } as jspreadsheet.Column;
    }
    if (column.id === 'id' || column.id === 'customerId') {
      return {
        type: 'hidden',
        title: column.title,
        name: column.id,
        width: 0,
        readOnly: true,
      } as jspreadsheet.Column;
    }
    return {
      type: column.type,
      title: column.title,
      name: column.id,
      width: column.width,
      readOnly: column.id === 'createdAt',
    } as jspreadsheet.Column;
  });
}

function getOrdersTableCell(row: jspreadsheet.CellValue[], columnId: string) {
  ensureOrdersTableColumnsLoaded();
  return getCellByColumnId(row, ordersTableColumns, columnId);
}

function initOrdersGrid(orders: Order[] = [], customers: Customer[] = [], statuses: OrderStatus[] = []) {
  ensureOrdersTableColumnsLoaded();
  ensureOrdersTableViewStateLoaded();
  const container = document.querySelector<HTMLDivElement>('#ordersGrid');
  if (!container) return;

  const activeStatuses = statuses.filter((status) => status.is_active !== false);
  const statusCodes = activeStatuses.map((status) => status.code);
  const defaultStatusCode = statusCodes[0] || 'client_draft';
  const customerNames = customers.map((customer) => customer.name);
  const customerIdByName = new Map(customers.map((customer) => [customer.name, customer.id]));

  const hasSavedColumnsConfig = Boolean(localStorage.getItem(getOrdersTableColumnsStorageKey()));
  if (!hasSavedColumnsConfig) {
    ordersTableColumns = ordersTableColumns.map((column) => ({
      ...column,
      width: computeAutoOrdersTableColumnWidth(column.id, column.title, orders, customers, statuses),
    }));
    saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns);
  }

  const rows = orders.map((order) => (
    ordersTableColumns.map((column) => getOrderTableValueByColumn(order, column.id, defaultStatusCode))
  ));

  if (rows.length === 0) {
    rows.push(ordersTableColumns.map((column) => getOrderTableDefaultValueByColumn(column.id, defaultStatusCode)));
  }

  const sheet = createManagedWorksheet(container, {
    data: rows,
    minColumns: ordersTableColumns.length,
    columns: getOrdersTableSheetColumns(customerNames, statusCodes),
    onmovecolumn: (_instance: jspreadsheet.WorksheetInstance, oldPosition: number, newPosition: number, quantity: number) => {
      moveArrayElements(ordersTableColumns, oldPosition, newPosition, quantity);
      saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns);
      persistOrdersTableFilters(ordersSheet);
    },
    onresizecolumn: (_instance: jspreadsheet.WorksheetInstance, colIndex: number | number[], newWidth: number | number[]) => {
      const indexes = Array.isArray(colIndex) ? colIndex : [colIndex];
      const widths = Array.isArray(newWidth) ? newWidth : [newWidth];
      indexes.forEach((index, i) => {
        if (index < 0 || index >= ordersTableColumns.length) return;
        const width = Number(widths[i] ?? widths[0] ?? ordersTableColumns[index].width);
        ordersTableColumns[index] = {
          ...ordersTableColumns[index],
          width: Math.max(60, Math.min(500, width)),
        };
      });
      saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns);
      persistOrdersTableFilters(ordersSheet);
    },
    onsort: (_instance: jspreadsheet.WorksheetInstance, colIndex: number, order: 0 | 1) => {
      const columnId = ordersTableColumns[colIndex]?.id;
      if (!columnId) return;
      saveOrdersTableViewStateForUser({
        ...ordersTableViewState,
        sort: { columnId, order },
      });
      persistOrdersTableFilters(ordersSheet);
    },
    onafterchanges: (instance: jspreadsheet.WorksheetInstance, changes: jspreadsheet.CellChange[]) => {
      changes.forEach((change) => {
        const x = Number(change.x);
        const y = Number(change.y);
        const customerNameColumnIndex = ordersTableColumns.findIndex((column) => column.id === 'customerName');
        if (x !== customerNameColumnIndex || y < 0 || isClient()) return;
        const data = instance.getData(false, false);
        const customerName = String(getOrdersTableCell(data[y] || [], 'customerName') || '').trim();
        const customerId = customerIdByName.get(customerName) || '';
        const customerIdColumnIndex = ordersTableColumns.findIndex((column) => column.id === 'customerId');
        if (customerIdColumnIndex >= 0) {
          instance.setValueFromCoords(customerIdColumnIndex, y, customerId, true);
        }
      });
      persistOrdersTableFilters(instance);
    },
  });

  ordersSheet = sheet;

  const sortState = ordersTableViewState.sort;
  if (sortState?.columnId) {
    const sortColumnIndex = ordersTableColumns.findIndex((column) => column.id === sortState.columnId);
    if (sortColumnIndex >= 0) {
      ordersSheet.orderBy(sortColumnIndex, sortState.order);
    }
  }

  if (ordersTableViewState.filters && typeof ordersTableViewState.filters === 'object') {
    ordersTableColumns.forEach((column, index) => {
      const values = ordersTableViewState.filters?.[column.id];
      if (Array.isArray(values) && values.length > 0) {
        sheet.filters[index] = values.map((value) => String(value));
      }
    });
    persistOrdersTableFilters(ordersSheet);
  }
}

function initStatusesGrid(statuses: OrderStatus[] = [], employees: CompanyEmployee[] = []) {
  const container = document.querySelector<HTMLDivElement>('#statusesGrid');
  if (!container) return;

  const employeeLabels = employees.map((employee) => `${employee.username} (${employee.email})`);
  const employeeIdByLabel = new Map(employees.map((employee) => [`${employee.username} (${employee.email})`, employee.id]));
  const employeeLabelById = new Map(employees.map((employee) => [employee.id, `${employee.username} (${employee.email})`]));
  const stageOptions = ['client', 'designer', 'technologist', 'done'];

  const rows = statuses.map((status) => ([
    status.id,
    status.code,
    status.name,
    status.stage,
    Boolean(status.is_active),
    Number(status.sort_order || 100),
    (status.responsible_user_ids || []).map((id) => employeeLabelById.get(id)).filter(Boolean).join(', '),
  ]));

  if (rows.length === 0) {
    rows.push(['', '', '', 'client', true, 100, '']);
  }

  const codeWidth = estimateColumnWidthByValues('Код', statuses.map((status) => status.code), 140, 280);
  const nameWidth = estimateColumnWidthByValues('Название', statuses.map((status) => status.name), 180, 360);
  const stageWidth = estimateColumnWidthByValues('Этап', stageOptions, 120, 220);
  const responsiblesWidth = estimateColumnWidthByValues('Ответственные', employeeLabels, 220, 420);

  const sheet = createManagedWorksheet(container, {
    data: rows,
    minColumns: 7,
    columns: [
      { type: 'hidden', title: 'id', name: 'id', width: 0, readOnly: true },
      { type: 'text', title: 'Код', name: 'code', width: codeWidth },
      { type: 'text', title: 'Название', name: 'name', width: nameWidth },
      { type: 'dropdown', title: 'Этап', name: 'stage', width: stageWidth, source: stageOptions },
      { type: 'checkbox', title: 'Активен', name: 'isActive', width: 90 },
      { type: 'numeric', title: 'Порядок', name: 'sortOrder', width: 110 },
      { type: 'dropdown', title: 'Ответственные', name: 'responsibles', width: responsiblesWidth, source: employeeLabels, multiple: true },
    ],
    onafterchanges: (instance: jspreadsheet.WorksheetInstance, changes: jspreadsheet.CellChange[]) => {
      changes.forEach((change) => {
        const x = Number(change.x);
        const y = Number(change.y);
        if (x !== 6 || y < 0) return;
        const data = instance.getData(false, false);
        const selected = normalizeMultiCellValue(data[y]?.[6]);
        const normalizedLabels = selected.filter((label) => employeeIdByLabel.has(label));
        instance.setValueFromCoords(6, y, normalizedLabels.join(', '), true);
      });
    },
  });

  statusesSheet = sheet;
}

function initMaterialsGrid(materials: Material[] = []) {
  const container = document.querySelector<HTMLDivElement>('#materialsGrid');
  if (!container) return;

  const categoryOptions = ['board', 'linear', 'coating', 'paint'];

  const buildRows = () => materials.map((material) => ([
    material.id,
    material.code,
    material.name,
    normalizeMaterialCategory(material.category),
    material.thickness || '',
    material.density || '',
    material.boardHeight || '',
    material.boardWidth || '',
    Boolean(material.hasGrain),
    material.coating1?.name || '',
    material.coating2?.name || '',
    material.costPerSqm || '',
    material.quantity || '',
    material.reserve || '',
    material.inStock || '',
  ]));

  const buildSheet = (coatingNames: string[]) => {
    const rows = buildRows();
    if (rows.length === 0) {
      rows.push(['', '', '', 'board', '', '', '', '', false, '', '', '', '', '', '']);
    }

    const codeWidth = estimateColumnWidthByValues('Код', materials.map((m) => m.code), 110, 200);
    const nameWidth = estimateColumnWidthByValues('Название', materials.map((m) => m.name), 180, 360);
    const categoryWidth = estimateColumnWidthByValues('Категория', categoryOptions, 120, 200);

    const sheet = createManagedWorksheet(container, {
      data: rows,
      minColumns: 15,
      columns: [
        { type: 'hidden', title: 'id', name: 'id', width: 0, readOnly: true },
        { type: 'text', title: 'Код', name: 'code', width: codeWidth },
        { type: 'text', title: 'Название', name: 'name', width: nameWidth },
        { type: 'dropdown', title: 'Категория', name: 'category', width: categoryWidth, source: categoryOptions },
        { type: 'numeric', title: 'Толщина', name: 'thickness', width: 110 },
        { type: 'numeric', title: 'Плотность', name: 'density', width: 110 },
        { type: 'numeric', title: 'Длина заготовки', name: 'boardHeight', width: 140 },
        { type: 'numeric', title: 'Ширина заготовки', name: 'boardWidth', width: 140 },
        { type: 'checkbox', title: 'Grain', name: 'hasGrain', width: 80 },
        { type: 'dropdown', title: 'Покрытие 1', name: 'coating1', width: 130, source: coatingNames },
        { type: 'dropdown', title: 'Покрытие 2', name: 'coating2', width: 130, source: coatingNames },
        { type: 'numeric', title: 'Цена за м2', name: 'costPerSqm', width: 120 },
        { type: 'numeric', title: 'Количество', name: 'quantity', width: 110 },
        { type: 'numeric', title: 'Резерв', name: 'reserve', width: 110 },
        { type: 'numeric', title: 'Остаток', name: 'inStock', width: 110 },
      ],
    });

    materialsSheet = sheet;
    bindMaterialsTableHandlers();
  };

  loadCoatings()
    .then((coatingsData) => {
      coatingIdByName = new Map(coatingsData.data.map((coating) => [coating.name, coating.id]));
      buildSheet(coatingsData.data.map((coating) => coating.name));
    })
    .catch((error) => {
      console.error('Failed to load coatings:', error);
      coatingIdByName = new Map();
      buildSheet([]);
    });
}

function bindMaterialsTableHandlers() {
  const saveBtn = document.querySelector<HTMLButtonElement>('#materialsSaveTableBtn');
  const addRowBtn = document.querySelector<HTMLButtonElement>('#materialsAddRowBtn');
  const deleteBtn = document.querySelector<HTMLButtonElement>('#materialsDeleteRowBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!materialsSheet) return;
      try {
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
        const data = materialsSheet.getData();
        const columnsInfo = materialColumns;

        for (const rowData of data) {
          if (!rowData || rowData.length === 0) continue;

          // Map row data to column names using column IDs
          const row: Record<string, any> = {};
          columnsInfo.forEach((col: any, index: number) => {
            row[col.id] = rowData[index];
          });

          const isNewRow = !row.id || row.id === '';

          // Prepare payload
          const payload: Record<string, any> = {
            code: row.code || '',
            name: row.name || '',
            category: row.category || 'board',
            thickness: row.thickness ? parseFloat(row.thickness) : null,
            density: row.density ? parseFloat(row.density) : null,
            boardHeight: row.boardHeight ? parseFloat(row.boardHeight) : null,
            boardWidth: row.boardWidth ? parseFloat(row.boardWidth) : null,
            hasGrain: Boolean(row.hasGrain),
            costPerSqm: row.costPerSqm ? parseFloat(row.costPerSqm) : null,
            quantity: row.quantity ? parseFloat(row.quantity) : 0,
            reserve: row.reserve ? parseFloat(row.reserve) : 0,
            inStock: row.inStock ? parseFloat(row.inStock) : null,
          };

          const coating1Name = String(row.coating1 || '').trim();
          const coating2Name = String(row.coating2 || '').trim();
          const coating1Id = coating1Name ? coatingIdByName.get(coating1Name) : undefined;
          const coating2Id = coating2Name ? coatingIdByName.get(coating2Name) : undefined;

          if (coating1Id) payload.coating1Id = coating1Id;
          if (coating2Id) payload.coating2Id = coating2Id;

          if (!payload.code || !payload.name) {
            console.warn('Skipping row: missing code or name', row);
            continue;
          }

          try {
            if (isNewRow) {
              // POST new material
              const result = await api('/materials', {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              console.log('Material created:', result);
            } else {
              // PATCH existing material
              const result = await api(`/materials/${row.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
              });
              console.log('Material updated:', result);
            }
          } catch (error) {
            console.error('Error saving material:', error);
          }
        }

        await renderApp('Материалы сохранены');
      } catch (error) {
        console.error('Error saving materials:', error);
        await renderApp((error as Error).message, true);
      }
    });
  }

  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      if (!materialsSheet) return;
      const rowCount = materialsSheet.getData().length;
      materialsSheet.insertRow(['', '', '', 'board', '', '', '', '', false, '', '', '', '', '', ''], rowCount);
    });
  }

  const copyRowBtn = document.querySelector<HTMLButtonElement>('#materialsCopyRowBtn');
  if (copyRowBtn) {
    copyRowBtn.addEventListener('click', () => {
      if (!materialsSheet) return;
      duplicateSelectedWorksheetRows(materialsSheet);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!materialsSheet) return;
      const rows = getSelectedWorksheetRows(materialsSheet);
      if (rows.length === 0) {
        console.warn('No rows selected');
        return;
      }

      try {
        for (const rowIndex of [...rows].sort((left, right) => right - left)) {
          const data = materialsSheet.getData();
          const rowData = data[rowIndex];

          if (!rowData || rowData.length === 0) continue;

          const materialId = String(rowData[0] || '').trim();
          if (materialId) {
            await api(`/materials/${materialId}`, {
              method: 'DELETE',
            });
          }
          materialsSheet.deleteRow(rowIndex, 1);
        }
        console.log('Material deleted');
      } catch (error) {
        console.error('Error deleting material:', error);
        await renderApp((error as Error).message, true);
      }
    });
  }
}

function getSelectedEmployeeRowIndex(): number {
  if (!companyEmployeesSheet) return -1;
  const rows = companyEmployeesSheet.getSelectedRows(false);
  if (rows.length > 0) return rows[0];
  const selection = companyEmployeesSheet.getSelection();
  if (selection) return Math.max(0, Math.min(selection[1], selection[3]));
  return -1;
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

  return `<section class="panel"><div class="header-actions" style="margin-bottom:12px;justify-content:space-between;"><h2>Заказ ${editingOrderNumber}</h2><div class="header-actions"><button type="button" id="editorShowPreviewBtn" class="btn btn-secondary${isPreviewVisible ? ' is-active' : ''}">Превью</button>${isAdmin() ? `<button type="button" id="editorShowColumnsBtn" class="btn btn-secondary${isColumnsEditorOpen ? ' is-active' : ''}">Редактор колонок</button>` : ''}<button type="button" id="editorSaveBtn" class="btn">${buttonContent('Сохранить', 'save')}</button></div></div><div class="editor-split${isPreviewVisible ? '' : ' preview-hidden'}" id="editorSplit" style="--editor-main-width:${editorSplitRatio}%"><div class="editor-grid-stack"><div class="order-grid" id="orderGrid"></div><div class="editor-grid-tools"><button type="button" id="editorAddRowBottomBtn" class="btn btn-secondary">${buttonContent('+', 'add')}</button><button type="button" id="editorCopyLastRowBtn" class="btn btn-secondary">${buttonContent('Copy', 'copy')}</button><button type="button" id="editorDeleteRowBtn" class="btn btn-secondary">${buttonContent('Del', 'delete')}</button></div></div><div class="editor-divider${isPreviewVisible ? '' : ' is-hidden'}" id="editorDivider" role="separator" aria-orientation="vertical" aria-label="Resize preview"></div><aside class="panel preview-panel${isPreviewVisible ? '' : ' is-hidden'}" id="editorPreviewPanel"><h3>Превью</h3><div id="editorPreviewBody">${row ? `<div><strong>Строка:</strong> ${row.idx}</div><div><strong>№:</strong> ${row.manualNumber || '-'}</div><div><strong>T:</strong> ${row.elementType || '-'}</div><div><strong>Размер:</strong> ${row.width} x ${row.height}</div><div><strong>Q:</strong> ${row.quantity}</div><div><strong>M:</strong> ${row.materialCode || '-'}</div><div><strong>D:</strong> ${row.designCode || '-'}</div><div><strong>S:</strong> ${row.edging || '-'}</div><div><strong>DEC:</strong> ${row.decor || '-'}</div><div><strong>MOD:</strong> ${row.modification || '-'}</div><div><strong>ATT:</strong> ${row.attachments || '-'}</div>` : '<div>Нет строк для превью</div>'}</div><p class="preview-hint">Если выделено несколько строк, показывается первая по порядку.</p></aside></div>${columnsOverlay}</section>`;
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

const VALID_ORDER_COL_TYPES = new Set(['numeric', 'dropdown', 'autocomplete', 'checkbox', 'radio', 'calendar', 'image', 'color', 'html', 'hidden']);

function normalizeColumnType(type: unknown): OrderColumnConfig['type'] {
  return VALID_ORDER_COL_TYPES.has(type as string) ? type as OrderColumnConfig['type'] : 'text';
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
  saveColumnsToStorage(getOrderColumnsStorageKey(), orderColumns);
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
      moveArrayElements(orderColumns, oldPosition, newPosition, quantity);
      saveColumnsToStorage(getOrderColumnsStorageKey(), orderColumns);
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
  document.querySelector<HTMLButtonElement>('#reloadBtn')?.addEventListener('click', () => {
    persistOrdersTableFilters(ordersSheet);
    void renderApp('Данные обновлены');
  });
  document.querySelector<HTMLButtonElement>('#logoutBtn')?.addEventListener('click', () => {
    persistOrdersTableFilters(ordersSheet);
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
      persistOrdersTableFilters(ordersSheet);
      const menu = button.dataset.menu || 'dashboard';
      if (menu === 'db') {
        dbExpanded = !dbExpanded;
        localStorage.setItem(DB_MENU_EXPANDED_KEY, dbExpanded ? '1' : '0');
      } else if (menu === 'company') {
        companyExpanded = !companyExpanded;
        localStorage.setItem(COMPANY_MENU_EXPANDED_KEY, companyExpanded ? '1' : '0');
        activeMenu = 'company:overview';
        localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
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

  if (needsOnboarding()) {
    return renderOnboarding(message, isError);
  }

  if (activeMenu === 'company') {
    activeMenu = 'company:overview';
    localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
  }

  if (activeMenu === 'company:statuses' && !isAdmin()) {
    activeMenu = 'company:overview';
    localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
  }

  const allowedMenus = getAllowedMenus();
  if (!allowedMenus.includes(activeMenu) && !activeMenu.startsWith('db:') && !activeMenu.startsWith('company:')) {
    activeMenu = allowedMenus[0] || 'dashboard';
    localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
  }

  let customers: Paged<Customer> = { data: [], total: 0, page: 1, limit: 20 };
  let orders: Paged<Order> = { data: [], total: 0, page: 1, limit: 20 };
  let materials: Paged<Material> = { data: [], total: 0, page: 1, limit: 20 };
  let coatings: Paged<Coating> = { data: [], total: 0, page: 1, limit: 20 };
  let designs: Paged<Design> = { data: [], total: 0, page: 1, limit: 20 };
  let users: User[] = [];
  let roles: Role[] = [];
  let bans: Ban[] = [];
  let reviewQueue: ReviewQueueItem[] = [];
  let companies: Company[] = [];
  let orderStatuses: OrderStatus[] = [];
  let myCompany: Company | null = null;
  let companyEmployees: CompanyEmployee[] = [];

  if (activeMenu === 'dashboard') [customers, orders, materials] = await Promise.all([loadCustomers(), loadOrders(), loadMaterials()]);
  if (isAdmin()) {
    reviewQueue = (await loadReviewQueue()).data;
  }
  if (activeMenu === 'company:customers') customers = await loadCustomers();
  if (activeMenu === 'company:orders') {
    if (isClient()) {
      [orders, orderStatuses] = await Promise.all([loadOrders(), loadOrderStatuses().then((x) => x.data)]);
    } else {
      [orders, customers, orderStatuses] = await Promise.all([
        loadOrders(),
        loadCustomers(),
        loadOrderStatuses().then((x) => x.data),
      ]);
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
  if (activeMenu === 'db:coatings') coatings = await loadCoatings();
  if (activeMenu === 'db:designs') designs = await loadDesigns();
  if (activeMenu === 'company:employees' && isAdmin()) {
    [roles, companies, users] = await Promise.all([
      loadRoles().then((x) => x.data),
      loadCompanies().then((x) => x.data),
      loadUsers().then((x) => x.data),
    ]);
    const usersAsAny = users as Array<User & { company?: { name?: string | null } }>;
    companyEmployees = usersAsAny
      .filter((user) => !user.deletedAt)
      .map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        userStatus: user.userStatus || 'review',
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        positionTitle: user.profile?.positionTitle || '',
        roleCode: user.role?.code || null,
        roleName: user.role?.name || null,
        companyName: user.profile?.companyName || user.company?.name || '',
        reviewNote: user.reviewNote || '',
      }));

    reviewQueue = companyEmployees
      .filter((item) => item.userStatus !== 'approved')
      .map((item) => ({
        id: item.id,
        username: item.username,
        email: item.email,
        userStatus: item.userStatus,
        reviewNote: item.reviewNote,
        firstName: item.firstName,
        lastName: item.lastName,
        positionTitle: item.positionTitle,
        companyName: item.companyName || '',
        roleCode: item.roleCode || null,
      }));
  }
  if (activeMenu === 'company:roles' && isAdmin()) {
    roles = (await loadRoles()).data;
  }
  if (activeMenu === 'company:statuses' && isAdmin()) {
    [orderStatuses, roles, companies, users] = await Promise.all([
      loadOrderStatuses().then((x) => x.data),
      loadRoles().then((x) => x.data),
      loadCompanies().then((x) => x.data),
      loadUsers().then((x) => x.data),
    ]);
    const usersAsAny = users as Array<User & { company?: { name?: string | null } }>;
    companyEmployees = usersAsAny
      .filter((user) => !user.deletedAt)
      .filter((user) => (user.userStatus || 'review') === 'approved')
      .map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        userStatus: user.userStatus || 'review',
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        positionTitle: user.profile?.positionTitle || '',
        roleCode: user.role?.code || null,
        roleName: user.role?.name || null,
        companyName: user.profile?.companyName || user.company?.name || '',
        reviewNote: user.reviewNote || '',
      }));
  }
  if (activeMenu === 'company:overview' && isAdmin()) {
    companies = (await loadCompanies()).data;
  }
  if (activeMenu.startsWith('company:') && !isAdmin()) {
    myCompany = (await loadMyCompany()).company;
    if (activeMenu === 'company:employees' && myCompany?.id) {
      companyEmployees = (await loadCompanyEmployees(myCompany.id)).data;
    }
  }

  let content = '<section class="panel"><h2>Раздел недоступен</h2></section>';
  if (activeMenu === 'dashboard') content = renderDashboard(customers, orders, materials);
  if (activeMenu === 'company:overview') content = renderCompanyOverview(companies, myCompany);
  if (activeMenu === 'company:customers') content = renderCustomers(customers);
  if (activeMenu === 'company:orders') content = editingOrderId ? renderOrderEditor() : renderOrders();
  if (activeMenu === 'company:statuses' && isAdmin()) content = renderOrderStatusesManager();
  if (activeMenu === 'company:employees') content = renderCompanyEmployees(reviewQueue, roles, companies, companyEmployees);
  if (activeMenu === 'company:roles' && isAdmin()) content = renderRoles(roles);
  if (activeMenu === 'db:materials') content = renderDbMaterials();
  if (activeMenu === 'db:coatings') content = renderDbCoatings();
  if (activeMenu === 'db:designs') content = renderDbDesigns(designs);
  if (activeMenu.startsWith('db:') && !['db:materials', 'db:coatings', 'db:designs'].includes(activeMenu)) content = renderDbPlaceholder(dbMenuItems.find((x) => x.key === activeMenu)?.label || activeMenu);

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
        ${renderSidebar(allowedMenus, reviewQueue.length)}
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

  document.querySelector<HTMLButtonElement>('#ordersAddRowBtn')?.addEventListener('click', () => {
    if (!ordersSheet) return;
    const defaultStatus = orderStatuses.find((status) => status.is_active !== false)?.code || 'client_draft';
    const row = ordersTableColumns.map((column) => getOrderTableDefaultValueByColumn(column.id, defaultStatus));
    ordersSheet.insertRow(row);
  });

  document.querySelector<HTMLElement>('#ordersGrid')?.addEventListener('click', async (event) => {
    setTimeout(() => {
      persistOrdersTableFilters(ordersSheet);
    }, 0);

    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('.orders-edit-btn');
    if (!button || !ordersSheet) return;

    const rowNode = button.closest('tr');
    const rowIndex = Number(rowNode?.getAttribute('data-y') ?? -1);
    if (!Number.isInteger(rowIndex) || rowIndex < 0) return;

    const rows = ordersSheet.getData(false, false) || [];
    const orderId = String(getOrdersTableCell(rows[rowIndex] || [], 'id') || '').trim();
    if (!orderId) {
      await renderApp('Сначала сохраните новую строку заказа', true);
      return;
    }

    persistOrdersTableFilters(ordersSheet);

    editingOrderId = orderId;
    previewRowIndex = 0;
    isColumnsEditorOpen = false;
    await renderApp();
  });

  document.querySelector<HTMLElement>('#ordersGrid')?.addEventListener('keyup', () => {
    persistOrdersTableFilters(ordersSheet);
  });

  document.querySelector<HTMLButtonElement>('#ordersSaveTableBtn')?.addEventListener('click', async () => {
    const rows = ordersSheet?.getData(false, false) || [];
    const prepared = rows
      .map((row, index) => ({
        index,
        id: String(getOrdersTableCell(row, 'id') || '').trim(),
        customerId: String(getOrdersTableCell(row, 'customerId') || '').trim(),
        orderNumber: String(getOrdersTableCell(row, 'orderNumber') || '').trim(),
        customerName: String(getOrdersTableCell(row, 'customerName') || '').trim(),
        statusCode: String(getOrdersTableCell(row, 'statusCode') || '').trim(),
        startDate: formatDateCell(String(getOrdersTableCell(row, 'startDate') || '').trim() || null),
        dueDate: formatDateCell(String(getOrdersTableCell(row, 'dueDate') || '').trim() || null),
      }))
      .filter((row) => row.id || row.customerId || row.customerName || row.orderNumber || row.statusCode || row.startDate || row.dueDate);

    if (prepared.length === 0) {
      await renderApp('Нет данных заказов для сохранения', true);
      return;
    }

    const numberMap = new Map<string, number>();
    for (const row of prepared) {
      if (!row.orderNumber) continue;
      const key = row.orderNumber.toLowerCase();
      numberMap.set(key, (numberMap.get(key) || 0) + 1);
      if ((numberMap.get(key) || 0) > 1) {
        await renderApp(`Повтор номера заказа в строке ${row.index + 1}: ${row.orderNumber}`, true);
        return;
      }
    }

    const customerByName = new Map(customers.data.map((customer) => [customer.name, customer.id]));
    const defaultStatus = orderStatuses.find((status) => status.is_active !== false)?.code || 'client_draft';
    persistOrdersTableFilters(ordersSheet);

    try {
      for (const row of prepared) {
        const resolvedCustomerId = row.customerId || customerByName.get(row.customerName) || '';
        const payload = {
          customerId: isClient() ? undefined : (resolvedCustomerId || undefined),
          orderName: row.orderNumber || undefined,
          status: row.statusCode || defaultStatus,
          startDate: row.startDate || undefined,
          dueDate: row.dueDate || undefined,
        };

        if (!isClient() && !payload.customerId) {
          await renderApp(`Строка ${row.index + 1}: выберите клиента`, true);
          return;
        }

        if (row.id) {
          await api(`/orders/${row.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } else {
          await api('/orders', {
            method: 'POST',
            body: JSON.stringify({ ...payload, items: [] }),
          });
        }
      }

      await renderApp(`Заказы сохранены: ${prepared.length}`);
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });

  document.querySelector<HTMLButtonElement>('#statusesAddRowBtn')?.addEventListener('click', () => {
    statusesSheet?.insertRow(['', '', '', 'client', true, 100, '']);
  });

  document.querySelector<HTMLButtonElement>('#statusesCopyRowBtn')?.addEventListener('click', () => {
    duplicateSelectedWorksheetRows(statusesSheet);
  });

  document.querySelector<HTMLButtonElement>('#statusesDeleteRowBtn')?.addEventListener('click', () => {
    deleteSelectedWorksheetRows(statusesSheet);
  });

  document.querySelector<HTMLButtonElement>('#statusesSaveTableBtn')?.addEventListener('click', async () => {
    const rows = statusesSheet?.getData(false, false) || [];
    const employeeIdByLabel = new Map(companyEmployees.map((employee) => [`${employee.username} (${employee.email})`, employee.id]));
    const prepared = rows
      .map((row, index) => ({
        index,
        id: String(row?.[0] || '').trim(),
        code: String(row?.[1] || '').trim(),
        name: String(row?.[2] || '').trim(),
        stage: String(row?.[3] || '').trim(),
        isActive: Boolean(row?.[4]),
        sortOrder: Number(row?.[5] || 100),
        responsibleUserIds: normalizeMultiCellValue(row?.[6]).map((label) => employeeIdByLabel.get(label)).filter(Boolean),
      }))
      .filter((row) => row.id || row.code || row.name);

    if (prepared.length === 0) {
      await renderApp('Нет данных статусов для сохранения', true);
      return;
    }

    const codeSet = new Set<string>();
    for (const row of prepared) {
      if (!row.code || !row.name || !row.stage) {
        await renderApp(`Строка ${row.index + 1}: заполните код, название и этап`, true);
        return;
      }
      const normalizedCode = row.code.toLowerCase();
      if (codeSet.has(normalizedCode)) {
        await renderApp(`Повтор кода статуса в строке ${row.index + 1}: ${row.code}`, true);
        return;
      }
      codeSet.add(normalizedCode);
    }

    try {
      for (const row of prepared) {
        const payload = {
          code: row.code,
          name: row.name,
          stage: row.stage,
          isActive: row.isActive,
          sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : 100,
          responsibleUserIds: row.responsibleUserIds,
        };

        if (row.id) {
          await api(`/order-statuses/${row.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } else {
          await api('/order-statuses', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
      }

      await renderApp(`Статусы сохранены: ${prepared.length}`);
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
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
      saveColumnsToStorage(getOrderColumnsStorageKey(), orderColumns);
      await reinitSheet();
    });

    bindColumnDragHandlers('.admin-col-row', () => orderColumns, (cols) => { orderColumns = cols; saveColumnsToStorage(getOrderColumnsStorageKey(), orderColumns); }, async () => { await reinitSheet(); });

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
        saveColumnsToStorage(getOrderColumnsStorageKey(), orderColumns);
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
      saveColumnsToStorage(getOrderColumnsStorageKey(), orderColumns);
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

  if (activeMenu === 'company:orders' && editingOrderId) {
    initOrderGrid(materials.data, designs.data);
    bindEditorSplitter();
    updatePreviewPanel();
  }

  if (activeMenu === 'company:orders' && !editingOrderId) {
    initOrdersGrid(orders.data, customers.data, orderStatuses);
  }

  if (activeMenu === 'company:orders' && !editingOrderId && isAdmin()) {
    document.querySelector<HTMLButtonElement>('#ordersShowColumnsBtn')?.addEventListener('click', async () => {
      isOrdersTableColumnsEditorOpen = !isOrdersTableColumnsEditorOpen;
      await renderApp();
    });

    document.querySelector<HTMLButtonElement>('#ordersCloseColumnsBtn')?.addEventListener('click', async () => {
      isOrdersTableColumnsEditorOpen = false;
      await renderApp();
    });

    document.querySelector<HTMLElement>('#ordersColumnsOverlay')?.addEventListener('click', async (event) => {
      if (event.target === event.currentTarget) {
        isOrdersTableColumnsEditorOpen = false;
        await renderApp();
      }
    });

    bindColumnDragHandlers('.orders-col-row', () => ordersTableColumns, (cols) => { ordersTableColumns = cols; }, () => saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns));

    bindAddColumnForm<OrdersTableColumnConfig>('ordersAddColumnForm', 'ordersNewColumnTitle', 'ordersNewColumnType', () => ordersTableColumns, (cols) => { ordersTableColumns = cols; }, () => saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns), (title, typeValue) => {
      const type: OrdersTableColumnConfig['type'] = typeValue === 'dropdown' ? 'dropdown' : typeValue === 'calendar' ? 'calendar' : typeValue === 'html' ? 'html' : 'text';
      return { id: `custom_${Date.now()}`, title, width: Math.max(120, Math.min(320, title.length * 9 + 24)), type, isCustom: true };
    });

    bindDeleteColumnButtons('.orders-col-delete-btn', () => ordersTableColumns, (cols) => { ordersTableColumns = cols; }, () => saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns), (col) => isFixedBaseColumn(col, BASE_ORDERS_TABLE_COLUMNS));

    document.querySelector<HTMLButtonElement>('#ordersSaveColumnsConfigBtn')?.addEventListener('click', async () => {
      bindSaveColumnsConfig('.orders-col-title-input', '.orders-col-width-input', () => ordersTableColumns, (cols) => { ordersTableColumns = cols; }, () => saveColumnsToStorage(getOrdersTableColumnsStorageKey(), ordersTableColumns), () => { isOrdersTableColumnsEditorOpen = false; });
      await renderApp('Конфиг колонок заказов сохранен');
    });
  }

  if (activeMenu === 'company:statuses' && isAdmin()) {
    initStatusesGrid(orderStatuses, companyEmployees);
  }

  if (activeMenu === 'company:overview' && isAdmin()) {
    initCompaniesGrid(companies);
  }

  if (activeMenu === 'company:employees') {
    initCompanyEmployeesGrids(companyEmployees, companies, roles);
  }

  if (activeMenu === 'db:materials') {
    initMaterialsGrid(materials.data);
  }

  if (activeMenu === 'db:coatings') {
    initCoatingsGrid(coatings.data);
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

  if (activeMenu === 'company:overview' && isAdmin()) {
    document.querySelector<HTMLButtonElement>('#companyShowColumnsBtn')?.addEventListener('click', async () => {
      isCompanyColumnsEditorOpen = !isCompanyColumnsEditorOpen;
      await renderApp();
    });

    document.querySelector<HTMLButtonElement>('#companyCloseColumnsBtn')?.addEventListener('click', async () => {
      isCompanyColumnsEditorOpen = false;
      await renderApp();
    });

    document.querySelector<HTMLElement>('#companyColumnsOverlay')?.addEventListener('click', async (event) => {
      if (event.target === event.currentTarget) {
        isCompanyColumnsEditorOpen = false;
        await renderApp();
      }
    });

    document.querySelector<HTMLButtonElement>('#companyAddRowBtn')?.addEventListener('click', () => {
      if (!companyOverviewSheet) return;
      companyOverviewSheet.insertRow();
    });

    document.querySelector<HTMLButtonElement>('#companyCopyRowBtn')?.addEventListener('click', () => {
      duplicateSelectedWorksheetRows(companyOverviewSheet);
    });

    document.querySelector<HTMLButtonElement>('#companyDeleteRowBtn')?.addEventListener('click', () => {
      deleteSelectedWorksheetRows(companyOverviewSheet);
    });

    document.querySelector<HTMLButtonElement>('#companySaveTableBtn')?.addEventListener('click', async () => {
      const rows = companyOverviewSheet?.getData(false, false) || [];
      const rowsToSave = rows
        .map((row, index) => ({
          index,
          id: String(getCompanyCell(row, 'id') || '').trim(),
          name: String(getCompanyCell(row, 'name') || '').trim(),
          legalName: String(getCompanyCell(row, 'legalName') || '').trim(),
          contactEmail: String(getCompanyCell(row, 'contactEmail') || '').trim(),
          website: String(getCompanyCell(row, 'website') || '').trim(),
        }))
        .filter((row) => row.id || row.name || row.legalName || row.contactEmail || row.website);

      if (rowsToSave.length === 0) {
        await renderApp('Нет данных компаний для сохранения', true);
        return;
      }

      for (const row of rowsToSave) {
        if (!row.name) {
          await renderApp(`Строка ${row.index + 1}: заполните Название`, true);
          return;
        }
      }

      try {
        for (const row of rowsToSave) {
          const payload = {
            name: row.name,
            legalName: row.legalName || null,
            contactEmail: row.contactEmail || null,
            website: row.website || null,
          };
          if (row.id) {
            await api(`/companies/${row.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
          } else {
            await api('/companies', { method: 'POST', body: JSON.stringify(payload) });
          }
        }
        await renderApp(`Компании сохранены: ${rowsToSave.length}`);
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });

    bindColumnDragHandlers('.company-col-row', () => companyColumns, (cols) => { companyColumns = cols; }, () => saveColumnsToStorage(getCompanyColumnsStorageKey(), companyColumns));

    bindAddColumnForm<CompanyColumnConfig>('companyAddColumnForm', 'companyNewColumnTitle', 'companyNewColumnType', () => companyColumns, (cols) => { companyColumns = cols; }, () => saveColumnsToStorage(getCompanyColumnsStorageKey(), companyColumns), (title, typeValue) => ({ id: `custom_${Date.now()}`, title, width: 160, type: typeValue === 'dropdown' ? 'dropdown' : 'text', isCustom: true }));

    bindDeleteColumnButtons('.company-col-delete-btn', () => companyColumns, (cols) => { companyColumns = cols; }, () => saveColumnsToStorage(getCompanyColumnsStorageKey(), companyColumns), (col) => isFixedBaseColumn(col, BASE_COMPANY_COLUMNS));

    document.querySelector<HTMLButtonElement>('#companySaveColumnsConfigBtn')?.addEventListener('click', async () => {
      bindSaveColumnsConfig('.company-col-title-input', '.company-col-width-input', () => companyColumns, (cols) => { companyColumns = cols; }, () => saveColumnsToStorage(getCompanyColumnsStorageKey(), companyColumns), () => { isCompanyColumnsEditorOpen = false; });
      await renderApp('Конфиг колонок компаний сохранен');
    });
  }

  if (activeMenu === 'company:employees' && isAdmin()) {
    const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));
    const companyIdByName = new Map(companies.map((company) => [company.name, company.id]));

    document.querySelector<HTMLButtonElement>('#employeesShowColumnsBtn')?.addEventListener('click', async () => {
      isEmployeeColumnsEditorOpen = !isEmployeeColumnsEditorOpen;
      await renderApp();
    });

    document.querySelector<HTMLButtonElement>('#employeesCloseColumnsBtn')?.addEventListener('click', async () => {
      isEmployeeColumnsEditorOpen = false;
      await renderApp();
    });

    document.querySelector<HTMLButtonElement>('#employeesDeleteRowBtn')?.addEventListener('click', () => {
      void deleteSelectedEmployeeRows();
    });

    document.querySelector<HTMLElement>('#employeeColumnsOverlay')?.addEventListener('click', async (event) => {
      if (event.target === event.currentTarget) {
        isEmployeeColumnsEditorOpen = false;
        await renderApp();
      }
    });

    bindColumnDragHandlers('.employee-col-row', () => employeeColumns, (cols) => { employeeColumns = cols; }, () => saveColumnsToStorage(getEmployeeColumnsStorageKey(), employeeColumns));

    document.querySelector<HTMLButtonElement>('#employeesSaveColumnsConfigBtn')?.addEventListener('click', async () => {
      bindSaveColumnsConfig('.employee-col-title-input', '.employee-col-width-input', () => employeeColumns, (cols) => { employeeColumns = cols; }, () => saveColumnsToStorage(getEmployeeColumnsStorageKey(), employeeColumns), () => { isEmployeeColumnsEditorOpen = false; });
      await renderApp('Конфиг колонок сотрудников сохранен');
    });

    bindAddColumnForm<EmployeeColumnConfig>('employeesAddColumnForm', 'employeesNewColumnTitle', 'employeesNewColumnType', () => employeeColumns, (cols) => { employeeColumns = cols; }, () => saveColumnsToStorage(getEmployeeColumnsStorageKey(), employeeColumns), (title, typeValue) => ({ id: `custom_${Date.now()}`, title, width: 160, type: typeValue === 'dropdown' ? 'dropdown' : 'text', isCustom: true }));

    bindDeleteColumnButtons('.employee-col-delete-btn', () => employeeColumns, (cols) => { employeeColumns = cols; }, () => saveColumnsToStorage(getEmployeeColumnsStorageKey(), employeeColumns), (col) => isFixedBaseColumn(col, BASE_EMPLOYEE_COLUMNS));

    document.querySelector<HTMLButtonElement>('#saveEmployeeRowBtn')?.addEventListener('click', async () => {
      const employeeRows = companyEmployeesSheet?.getData(false, false) || [];
      const rowsToSave = employeeRows
        .map((row, index) => ({
          index,
          userId: String(getEmployeeCell(row, 'id') || '').trim(),
          lifecycle: String(getEmployeeCell(row, 'lifecycle') || '').trim(),
          roleCode: String(getEmployeeCell(row, 'roleCode') || '').trim(),
          companyName: String(getEmployeeCell(row, 'companyName') || '').trim(),
          reviewNote: String(getEmployeeCell(row, 'reviewNote') || '').trim(),
          positionTitle: String(getEmployeeCell(row, 'positionTitle') || '').trim(),
        }))
        .filter((row) => row.userId);

      if (rowsToSave.length === 0) {
        await renderApp('Нет строк с пользователями для сохранения', true);
        return;
      }

      try {
        let demotedToReview = 0;
        let protectedSelfRows = 0;
        for (const row of rowsToSave) {
          if (row.userId === currentUser?.id) {
            protectedSelfRows += 1;
            continue;
          }

          const roleId = roleIdByCode.get(row.roleCode) || null;
          const companyId = companyIdByName.get(row.companyName) || '';
          const normalizedLifecycle = ['approved', 'review'].includes(row.lifecycle) ? row.lifecycle : 'review';
          const canBeApproved = Boolean(companyId && roleId);
          const effectiveLifecycle = normalizedLifecycle === 'approved' && canBeApproved ? 'approved' : 'review';
          if (normalizedLifecycle === 'approved' && effectiveLifecycle === 'review') {
            demotedToReview += 1;
          }

          await api(`/users/${row.userId}/company-membership`, {
            method: 'PATCH',
            body: JSON.stringify({
              lifecycle: effectiveLifecycle,
              companyId: effectiveLifecycle === 'approved' ? companyId : null,
              roleId: effectiveLifecycle === 'approved' ? roleId : null,
              positionTitle: row.positionTitle || null,
              reviewNote: row.reviewNote || null,
            }),
          });
        }
        if (protectedSelfRows > 0 && demotedToReview > 0) {
          await renderApp(`Сохранено строк: ${rowsToSave.length}. Защищено от self-review: ${protectedSelfRows}. Переведено в review без назначения: ${demotedToReview}`);
        } else if (protectedSelfRows > 0) {
          await renderApp(`Сохранено строк: ${rowsToSave.length}. Защищено от self-review: ${protectedSelfRows}`);
        } else if (demotedToReview > 0) {
          await renderApp(`Сохранено строк: ${rowsToSave.length}. Переведено в review без назначения: ${demotedToReview}`);
        } else {
          await renderApp(`Сохранено строк: ${rowsToSave.length}`);
        }
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });

    const deleteSelectedEmployeeRows = async () => {
      if (!companyEmployeesSheet) {
        await renderApp('Таблица сотрудников недоступна', true);
        return;
      }

      const selectedRows = Array.from(new Set(companyEmployeesSheet.getSelectedRows(false))).sort((a, b) => a - b);
      let rowsToDelete = selectedRows;
      if (rowsToDelete.length === 0) {
        const selection = companyEmployeesSheet.getSelection();
        if (selection) {
          const top = Math.min(selection[1], selection[3]);
          const bottom = Math.max(selection[1], selection[3]);
          rowsToDelete = Array.from({ length: bottom - top + 1 }, (_, offset) => top + offset);
        }
      }

      if (rowsToDelete.length === 0) {
        await renderApp('Выберите строки для удаления', true);
        return;
      }

      const tableRows = companyEmployeesSheet.getData(false, false) || [];
      const userIds = rowsToDelete
        .map((rowIndex) => String(getEmployeeCell(tableRows[rowIndex] || [], 'id') || '').trim())
        .filter(Boolean);

      if (userIds.length === 0) {
        await renderApp('В выбранных строках нет пользователей для удаления', true);
        return;
      }

      if (!confirm(`Удалить пользователей: ${userIds.length}? Это деактивирует аккаунты.`)) {
        return;
      }

      try {
        for (const userId of userIds) {
          await api(`/users/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: 'Deleted from employees table by admin' }),
          });
        }
        await renderApp(`Удалено пользователей: ${userIds.length}`);
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    };

    const employeesGridEl = document.querySelector<HTMLElement>('#companyEmployeesGrid');
    employeesGridEl?.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement | null;
      const isEditingField = !!target && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
      );
      if ((event.key === 'Delete' || event.key === 'Del') && !isEditingField) {
        event.preventDefault();
        event.stopPropagation();
        void deleteSelectedEmployeeRows();
      }
    }, true);
  }

  if ((activeMenu === 'roles' || activeMenu === 'company:roles') && isAdmin()) {
    const existingByCode = new Map(roles.map((role) => [role.code, role]));
    const menuOptionSet = new Set(buildRoleMenuOptions(roles));
    const panelOptionSet = new Set(buildRolePanelOptions(roles));
    initRolesGrid(roles);

    document.querySelector<HTMLButtonElement>('#rolesAddRowBtn')?.addEventListener('click', () => {
      if (!rolesSheet) return;
      rolesSheet.insertRow();
      validateRolesSheet();
    });

    document.querySelector<HTMLButtonElement>('#rolesCopyRowBtn')?.addEventListener('click', () => {
      duplicateSelectedWorksheetRows(rolesSheet);
    });

    document.querySelector<HTMLButtonElement>('#rolesDeleteRowBtn')?.addEventListener('click', () => {
      deleteSelectedWorksheetRows(rolesSheet);
    });

    document.querySelector<HTMLButtonElement>('#rolesSaveBtn')?.addEventListener('click', async () => {
      const validation = validateRolesSheet();
      if (!validation.valid) {
        renderRolesStatus('Заполните обязательные поля: Роль, Меню, Панели', true);
        return;
      }

      try {
        for (const row of validation.rows) {
          const code = String(row[0] || '').trim();
          const title = String(row[1] || '').trim();
          const menus = uniqueStrings(normalizeMultiCellValue(row[2])).filter((value) => menuOptionSet.has(value));
          const panels = uniqueStrings(normalizeMultiCellValue(row[3])).filter((value) => panelOptionSet.has(value));

          if (!code && !title && menus.length === 0 && panels.length === 0) {
            continue;
          }

          const existing = existingByCode.get(code);
          if (existing) {
            await api(`/roles/${existing.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name: title || existing.name,
                menus,
                panels,
              }),
            });
          } else {
            await api('/roles', {
              method: 'POST',
              body: JSON.stringify({
                code,
                name: title || code,
                menus,
                panels,
                permissions: [],
              }),
            });
          }
        }

        await renderApp('Роли сохранены');
      } catch (error) {
        renderRolesStatus((error as Error).message, true);
      }
    });

    const gridRoot = document.querySelector<HTMLDivElement>('#rolesGrid');
    gridRoot?.addEventListener('keyup', () => {
      validateRolesSheet();
      renderRolesStatus('');
    });
    gridRoot?.addEventListener('change', () => {
      validateRolesSheet();
      renderRolesStatus('');
    });
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
