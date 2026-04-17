const TODO_ENDPOINT = "/todos";
const LOGIN_ENDPOINT = "/auth/login";
const REGISTER_ENDPOINT = "/auth/register";
const META_STORAGE_KEY = "focusflow_meta";
const THEME_STORAGE_KEY = "focusflow_theme";

const state = {
  token: localStorage.getItem("todo_token") || "",
  email: localStorage.getItem("todo_email") || "",
  todos: [],
  filter: "all",
  search: "",
  authTab: "login",
  meta: loadMeta(),
  draggedTodoId: null,
  theme: localStorage.getItem(THEME_STORAGE_KEY) || "light",
};

const elements = {
  body: document.body,
  authScreen: document.getElementById("auth-screen"),
  appScreen: document.getElementById("app-screen"),
  authTitle: document.getElementById("auth-title"),
  authCopy: document.getElementById("auth-copy"),
  authFeedback: document.getElementById("auth-feedback"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  loginSubmit: document.getElementById("login-submit"),
  registerSubmit: document.getElementById("register-submit"),
  forgotPasswordLink: document.getElementById("forgot-password-link"),
  createTodoForm: document.getElementById("create-todo-form"),
  createSubmit: document.getElementById("create-submit"),
  todoList: document.getElementById("todo-list"),
  todoCount: document.getElementById("todo-count"),
  completedCount: document.getElementById("completed-count"),
  sessionEmail: document.getElementById("session-email"),
  avatarCircle: document.getElementById("avatar-circle"),
  avatarTrigger: document.getElementById("avatar-trigger"),
  avatarDropdown: document.getElementById("avatar-dropdown"),
  profileAction: document.getElementById("profile-action"),
  logoutBtn: document.getElementById("logout-btn"),
  searchInput: document.getElementById("search-input"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  taskFeedback: document.getElementById("task-feedback"),
  taskSkeleton: document.getElementById("task-skeleton"),
  toastRegion: document.getElementById("toast-region"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  topbarLogoutBtn: document.getElementById("topbar-logout-btn"),
  mobileMenuBtn: document.getElementById("mobile-menu-btn"),
  topbarActions: document.getElementById("topbar-actions"),
};

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistMeta() {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(state.meta));
}

function getMeta(todoId) {
  return state.meta[String(todoId)] || { priority: "medium", dueDate: "", order: 0 };
}

function setMeta(todoId, partial) {
  const key = String(todoId);
  state.meta[key] = { ...getMeta(todoId), ...partial };
  persistMeta();
}

function removeMeta(todoId) {
  delete state.meta[String(todoId)];
  persistMeta();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getInitials(email) {
  if (!email) {
    return "FF";
  }

  const namePart = email.split("@")[0];
  const segments = namePart.split(/[._-]/).filter(Boolean);
  const initials = segments.slice(0, 2).map((item) => item[0].toUpperCase()).join("");
  return initials || namePart.slice(0, 2).toUpperCase();
}

function formatDate(value) {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUpdatedDate(value) {
  if (!value) {
    return "just now";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(dueDate, completed) {
  if (!dueDate || completed) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div>
      <strong>${type === "error" ? "Something went wrong" : "Done"}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss notification">x</button>
  `;

  const dismiss = () => toast.remove();
  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  elements.toastRegion.appendChild(toast);
  window.setTimeout(dismiss, 3200);
}

function setBanner(message, type = "") {
  elements.authFeedback.textContent = message;
  elements.authFeedback.className = `banner${type ? ` ${type}` : ""}`;
  elements.authFeedback.classList.toggle("hidden", !message);
}

function setTaskFeedback(message, type = "") {
  elements.taskFeedback.textContent = message;
  elements.taskFeedback.className = `inline-feedback${type ? ` ${type}` : ""}`;
  elements.taskFeedback.classList.toggle("hidden", !message);
}

function setButtonLoading(button, label) {
  const labelNode = button.querySelector(".btn-label");
  const spinner = button.querySelector(".btn-spinner");
  button.disabled = true;
  button.classList.add("is-loading");
  labelNode.dataset.originalLabel = labelNode.textContent;
  labelNode.textContent = label;
  spinner.classList.remove("hidden");
}

function resetButtonLoading(button) {
  const labelNode = button.querySelector(".btn-label");
  const spinner = button.querySelector(".btn-spinner");
  button.disabled = false;
  button.classList.remove("is-loading");
  labelNode.textContent = labelNode.dataset.originalLabel || labelNode.textContent;
  spinner.classList.add("hidden");
}

function setFieldState(inputId, message = "", type = "") {
  const input = document.getElementById(inputId);
  const field = input.closest(".field");
  const errorNode = document.querySelector(`[data-error-for="${inputId}"]`);

  field.classList.remove("has-error", "has-success");
  if (type === "error") {
    field.classList.add("has-error");
  }
  if (type === "success") {
    field.classList.add("has-success");
  }
  if (errorNode) {
    errorNode.textContent = type === "error" ? message : "";
  }
}

function clearFormValidation(form) {
  form.querySelectorAll(".field").forEach((field) => field.classList.remove("has-error", "has-success"));
  form.querySelectorAll(".field-error").forEach((node) => {
    node.textContent = "";
  });
}

function validateAuthForm(mode) {
  const emailId = mode === "login" ? "login-email" : "register-email";
  const passwordId = mode === "login" ? "login-password" : "register-password";
  const email = document.getElementById(emailId).value.trim();
  const password = document.getElementById(passwordId).value;
  const form = mode === "login" ? elements.loginForm : elements.registerForm;
  let valid = true;

  clearFormValidation(form);

  if (!email) {
    setFieldState(emailId, "Email is required.", "error");
    valid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    setFieldState(emailId, "Enter a valid email address.", "error");
    valid = false;
  } else {
    setFieldState(emailId, "", "success");
  }

  if (!password) {
    setFieldState(passwordId, "Password is required.", "error");
    valid = false;
  } else if (mode === "register" && password.length < 6) {
    setFieldState(passwordId, "Password must be at least 6 characters.", "error");
    valid = false;
  } else {
    setFieldState(passwordId, "", "success");
  }

  return valid;
}

function validateCreateForm() {
  const title = document.getElementById("todo-title").value.trim();
  setFieldState("todo-title", "", "");
  if (!title) {
    setFieldState("todo-title", "Task title is required.", "error");
    return false;
  }
  setFieldState("todo-title", "", "success");
  return true;
}

function switchAuthTab(tab) {
  state.authTab = tab;
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === tab);
  });
  elements.loginForm.classList.toggle("hidden", tab !== "login");
  elements.registerForm.classList.toggle("hidden", tab !== "register");
  elements.authTitle.textContent = tab === "login" ? "Sign in to FocusFlow" : "Create your FocusFlow account";
  elements.authCopy.textContent = tab === "login"
    ? "Use your account to pick up where you left off."
    : "Start with a clean workspace built for focus.";
  clearFormValidation(elements.loginForm);
  clearFormValidation(elements.registerForm);
  setBanner("");
}

function setSession(token, email) {
  state.token = token;
  state.email = email;

  if (token) {
    localStorage.setItem("todo_token", token);
    localStorage.setItem("todo_email", email);
  } else {
    localStorage.removeItem("todo_token");
    localStorage.removeItem("todo_email");
  }

  renderSession();
}

function renderTheme() {
  const darkMode = state.theme === "dark";
  elements.body.classList.toggle("theme-dark", darkMode);
  elements.themeToggleBtn.textContent = darkMode ? "Light mode" : "Dark mode";
}

function renderSession() {
  const signedIn = Boolean(state.token);
  elements.authScreen.classList.toggle("hidden", signedIn);
  elements.appScreen.classList.toggle("hidden", !signedIn);
  elements.avatarDropdown.classList.add("hidden");
  elements.avatarTrigger.setAttribute("aria-expanded", "false");

  if (!signedIn) {
    state.todos = [];
    state.search = "";
    elements.searchInput.value = "";
    renderTodos();
    return;
  }

  elements.sessionEmail.textContent = state.email;
  elements.avatarCircle.textContent = getInitials(state.email);
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? data.error : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function getOrderedTodos() {
  const todos = [...state.todos].map((todo, index) => {
    const meta = getMeta(todo.id);
    return { ...todo, meta, fallbackOrder: index };
  });

  todos.sort((a, b) => {
    const orderA = Number.isFinite(a.meta.order) ? a.meta.order : a.fallbackOrder;
    const orderB = Number.isFinite(b.meta.order) ? b.meta.order : b.fallbackOrder;
    return orderA - orderB;
  });

  return todos;
}

function getVisibleTodos() {
  return getOrderedTodos().filter((todo) => {
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "active" && !todo.completed) ||
      (state.filter === "completed" && todo.completed);

    const matchesSearch = todo.title.toLowerCase().includes(state.search.toLowerCase());
    return matchesFilter && matchesSearch;
  });
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query.trim()) {
    return safe;
  }
  const regex = new RegExp(`(${escapeRegExp(query.trim())})`, "ig");
  return safe.replace(regex, "<mark>$1</mark>");
}

function renderSkeleton(show) {
  elements.taskSkeleton.classList.toggle("hidden", !show);
  elements.todoList.classList.toggle("hidden", show);
}

function renderTodos() {
  const visibleTodos = getVisibleTodos();
  elements.todoCount.textContent = String(state.todos.length);
  elements.completedCount.textContent = String(state.todos.filter((todo) => todo.completed).length);
  elements.clearSearchBtn.classList.toggle("hidden", !state.search);

  if (!state.token) {
    elements.todoList.className = "todo-list empty-state";
    elements.todoList.textContent = "Sign in to see your tasks.";
    return;
  }

  if (!visibleTodos.length) {
    elements.todoList.className = "todo-list empty-state";
    elements.todoList.textContent = state.todos.length
      ? "No tasks match your current search or filter."
      : "No tasks yet! Start by adding something important.";
    return;
  }

  elements.todoList.className = "todo-list";
  elements.todoList.innerHTML = visibleTodos.map((todo) => {
    const meta = getMeta(todo.id);
    const overdue = isOverdue(meta.dueDate, todo.completed);
    const status = todo.completed ? "Completed" : "In progress";
    const dueLabel = meta.dueDate ? `Due ${formatDate(meta.dueDate)}` : "No due date";

    return `
      <article class="todo-item" data-id="${todo.id}" draggable="true">
        <label class="task-toggle">
          <input type="checkbox" data-action="toggle" data-id="${todo.id}" ${todo.completed ? "checked" : ""}>
        </label>
        <div class="todo-main">
          <button class="task-title-button" data-action="toggle" data-id="${todo.id}" type="button">
            <span class="todo-title ${todo.completed ? "is-complete" : ""}">${highlightMatch(todo.title, state.search)}</span>
          </button>
          <div class="todo-meta-row">
            <span class="status-badge">${status}</span>
            <span class="priority-badge">
              <span class="priority-dot priority-${escapeHtml(meta.priority)}"></span>
              ${escapeHtml(capitalize(meta.priority))}
            </span>
            <span class="due-chip ${overdue ? "is-overdue" : ""}">${escapeHtml(dueLabel)}</span>
            <span>Updated ${escapeHtml(formatUpdatedDate(todo.updated_at))}</span>
          </div>
        </div>
        <div class="todo-actions">
          <button class="todo-action" data-action="edit" data-id="${todo.id}" type="button">Edit</button>
          <button class="todo-action" data-action="delete" data-id="${todo.id}" type="button">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function reorderMeta(sourceId, targetId) {
  const ordered = getOrderedTodos();
  const ids = ordered.map((todo) => todo.id);
  const from = ids.indexOf(sourceId);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) {
    return;
  }
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  ids.forEach((id, index) => setMeta(id, { order: index }));
}

function closeMenus() {
  elements.avatarDropdown.classList.add("hidden");
  elements.avatarTrigger.setAttribute("aria-expanded", "false");
  elements.topbarActions.classList.remove("is-open");
}

function logout() {
  setSession("", "");
  switchAuthTab("login");
  closeMenus();
  showToast("Logged out.");
}

async function loadTodos() {
  if (!state.token) {
    renderTodos();
    return;
  }

  renderSkeleton(true);
  setTaskFeedback("");

  try {
    const todos = await apiFetch(TODO_ENDPOINT, { method: "GET" });
    state.todos = Array.isArray(todos) ? todos : [];
    state.todos.forEach((todo, index) => {
      const meta = getMeta(todo.id);
      if (!Number.isFinite(meta.order)) {
        setMeta(todo.id, { order: index });
      }
    });
    renderTodos();
  } catch (error) {
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("unauthorized")) {
      setSession("", "");
      switchAuthTab("login");
      setBanner("Your session expired. Please log in again.", "error");
      return;
    }
    elements.todoList.className = "todo-list empty-state";
    elements.todoList.textContent = error.message;
    setTaskFeedback(error.message, "error");
  } finally {
    renderSkeleton(false);
  }
}

function getCreatePayload() {
  return {
    title: document.getElementById("todo-title").value.trim(),
    dueDate: document.getElementById("todo-due-date").value,
    priority: document.getElementById("todo-priority").value,
  };
}

function setCreateDefaults() {
  elements.createTodoForm.reset();
  document.getElementById("todo-priority").value = "medium";
  clearFormValidation(elements.createTodoForm);
}

function renderEditForm(todoId) {
  const todo = state.todos.find((item) => item.id === todoId);
  const article = elements.todoList.querySelector(`[data-id="${todoId}"]`);
  if (!todo || !article) {
    return;
  }

  const meta = getMeta(todoId);
  article.innerHTML = `
    <form class="todo-edit-form" data-edit-id="${todo.id}">
      <div class="todo-edit-grid">
        <input type="text" name="title" value="${escapeHtml(todo.title)}" required>
        <input type="date" name="due_date" value="${escapeHtml(meta.dueDate || "")}">
        <select name="priority">
          <option value="low" ${meta.priority === "low" ? "selected" : ""}>Low</option>
          <option value="medium" ${meta.priority === "medium" ? "selected" : ""}>Medium</option>
          <option value="high" ${meta.priority === "high" ? "selected" : ""}>High</option>
        </select>
      </div>
      <label class="task-toggle">
        <input type="checkbox" name="completed" ${todo.completed ? "checked" : ""}>
        <span>${todo.completed ? "Completed" : "Mark complete"}</span>
      </label>
      <div class="todo-actions">
        <button class="primary-btn" type="submit">Save changes</button>
        <button class="todo-action" data-action="cancel-edit" type="button">Cancel</button>
      </div>
    </form>
  `;
}

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.filter === state.filter);
    });
    renderTodos();
  });
});

