const API_BASE_URL = window.APP_CONFIG.apiBaseUrl.replace(/\/$/, "");
const $ = (id) => document.getElementById(id);

let token = "",
  currentUser = null;
const pages = { note: 1, post: 1, user: 1, group: 1 };
let postUser = "",
  userInterest = "",
  groupInterest = "";
const status = (message) => {
  $("status").textContent = message;
};
async function api(path, method = "GET", body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401 && token) signOut();
    throw new Error(
      data?.errors
        ?.map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ") ||
        data?.message ||
        "Request failed",
    );
  }
  return data;
}
function action(fn) {
  return async (event) => {
    event?.preventDefault();
    const button = event?.submitter;
    if (button) button.disabled = true;
    try {
      await fn(event);
    } catch (error) {
      status(error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };
}
function button(text, handler) {
  const el = document.createElement("button");
  el.textContent = text;
  el.type = "button";
  el.addEventListener("click", action(handler));
  return el;
}
function article(title, content) {
  const el = document.createElement("article"),
    h = document.createElement("h3"),
    p = document.createElement("p");
  h.textContent = title;
  p.textContent = content;
  el.append(h, p);
  return el;
}
function pager(kind, pagination, reload) {
  const el = $(`${kind}-pager`);
  el.replaceChildren();
  const previous = button("Previous", async () => {
    pages[kind]--;
    await reload();
  });
  const next = button("Next", async () => {
    pages[kind]++;
    await reload();
  });
  previous.disabled = pagination.page <= 1;
  next.disabled = pagination.page >= pagination.totalPages;
  const label = document.createElement("span");
  label.textContent = `Page ${pagination.page} / ${pagination.totalPages || 1} · ${pagination.total} total `;
  el.append(previous, label, next);
}
const interests = (value) => [
  ...new Set(
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];
const formData = (id) => Object.fromEntries(new FormData($(id)));
function fillForm(id, value) {
  for (const [key, field] of Object.entries(value)) {
    const input = $(id).elements.namedItem(key);
    if (input) input.value = field;
  }
  $(id).scrollIntoView({ behavior: "smooth", block: "center" });
}
function signOut() {
  token = "";
  currentUser = null;
  $("identity").textContent = "Not signed in";
  $("auth").hidden = false;
  $("logout").hidden = true;
  for (const id of ["notes", "admin", "post-form"]) $(id).hidden = true;
  for (const id of [
    "note-list",
    "user-list",
    "group-list",
    "note-pager",
    "user-pager",
    "group-pager",
  ])
    $(id).replaceChildren();
  for (const id of ["note-form", "post-form", "user-form"]) $(id).reset();
}
async function signedIn(data) {
  token = data.token;
  currentUser = data.user;
  $("identity").textContent =
    `${currentUser.name} (${currentUser.role}) · ID: ${currentUser._id}`;
  $("auth").hidden = true;
  $("logout").hidden = false;
  $("notes").hidden = false;
  $("post-form").hidden = false;
  $("admin").hidden = currentUser.role !== "admin";
  $("login").reset();
  $("register").reset();
  pages.note = pages.user = pages.group = 1;
  await loadNotes();
  if (currentUser.role === "admin") {
    await loadUsers();
    await loadGroups();
  }
  status("Signed in");
}
for (const id of ["login", "register"])
  $(id).addEventListener(
    "submit",
    action(async () => {
      const input = formData(id);
      if (id === "register") input.interests = interests(input.interests);
      await signedIn(await api(`/auth/${id}`, "POST", input));
    }),
  );
$("logout").addEventListener("click", () => {
  signOut();
  status("Signed out");
});
async function loadNotes() {
  const data = await api(`/notes?page=${pages.note}`);
  $("note-list").replaceChildren();
  for (const note of data.notes) {
    const el = article(note.title, `${note.content}\nOwner: ${note.owner}`);
    if (note.owner === currentUser?._id) {
      el.append(
        button("Edit", () =>
          fillForm("note-form", {
            id: note._id,
            title: note.title,
            content: note.content,
          }),
        ),
        button("Delete", async () => {
          if (!confirm("Delete this note?")) return;
          await api(`/notes/${note._id}`, "DELETE");
          pages.note = 1;
          await loadNotes();
          status("Note deleted");
        }),
      );
    }
    $("note-list").append(el);
  }
  if (!data.notes.length) $("note-list").textContent = "No notes yet.";
  pager("note", data.pagination, loadNotes);
}
$("note-form").addEventListener(
  "submit",
  action(async () => {
    const { id, ...input } = formData("note-form");
    await api(id ? `/notes/${id}` : "/notes", id ? "PATCH" : "POST", input);
    $("note-form").reset();
    pages.note = 1;
    await loadNotes();
    status("Note saved");
  }),
);
$("cancel-note").addEventListener("click", () => $("note-form").reset());
async function loadPosts() {
  const path = postUser
    ? `/users/${encodeURIComponent(postUser)}/posts`
    : "/posts";
  const data = await api(`${path}?page=${pages.post}`);
  $("post-list").replaceChildren();
  for (const post of data.posts)
    $("post-list").append(
      article(post.title, `${post.content}\nAuthor: ${post.author}`),
    );
  if (!data.posts.length) $("post-list").textContent = "No posts yet.";
  pager("post", data.pagination, loadPosts);
}
$("post-form").addEventListener(
  "submit",
  action(async () => {
    await api("/posts", "POST", formData("post-form"));
    $("post-form").reset();
    pages.post = 1;
    await loadPosts();
    status("Post published");
  }),
);
$("post-filter").addEventListener(
  "submit",
  action(async () => {
    postUser = formData("post-filter").userId.trim();
    pages.post = 1;
    await loadPosts();
  }),
);
async function loadUsers() {
  const data = await api(
    `/users?page=${pages.user}&interest=${encodeURIComponent(userInterest)}`.replace(
      /&interest=$/,
      "",
    ),
  );
  $("user-list").replaceChildren();
  for (const user of data.users) {
    const el = article(
      `${user.name} (${user.role})`,
      `${user.email}\nID: ${user._id}\nInterests: ${user.interests.join(", ")}`,
    );
    el.append(
      button("Edit", () =>
        fillForm("user-form", {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          password: "",
          interests: user.interests.join(", "),
        }),
      ),
    );
    if (user._id !== currentUser._id)
      el.append(
        button("Delete", async () => {
          if (!confirm("Delete this user and all their notes and posts?"))
            return;
          await api(`/users/${user._id}`, "DELETE");
          pages.user = 1;
          await loadUsers();
          await loadNotes();
          await loadPosts();
          await loadGroups();
          status("User deleted");
        }),
      );
    $("user-list").append(el);
  }
  if (!data.users.length) $("user-list").textContent = "No users found.";
  pager("user", data.pagination, loadUsers);
}
$("user-form").addEventListener(
  "submit",
  action(async () => {
    const { id, ...input } = formData("user-form");
    input.interests = interests(input.interests);
    if (!input.password && id) delete input.password;
    if (!id && !input.password)
      throw new Error("Password is required for a new user");
    await api(id ? `/users/${id}` : "/users", id ? "PATCH" : "POST", input);
    $("user-form").reset();
    pages.user = 1;
    await loadUsers();
    await loadGroups();
    status("User saved");
  }),
);
$("cancel-user").addEventListener("click", () => $("user-form").reset());
$("user-filter").addEventListener(
  "submit",
  action(async () => {
    userInterest = formData("user-filter").interest.trim();
    pages.user = 1;
    await loadUsers();
  }),
);
async function loadGroups() {
  const data = await api(
    `/users/interests?page=${pages.group}${groupInterest ? `&interest=${encodeURIComponent(groupInterest)}` : ""}`,
  );
  $("group-list").replaceChildren();
  for (const group of data.groups) {
    const el = article(
      `${group.interest} · ${group.totalUsers} users`,
      group.users.map((u) => `${u.name} (${u.email})`).join("\n"),
    );
    if (group.totalUsers > group.users.length)
      el.append(
        button("View all users in this interest", async () => {
          userInterest = group.interest;
          $("user-filter").elements.interest.value = userInterest;
          pages.user = 1;
          await loadUsers();
          $("user-list").scrollIntoView();
        }),
      );
    $("group-list").append(el);
  }
  if (!data.groups.length) $("group-list").textContent = "No interests found.";
  pager("group", data.pagination, loadGroups);
}
$("group-filter").addEventListener(
  "submit",
  action(async () => {
    groupInterest = formData("group-filter").interest.trim();
    pages.group = 1;
    await loadGroups();
  }),
);
loadPosts().catch((error) => status(error.message));
