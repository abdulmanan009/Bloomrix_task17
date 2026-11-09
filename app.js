const sampleUsers = [
  { id: 1, name: "Ayesha Khan", email: "ayesha@example.com", role: "Member", date: "2026-11-09", status: "Pending" },
  { id: 2, name: "Omar Siddiqui", email: "omar@example.com", role: "Manager", date: "2026-11-07", status: "Active" },
  { id: 3, name: "Sara Ahmed", email: "sara@example.com", role: "Member", date: "2026-11-05", status: "Active" },
  { id: 4, name: "Bilal Malik", email: "bilal@example.com", role: "Member", date: "2026-11-03", status: "Inactive" },
  { id: 5, name: "Zara Ali", email: "zara@example.com", role: "Admin", date: "2026-10-30", status: "Active" },
  { id: 6, name: "Hamza Raza", email: "hamza@example.com", role: "Member", date: "2026-10-28", status: "Active" },
  { id: 7, name: "Mariam Sheikh", email: "mariam@example.com", role: "Member", date: "2026-10-24", status: "Pending" },
  { id: 8, name: "Danish Iqbal", email: "danish@example.com", role: "Manager", date: "2026-10-19", status: "Active" },
  { id: 9, name: "Hira Noor", email: "hira@example.com", role: "Member", date: "2026-10-15", status: "Active" },
  { id: 10, name: "Usman Farooq", email: "usman@example.com", role: "Member", date: "2026-10-12", status: "Inactive" },
  { id: 11, name: "Noor Hassan", email: "noor@example.com", role: "Member", date: "2026-10-08", status: "Pending" },
  { id: 12, name: "Ahmed Tariq", email: "ahmed@example.com", role: "Admin", date: "2026-10-02", status: "Active" }
];

const sampleActivity = [
  { title: "New registration submitted", name: "Ayesha Khan", time: "2026-11-09T10:42:00+05:00", status: "Pending" },
  { title: "Account access approved", name: "Omar Siddiqui", time: "2026-11-09T09:15:00+05:00", status: "Active" },
  { title: "Profile details updated", name: "Sara Ahmed", time: "2026-11-08T16:20:00+05:00", status: "Active" },
  { title: "Account access disabled", name: "Bilal Malik", time: "2026-11-08T11:05:00+05:00", status: "Inactive" }
];

const storageKey = "admindesk-task17";
const defaultData = {
  users: sampleUsers,
  activity: sampleActivity,
  settings: { name: "Administrator", email: "admin@example.com", notifyNew: true, notifyChanges: true }
};

let data = defaultData;
try {
  const savedData = localStorage.getItem(storageKey);
  if (savedData) data = JSON.parse(savedData);
} catch {
  // Use the sample records if browser storage is unavailable.
}

const statuses = ["Active", "Pending", "Inactive"];
const statusColors = { Active: "success", Pending: "warning", Inactive: "secondary" };
const pageNames = { dashboard: "Dashboard", users: "User management", registration: "Registration", settings: "Settings" };
const usersPerPage = 5;
let currentPage = 1;
let editingId = null;
let deletingId = null;
let dialogTrigger = null;
let demoPassword = "Admin1234";

function byId(id) {
  return document.getElementById(id);
}

const sidebar = bootstrap.Offcanvas.getOrCreateInstance(byId("sidebar"));
const userModal = bootstrap.Modal.getOrCreateInstance(byId("userModal"));
const deleteModal = bootstrap.Modal.getOrCreateInstance(byId("deleteModal"));
const toast = bootstrap.Toast.getOrCreateInstance(byId("messageToast"), { delay: 4200 });
const userForm = byId("userForm");
const registrationForm = byId("registrationForm");

// User-entered text must stay text when it is placed in an HTML template.
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function showToast(message) {
  byId("toastMessage").textContent = message;
  toast.show();
}

function saveData(updatedData) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    data = updatedData;
    return true;
  } catch {
    showToast("Changes could not be saved. Browser storage may be full or disabled.");
    return false;
  }
}