elements.forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();
  setBanner("Password reset is not available from the current backend yet.", "error");
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateAuthForm("login")) {
    return;
  }

  const payload = Object.fromEntries(new FormData(elements.loginForm).entries());

  try {
    setBanner("");
    setButtonLoading(elements.loginSubmit, "Logging in...");
    const result = await apiFetch(LOGIN_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSession(result.token, payload.email);
    elements.loginForm.reset();
    clearFormValidation(elements.loginForm);
    await loadTodos();
    showToast("Welcome back. Your workspace is ready.");
  } catch (error) {
    setBanner(error.message, "error");
  } finally {
    resetButtonLoading(elements.loginSubmit);
  }
});

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateAuthForm("register")) {
    return;
  }

  const payload = Object.fromEntries(new FormData(elements.registerForm).entries());

  try {
    setBanner("");
    setButtonLoading(elements.registerSubmit, "Creating account...");
    await apiFetch(REGISTER_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    switchAuthTab("login");
    document.getElementById("login-email").value = payload.email;
    elements.registerForm.reset();
    setBanner("Account created successfully. You can log in now.", "success");
    showToast("Account created successfully.");
  } catch (error) {
    setBanner(error.message, "error");
  } finally {
    resetButtonLoading(elements.registerSubmit);
  }
});

