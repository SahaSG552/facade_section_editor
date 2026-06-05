import './styles.css';

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
  isActive: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  deletedAt: string | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  created_at: string;
};

type Ban = {
  id: string;
  kind: 'email' | 'username';
  value: string;
  reason: string | null;
  created_at: string;
};

type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

const API_BASE = 'http://127.0.0.1:3000/api/v1';
const TOKEN_KEY = 'om_token';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

let token: string | null = localStorage.getItem(TOKEN_KEY);
let currentUser: User | null = null;

function hasPanel(panel: string) {
  return currentUser?.role?.panels.includes(panel) ?? false;
}

function statusHtml(message: string, isError = false) {
  return `<div class="status${isError ? ' error' : ''}">${message}</div>`;
}

function parseCsv(input: string) {
  return input.split(',').map((x) => x.trim()).filter(Boolean);
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

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

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

  const loginForm = document.querySelector<HTMLFormElement>('#loginForm');
  const registerForm = document.querySelector<HTMLFormElement>('#registerForm');

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const login = (document.querySelector<HTMLInputElement>('#login')?.value || '').trim();
    const password = document.querySelector<HTMLInputElement>('#password')?.value || '';

    try {
      const result = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });

      token = result.token;
      localStorage.setItem(TOKEN_KEY, token);
      currentUser = result.user;
      await renderApp('Успешный вход');
    } catch (error) {
      renderLogin(`Ошибка входа: ${(error as Error).message}`);
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
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

function renderMenu(role: Role | null) {
  if (!role) return '<span class="pill">no-role</span>';
  return role.menus.map((menu) => `<span class="pill">${menu}</span>`).join('');
}

async function loadMe() {
  return api<{ user: User }>('/auth/me');
}

async function loadCustomers() {
  return api<Paged<Customer>>('/customers');
}

async function loadOrders() {
  return api<Paged<Order>>('/orders');
}

async function loadRoles() {
  return api<{ data: Role[] }>('/roles');
}

async function loadUsers() {
  return api<{ data: User[] }>('/users');
}

async function loadBans() {
  return api<{ data: Ban[] }>('/bans');
}

function userState(user: User) {
  if (user.deletedAt) return 'deleted';
  if (user.isBlocked) return 'blocked';
  if (!user.role) return 'pending-role';
  return 'active';
}

async function renderApp(message = '', isError = false) {
  if (!token) {
    renderLogin();
    return;
  }

  try {
    const me = await loadMe();
    currentUser = me.user;
  } catch (error) {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    renderLogin(`Сессия завершена: ${(error as Error).message}`);
    return;
  }

  const isAdmin = currentUser.role?.code === 'admin';

  const [customers, orders, roles, users, bans] = await Promise.all([
    hasPanel('customersTable') ? loadCustomers() : Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
    hasPanel('ordersTable') ? loadOrders() : Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
    isAdmin ? loadRoles() : Promise.resolve({ data: [] }),
    isAdmin ? loadUsers() : Promise.resolve({ data: [] }),
    isAdmin ? loadBans() : Promise.resolve({ data: [] }),
  ]);

  app.innerHTML = `
    <main class="layout">
      <header class="header">
        <div>
          <h1>Order Manager</h1>
          <div class="subtitle">Пользователь: ${currentUser.displayName || currentUser.username} | Роль: ${currentUser.role?.name || 'not assigned'}</div>
          <div class="menu-strip">${renderMenu(currentUser.role)}</div>
        </div>
        <div class="header-actions">
          <button id="reloadBtn" class="btn btn-secondary" type="button">Обновить</button>
          <button id="logoutBtn" class="btn" type="button">Выйти</button>
        </div>
      </header>

      ${message ? statusHtml(message, isError) : ''}

      ${hasPanel('customersTable') ? `
      <section class="panel">
        <h2>Клиенты</h2>
        <form id="customerForm" class="grid">
          <label>Название<input id="customerName" required /></label>
          <label>Email<input id="customerEmail" type="email" /></label>
          <button class="btn" type="submit">Создать клиента</button>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Название</th><th>Email</th></tr></thead>
            <tbody>${customers.data.map((c) => `<tr><td>${c.id}</td><td>${c.name}</td><td>${c.email ?? ''}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>` : ''}

      ${hasPanel('ordersTable') ? `
      <section class="panel">
        <h2>Заказы</h2>
        <form id="orderForm" class="grid">
          <label>Клиент
            <select id="orderCustomer" required>
              ${customers.data.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </label>
          <label>Тип элемента<input id="itemType" value="facade" required /></label>
          <label>Ширина<input id="itemWidth" type="number" min="1" value="800" required /></label>
          <label>Высота<input id="itemHeight" type="number" min="1" value="600" required /></label>
          <label>Кол-во<input id="itemQty" type="number" min="1" value="1" required /></label>
          <button class="btn" type="submit">Создать заказ</button>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Номер</th><th>Клиент</th><th>Статус</th><th>Создан</th></tr></thead>
            <tbody>${orders.data.map((o) => `<tr><td>${o.id}</td><td>${o.order_number}</td><td>${o.customer_name}</td><td>${o.status}</td><td>${new Date(o.created_at).toLocaleString('ru-RU')}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>` : ''}

      ${isAdmin ? `
      <section class="panel">
        <h2>Пользователи</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${users.data.map((u) => `
                <tr>
                  <td>${u.username}</td>
                  <td>${u.email}</td>
                  <td>${u.role?.code || 'none'}</td>
                  <td>${userState(u)}</td>
                  <td>
                    <div class="row-actions">
                      <select class="assignRole" data-user-id="${u.id}">
                        <option value="">-- role --</option>
                        ${roles.data.map((r) => `<option value="${r.id}" ${u.role?.id === r.id ? 'selected' : ''}>${r.code}</option>`).join('')}
                      </select>
                      <button class="btn small assignBtn" data-user-id="${u.id}" type="button">Назначить</button>
                      <button class="btn small btn-secondary blockBtn" data-user-id="${u.id}" type="button">Блок</button>
                      <button class="btn small btn-secondary unblockBtn" data-user-id="${u.id}" type="button">Разблок</button>
                      <button class="btn small danger deleteBtn" data-user-id="${u.id}" type="button">Удалить</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Ban List</h2>
        <form id="banForm" class="grid">
          <label>Тип
            <select id="banKind"><option value="email">email</option><option value="username">username</option></select>
          </label>
          <label>Значение<input id="banValue" required /></label>
          <label>Причина<input id="banReason" /></label>
          <button class="btn" type="submit">Добавить в ban list</button>
        </form>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Value</th><th>Reason</th><th>Action</th></tr></thead>
            <tbody>
              ${bans.data.map((b) => `
                <tr>
                  <td>${b.kind}</td>
                  <td>${b.value}</td>
                  <td>${b.reason || ''}</td>
                  <td><button class="btn small btn-secondary removeBanBtn" data-ban-id="${b.id}" type="button">Убрать</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
      ` : ''}
    </main>
  `;

  const reloadBtn = document.querySelector<HTMLButtonElement>('#reloadBtn');
  const logoutBtn = document.querySelector<HTMLButtonElement>('#logoutBtn');

  reloadBtn?.addEventListener('click', () => void renderApp('Данные обновлены'));
  logoutBtn?.addEventListener('click', () => {
    token = null;
    currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    renderLogin();
  });

  const customerForm = document.querySelector<HTMLFormElement>('#customerForm');
  customerForm?.addEventListener('submit', async (event) => {
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

  const orderForm = document.querySelector<HTMLFormElement>('#orderForm');
  orderForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const customerId = (document.querySelector<HTMLSelectElement>('#orderCustomer')?.value || '').trim();
    const elementType = (document.querySelector<HTMLInputElement>('#itemType')?.value || '').trim();
    const width = Number(document.querySelector<HTMLInputElement>('#itemWidth')?.value || 0);
    const height = Number(document.querySelector<HTMLInputElement>('#itemHeight')?.value || 0);
    const quantity = Number(document.querySelector<HTMLInputElement>('#itemQty')?.value || 0);

    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({ customerId, items: [{ elementType, width, height, quantity }] }),
      });
      await renderApp('Заказ создан');
    } catch (error) {
      await renderApp((error as Error).message, true);
    }
  });

  if (isAdmin) {
    document.querySelectorAll<HTMLButtonElement>('.assignBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId || '';
        const select = document.querySelector<HTMLSelectElement>(`.assignRole[data-user-id="${userId}"]`);
        const roleId = select?.value || '';

        try {
          await api(`/users/${userId}/assign-role`, {
            method: 'PATCH',
            body: JSON.stringify({ roleId }),
          });
          await renderApp('Роль назначена');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.blockBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId || '';
        const reason = prompt('Причина блокировки', 'Blocked by admin') || 'Blocked by admin';
        try {
          await api(`/users/${userId}/block`, {
            method: 'PATCH',
            body: JSON.stringify({ reason, addEmailToBanList: true, addUsernameToBanList: true }),
          });
          await renderApp('Пользователь заблокирован');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.unblockBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId || '';
        try {
          await api(`/users/${userId}/unblock`, { method: 'PATCH' });
          await renderApp('Пользователь разблокирован');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.deleteBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId || '';
        if (!confirm('Удалить пользователя?')) return;
        try {
          await api(`/users/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: 'Deleted by admin', addEmailToBanList: false, addUsernameToBanList: false }),
          });
          await renderApp('Пользователь удален');
        } catch (error) {
          await renderApp((error as Error).message, true);
        }
      });
    });

    const banForm = document.querySelector<HTMLFormElement>('#banForm');
    banForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const kind = (document.querySelector<HTMLSelectElement>('#banKind')?.value || 'email') as 'email' | 'username';
      const value = (document.querySelector<HTMLInputElement>('#banValue')?.value || '').trim();
      const reason = (document.querySelector<HTMLInputElement>('#banReason')?.value || '').trim();
      try {
        await api('/bans', {
          method: 'POST',
          body: JSON.stringify({ kind, value, reason }),
        });
        await renderApp('Запись добавлена в ban list');
      } catch (error) {
        await renderApp((error as Error).message, true);
      }
    });

    document.querySelectorAll<HTMLButtonElement>('.removeBanBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const banId = btn.dataset.banId || '';
        try {
          await api(`/bans/${banId}`, { method: 'DELETE' });
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