function showPage(focusHeading = false) {
  const page = window.location.hash.slice(1);
  if (page === "mainContent") return;

  const selected = Object.hasOwn(pageNames, page) ? page : "dashboard";
  for (const id of Object.keys(pageNames)) {
    byId(id).hidden = id !== selected;
  }
  for (const link of document.querySelectorAll("[data-page]")) {
    const isCurrent = link.dataset.page === selected;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  byId("breadcrumb").textContent = pageNames[selected];
  document.title = `AdminDesk | ${pageNames[selected]}`;
  if (focusHeading) {
    window.scrollTo(0, 0);
    if (!byId("sidebar").classList.contains("show")) byId(selected + "Title").focus();
  }
}

window.addEventListener("hashchange", () => showPage(true));
byId("sidebar").addEventListener("click", (event) => {
  if (event.target.closest("a") && byId("sidebar").classList.contains("show")) sidebar.hide();
});
byId("sidebar").addEventListener("hidden.bs.offcanvas", () => {
  const heading = document.querySelector("main section:not([hidden]) h1");
  heading.focus();
});
byId("desktopToggle").addEventListener("click", (event) => {
  const collapsed = document.querySelector(".portal").classList.toggle("sidebar-collapsed");
  event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
  event.currentTarget.textContent = collapsed ? "Show menu" : "Hide menu";
});

for (const element of document.querySelectorAll('[data-bs-toggle="tooltip"]')) {
  new bootstrap.Tooltip(element);
}

function badge(status) {
  return `<span class="badge text-bg-${statusColors[status]}">${status}</span>`;
}

function dateLabel(date) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

function activityTime(time) {
  return new Date(time).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function renderDashboard() {
  byId("totalCount").textContent = data.users.length;
  byId("statusOverview").innerHTML = "";

  for (const status of statuses) {
    const name = status.toLowerCase();
    const count = data.users.filter((user) => user.status === status).length;
    const percent = data.users.length ? Math.round(count / data.users.length * 100) : 0;
    byId(name + "Count").textContent = count;
    byId("statusOverview").insertAdjacentHTML("beforeend", `
      <div class="mb-3">
        <div class="d-flex justify-content-between gap-2 small mb-1">
          <span class="fw-semibold">${status}</span><span class="text-body-secondary">${count} ${count === 1 ? "user" : "users"} · ${percent}%</span>
        </div>
        <div class="progress" role="progressbar" aria-label="${status} user share" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar bg-${statusColors[status]}" style="width: ${percent}%"></div>
        </div>
      </div>`);
  }

  byId("activityList").innerHTML = data.activity.map((activity) => `
    <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
      <div class="text-break">
        <div class="fw-semibold">${escapeHtml(activity.title)}</div>
        <div class="small text-body-secondary">${escapeHtml(activity.name)} · <time datetime="${activity.time}">${activityTime(activity.time)}</time></div>
      </div>
      ${badge(activity.status)}
    </li>`).join("");
}

function pageButton(label, number, disabled, active = false) {
  return `<li class="page-item ${active ? "active" : ""}">
    <button type="button" class="page-link" data-number="${number}" ${disabled ? "disabled" : ""} ${active ? 'aria-current="page"' : ""}>${label}</button>
  </li>`;
}

function renderUsers() {
  const search = byId("searchUsers").value.trim().toLowerCase();
  const status = byId("statusFilter").value;
  const matches = data.users.filter((user) => {
    const details = `${user.name} ${user.email} ${user.role}`.toLowerCase();
    return details.includes(search) && (!status || user.status === status);
  });
  const pageCount = Math.max(1, Math.ceil(matches.length / usersPerPage));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * usersPerPage;
  const visibleUsers = matches.slice(start, start + usersPerPage);

  byId("userRows").innerHTML = visibleUsers.map((user) => `
    <tr>
      <td class="user-cell"><div class="d-flex align-items-center gap-2">
        <img class="user-avatar rounded-circle object-fit-cover flex-shrink-0" src="${escapeHtml(user.image || "avatar.svg")}" alt="">
        <div class="text-break"><div class="fw-semibold">${escapeHtml(user.name)}</div><div class="small text-body-secondary">${escapeHtml(user.email)}</div></div>
      </div></td>
      <td>${escapeHtml(user.role)}</td>
      <td class="text-nowrap"><time datetime="${user.date}">${dateLabel(user.date)}</time></td>
      <td>${badge(user.status)}</td>
      <td><div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-edit="${user.id}" aria-label="Edit ${escapeHtml(user.name)}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-delete="${user.id}" aria-label="Delete ${escapeHtml(user.name)}">Delete</button>
      </div></td>
    </tr>`).join("");

  if (matches.length === 0) {
    byId("userRows").innerHTML = '<tr><td colspan="5" class="text-center py-4">No users match your search and filter.</td></tr>';
    byId("userResults").textContent = "0 users found";
  } else {
    byId("userResults").textContent = `Showing ${start + 1}–${start + visibleUsers.length} of ${matches.length} users`;
  }

  let buttons = pageButton("Previous", currentPage - 1, currentPage === 1);
  for (let number = 1; number <= pageCount; number++) {
    buttons += pageButton(number, number, false, number === currentPage);
  }
  buttons += pageButton("Next", currentPage + 1, currentPage === pageCount);
  byId("pagination").innerHTML = buttons;
}

function resetUserPage() {
  currentPage = 1;
  renderUsers();
}

byId("searchUsers").addEventListener("input", resetUserPage);
byId("statusFilter").addEventListener("change", resetUserPage);
byId("pagination").addEventListener("click", (event) => {
  const button = event.target.closest("[data-number]");
  if (!button) return;
  currentPage = Number(button.dataset.number);
  renderUsers();
  byId("pagination").querySelector('[aria-current="page"]').focus();
});

function saveUserChange(users, title, user, notificationEnabled) {
  const change = { title, name: user.name, time: new Date().toISOString(), status: user.status };
  const activity = [change, ...data.activity].slice(0, 4);
  if (!saveData({ ...data, users, activity })) return false;

  renderDashboard();
  renderUsers();
  if (notificationEnabled) showToast(title + ".");
  return true;
}

function validateName(input) {
  input.setCustomValidity(input.value.trim().length < 2 ? "Enter at least two characters." : "");
}

function validateUserEmail(input, currentId = null) {
  const email = input.value.trim().toLowerCase();
  const taken = data.users.some((user) => user.id !== currentId && user.email.toLowerCase() === email);
  input.setCustomValidity(taken ? "This email already belongs to a user." : "");
}

function validateForm(form) {
  form.classList.add("was-validated");
  if (form.checkValidity()) return true;
  form.querySelector("input:invalid, select:invalid").focus();
  return false;
}

function resetForm(form) {
  form.reset();
  form.classList.remove("was-validated");
  for (const field of form.querySelectorAll("input, select")) field.setCustomValidity("");
}

function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function nextUserId() {
  return Math.max(0, ...data.users.map((user) => user.id)) + 1;
}

byId("userModal").addEventListener("show.bs.modal", (event) => {
  dialogTrigger = event.relatedTarget;
  const user = data.users.find((record) => record.id === Number(dialogTrigger?.dataset.edit));
  resetForm(userForm);
  editingId = user ? user.id : null;
  byId("userModalTitle").textContent = user ? "Edit user" : "Add user";
  if (user) {
    byId("userName").value = user.name;
    byId("userEmail").value = user.email;
    byId("userRole").value = user.role;
    byId("userStatus").value = user.status;
  }
});
byId("userModal").addEventListener("shown.bs.modal", () => byId("userName").focus());
byId("deleteModal").addEventListener("shown.bs.modal", () => byId("cancelDelete").focus());

for (const id of ["userModal", "deleteModal"]) {
  byId(id).addEventListener("hidden.bs.modal", () => {
    if (dialogTrigger && dialogTrigger.isConnected) dialogTrigger.focus();
    else byId("addUser").focus();
  });
}

byId("userRows").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) userModal.show(editButton);
  if (deleteButton) {
    dialogTrigger = deleteButton;
    deletingId = Number(deleteButton.dataset.delete);
    const user = data.users.find((record) => record.id === deletingId);
    byId("deleteName").textContent = user.name;
    deleteModal.show(deleteButton);
  }
});