elements.createTodoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateCreateForm()) {
    return;
  }

  const payload = getCreatePayload();

  try {
    setButtonLoading(elements.createSubmit, "Adding task...");
    const todo = await apiFetch(TODO_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ title: payload.title, completed: false }),
    });
    setMeta(todo.id, {
      priority: payload.priority,
      dueDate: payload.dueDate,
      order: getOrderedTodos().length,
    });
    setCreateDefaults();
    await loadTodos();
    setTaskFeedback("Task added successfully.", "success");
    showToast("Task added.");
  } catch (error) {
    setTaskFeedback(error.message, "error");
  } finally {
    resetButtonLoading(elements.createSubmit);
  }
});

elements.todoList.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;
  const id = Number(target.dataset.id);

  if (action === "edit") {
    renderEditForm(id);
    return;
  }

  if (action === "cancel-edit") {
    renderTodos();
    return;
  }

  if (action === "delete") {
    try {
      await apiFetch(`${TODO_ENDPOINT}/${id}`, { method: "DELETE" });
      removeMeta(id);
      await loadTodos();
      showToast("Task deleted.");
    } catch (error) {
      setTaskFeedback(error.message, "error");
      showToast(error.message, "error");
    }
    return;
  }

  if (action === "toggle") {
    const todo = state.todos.find((item) => item.id === id);
    if (!todo) {
      return;
    }

    try {
      await apiFetch(`${TODO_ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: !todo.completed }),
      });
      await loadTodos();
      showToast(todo.completed ? "Task marked active." : "Task completed.");
    } catch (error) {
      setTaskFeedback(error.message, "error");
      showToast(error.message, "error");
    }
  }
});

elements.todoList.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-edit-id]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const id = Number(form.dataset.editId);
  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    setTaskFeedback("Task title is required.", "error");
    return;
  }

  try {
    await apiFetch(`${TODO_ENDPOINT}/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        completed: formData.get("completed") === "on",
      }),
    });
    setMeta(id, {
      dueDate: String(formData.get("due_date") || ""),
      priority: String(formData.get("priority") || "medium"),
    });
    await loadTodos();
    showToast("Task updated.");
  } catch (error) {
    setTaskFeedback(error.message, "error");
    showToast(error.message, "error");
  }
});

elements.todoList.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".todo-item");
  if (!card) {
    return;
  }
  state.draggedTodoId = Number(card.dataset.id);
  card.classList.add("is-dragging");
});

elements.todoList.addEventListener("dragend", (event) => {
  const card = event.target.closest(".todo-item");
  if (card) {
    card.classList.remove("is-dragging");
  }
  elements.todoList.querySelectorAll(".todo-item").forEach((item) => item.classList.remove("drag-over"));
});

elements.todoList.addEventListener("dragover", (event) => {
  event.preventDefault();
  const target = event.target.closest(".todo-item");
  if (!target) {
    return;
  }
  elements.todoList.querySelectorAll(".todo-item").forEach((item) => item.classList.remove("drag-over"));
  target.classList.add("drag-over");
});

elements.todoList.addEventListener("drop", (event) => {
  event.preventDefault();
  const target = event.target.closest(".todo-item");
  if (!target || state.draggedTodoId === null) {
    return;
  }
  reorderMeta(state.draggedTodoId, Number(target.dataset.id));
  state.draggedTodoId = null;
  renderTodos();
  showToast("Task order updated.");
});

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value || "";
  renderTodos();
});

elements.clearSearchBtn.addEventListener("click", () => {
  state.search = "";
  elements.searchInput.value = "";
  elements.searchInput.focus();
  renderTodos();
});