function checkUserFields() {
  validateName(byId("userName"));
  validateUserEmail(byId("userEmail"), editingId);
}

userForm.addEventListener("input", checkUserFields);
userForm.addEventListener("submit", (event) => {
  event.preventDefault();
  checkUserFields();
  if (!validateForm(userForm)) return;

  const fields = new FormData(userForm);
  const existing = data.users.find((record) => record.id === editingId);
  const user = {
    ...existing,
    id: existing ? existing.id : nextUserId(),
    name: fields.get("name").trim(),
    email: fields.get("email").trim().toLowerCase(),
    role: fields.get("role"),
    date: existing ? existing.date : localDate(),
    status: fields.get("status")
  };
  const users = existing ? data.users.map((record) => record.id === editingId ? user : record) : [user, ...data.users];
  const title = existing ? "User account updated" : "New user added";
  const notify = existing ? data.settings.notifyChanges : data.settings.notifyNew;

  if (saveUserChange(users, title, user, notify)) {
    if (!existing) {
      byId("searchUsers").value = "";
      byId("statusFilter").value = "";
      resetUserPage();
    }
    userModal.hide();
  }
});

byId("confirmDelete").addEventListener("click", () => {
  const user = data.users.find((record) => record.id === deletingId);
  const users = data.users.filter((record) => record.id !== deletingId);
  if (saveUserChange(users, "User account removed", { ...user, status: "Inactive" }, data.settings.notifyChanges)) {
    deleteModal.hide();
  }
});