elements.avatarTrigger.addEventListener("click", () => {
  const isHidden = elements.avatarDropdown.classList.contains("hidden");
  elements.avatarDropdown.classList.toggle("hidden", !isHidden);
  elements.avatarTrigger.setAttribute("aria-expanded", String(isHidden));
});

elements.profileAction.addEventListener("click", () => {
  closeMenus();
  showToast(`Signed in as ${state.email}`);
});

elements.logoutBtn.addEventListener("click", logout);
elements.topbarLogoutBtn.addEventListener("click", logout);

elements.themeToggleBtn.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  renderTheme();
});

elements.mobileMenuBtn.addEventListener("click", () => {
  elements.topbarActions.classList.toggle("is-open");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".avatar-menu")) {
    elements.avatarDropdown.classList.add("hidden");
    elements.avatarTrigger.setAttribute("aria-expanded", "false");
  }
  if (!event.target.closest(".topbar")) {
    elements.topbarActions.classList.remove("is-open");
  }
});

document.addEventListener("keydown", (event) => {
  const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
  if (isSearchShortcut) {
    event.preventDefault();
    if (state.token) {
      elements.searchInput.focus();
      elements.searchInput.select();
    }
  }

  if (event.key === "Escape") {
    closeMenus();
  }
});

function initTheme() {
  renderTheme();
}

async function init() {
  initTheme();
  switchAuthTab("login");
  renderSession();
  setCreateDefaults();
  if (state.token) {
    await loadTodos();
  }
}

init();