function checkRegistrationFields() {
  validateName(byId("regName"));
  validateUserEmail(byId("regEmail"));

  const phone = byId("regPhone");
  const digits = phone.value.replace(/\D/g, "");
  const phoneValid = /^\+?[0-9 ().-]+$/.test(phone.value.trim()) && digits.length >= 7 && digits.length <= 15;
  phone.setCustomValidity(phoneValid ? "" : "Enter a valid phone number.");

  const confirm = byId("regConfirm");
  confirm.setCustomValidity(confirm.value === byId("regPassword").value ? "" : "Passwords must match.");

  const image = byId("regImage");
  const file = image.files[0];
  const imageTypes = ["image/png", "image/jpeg", "image/webp"];
  const invalidImage = file && (!imageTypes.includes(file.type) || file.size > 500000);
  image.setCustomValidity(invalidImage ? "Choose a supported image under 500 KB." : "");
}

registrationForm.addEventListener("input", checkRegistrationFields);
registrationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  checkRegistrationFields();
  if (!validateForm(registrationForm)) return;

  const fields = new FormData(registrationForm);
  const file = byId("regImage").files[0];
  const submit = registrationForm.querySelector('button[type="submit"]');

  function registerUser(image) {
    submit.disabled = false;
    // Check again in case a user with this email was added while the image loaded.
    validateUserEmail(byId("regEmail"));
    if (data.users.some((user) => user.email === fields.get("email").trim().toLowerCase())) {
      byId("regEmail").focus();
      return;
    }
    const user = {
      id: nextUserId(),
      name: fields.get("name").trim(),
      email: fields.get("email").trim().toLowerCase(),
      phone: fields.get("phone").trim(),
      department: fields.get("department"),
      gender: fields.get("gender"),
      role: "Member",
      status: "Pending",
      date: localDate(),
      image
    };
    // Passwords are validated for the exercise and are never saved in user records.
    if (saveUserChange([user, ...data.users], "New registration submitted", user, data.settings.notifyNew)) {
      resetForm(registrationForm);
      byId("searchUsers").value = "";
      byId("statusFilter").value = "";
      resetUserPage();
      window.location.hash = "users";
    }
  }

  if (file) {
    const reader = new FileReader();
    submit.disabled = true;
    reader.addEventListener("load", () => registerUser(reader.result));
    reader.addEventListener("error", () => {
      submit.disabled = false;
      showToast("The profile image could not be read.");
    });
    reader.readAsDataURL(file);
  } else {
    registerUser("");
  }
});

function fillSettings() {
  byId("adminName").textContent = data.settings.name;
  byId("welcomeName").textContent = data.settings.name === "Administrator" ? "Admin" : data.settings.name;
  byId("profileName").value = data.settings.name;
  byId("accountEmail").value = data.settings.email;
  byId("notifyNew").checked = data.settings.notifyNew;
  byId("notifyChanges").checked = data.settings.notifyChanges;
}

function saveSettings(changes, message) {
  const settings = { ...data.settings, ...changes };
  if (!saveData({ ...data, settings })) return false;
  byId("adminName").textContent = settings.name;
  byId("welcomeName").textContent = settings.name === "Administrator" ? "Admin" : settings.name;
  showToast(message);
  return true;
}

byId("profileName").addEventListener("input", (event) => validateName(event.target));
byId("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId("profileName");
  validateName(input);
  if (validateForm(event.currentTarget) && saveSettings({ name: input.value.trim() }, "Profile saved.")) {
    input.value = data.settings.name;
    event.currentTarget.classList.remove("was-validated");
  }
});

byId("accountForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId("accountEmail");
  if (validateForm(event.currentTarget) && saveSettings({ email: input.value.trim() }, "Account email saved.")) {
    input.value = data.settings.email;
    event.currentTarget.classList.remove("was-validated");
  }
});

function checkPasswordFields() {
  const current = byId("currentPassword");
  const password = byId("newPassword");
  const confirm = byId("confirmPassword");
  current.setCustomValidity(current.value === demoPassword ? "" : "The current demo password is incorrect.");
  password.setCustomValidity(password.value === demoPassword ? "Choose a different password." : "");
  confirm.setCustomValidity(confirm.value === password.value ? "" : "Passwords must match.");
}

byId("passwordForm").addEventListener("input", checkPasswordFields);
byId("passwordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  checkPasswordFields();
  if (!validateForm(event.currentTarget)) return;
  demoPassword = byId("newPassword").value;
  resetForm(event.currentTarget);
  showToast("Demo password changed for this session.");
});

byId("notificationsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings({ notifyNew: byId("notifyNew").checked, notifyChanges: byId("notifyChanges").checked }, "Notification preferences saved.");
});

fillSettings();
renderDashboard();
renderUsers();
showPage();
