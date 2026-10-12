
"use strict";

// 1. Select the HTML elements we need.
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const priorityFilter = document.getElementById("priorityFilter");
const taskCountLabel = document.getElementById("taskCountLabel");

// 2. Application state.
const STORAGE_KEY = "taskflow-tasks-v1";

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) return [];

    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["High", "Medium", "Low"].includes(task.priority) &&
      typeof task.createdAt === "string" &&
      typeof task.dueDate === "string" &&
      typeof task.description === "string"
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

// 3. Helper functions.
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Your changes could not be saved in this browser.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatDate(dateString) {
  if (!dateString) return "No deadline";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isOverdue(task) {
  return Boolean(
    task.dueDate &&
    task.dueDate < getToday() &&
    !task.completed
  );
}

// 4. Open the form to create or edit a task.
function openTaskForm(task = null) {
  editingTaskId = task ? task.id : null;

  taskForm.reset();

  document.getElementById("formHeading").textContent =
    task ? "Edit task" : "Create a task";

  document.getElementById("saveButton").textContent =
    task ? "Update Task" : "Save Task";

  if (task) {
    taskTitle.value = task.title;
    taskDescription.value = task.description;
    taskPriority.value = task.priority;
    taskDueDate.value = task.dueDate;
  }

  taskForm.hidden = false;
  taskTitle.focus();
  taskForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeTaskForm() {
  taskForm.hidden = true;
  taskForm.reset();
  editingTaskId = null;
}

// 5. Create a new task or update an existing one.
taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskTitle.value.trim();

  if (!title) {
    taskTitle.focus();
    return;
  }

  const description = taskDescription.value.trim();
  const priority = taskPriority.value;
  const dueDate = taskDueDate.value;

  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    alert("Please enter a valid due date.");
    return;
  }

  if (editingTaskId) {
    const task = tasks.find(item => item.id === editingTaskId);

    if (!task) {
      closeTaskForm();
      return;
    }

    task.title = title;
    task.description = description;
    task.priority = priority;
    task.dueDate = dueDate;
  } else {
    tasks.unshift({
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  saveTasks();
  closeTaskForm();
  renderTasks();
});

// 6. Filter tasks using the selected filters and search text.
function getVisibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedPriority = priorityFilter.value;
  const today = getToday();

  return tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query);

    const matchesPriority =
      selectedPriority === "all" ||
      task.priority === selectedPriority;

    let matchesStatus = true;

    if (currentFilter === "today") {
      matchesStatus = task.dueDate === today && !task.completed;
    } else if (currentFilter === "pending") {
      matchesStatus = !task.completed;
    } else if (currentFilter === "completed") {
      matchesStatus = task.completed;
    }

    return matchesSearch && matchesPriority && matchesStatus;
  });
}

// 7. Render the tasks on the page.
function renderTasks() {
  const visibleTasks = getVisibleTasks();

  taskList.innerHTML = visibleTasks.map(task => {
    const overdue = isOverdue(task);

    return `
      <article class="task-card ${task.completed ? "is-completed" : ""}">
        <input
          class="task-check"
          type="checkbox"
          data-action="toggle"
          data-id="${escapeHTML(task.id)}"
          aria-label="Mark ${escapeHTML(task.title)} as completed"
          ${task.completed ? "checked" : ""}
        >

        <div class="task-info">
          <h3 class="task-title">${escapeHTML(task.title)}</h3>

          ${task.description ? `
            <p class="task-description">
              ${escapeHTML(task.description)}
            </p>
          ` : ""}

          <div class="task-meta">
            <span class="priority ${task.priority}">
              ${escapeHTML(task.priority)} priority
            </span>

            <span class="${overdue ? "overdue-label" : ""}">
              ${overdue ? "Overdue · " : ""}
              ${escapeHTML(formatDate(task.dueDate))}
            </span>
          </div>
        </div>

        <div class="task-actions">
          <button
            class="icon-button"
            data-action="edit"
            data-id="${escapeHTML(task.id)}"
            aria-label="Edit ${escapeHTML(task.title)}"
            title="Edit task"
          >✎</button>

          <button
            class="icon-button delete"
            data-action="delete"
            data-id="${escapeHTML(task.id)}"
            aria-label="Delete ${escapeHTML(task.title)}"
            title="Delete task"
          >×</button>
        </div>
      </article>
    `;
  }).join("");

  emptyState.hidden = visibleTasks.length > 0;

  taskCountLabel.textContent =
    `Showing ${visibleTasks.length} of ${tasks.length} tasks`;

  updateDashboard();
}

// 8. Update the statistics.
function updateDashboard() {
  const completed = tasks.filter(task => task.completed).length;
  const overdue = tasks.filter(isOverdue).length;

  document.getElementById("totalTasks").textContent = tasks.length;
  document.getElementById("pendingTasks").textContent =
    tasks.length - completed;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("overdueTasks").textContent = overdue;
  document.getElementById("allCount").textContent = tasks.length;
}

// 9. Handle task completion, editing, and deletion.
taskList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  if (action === "edit") {
    openTaskForm(task);
  }

  if (action === "delete") {
    const confirmed = confirm(
      `Delete "${task.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    tasks = tasks.filter(item => item.id !== id);

    if (editingTaskId === id) {
      closeTaskForm();
    }

    saveTasks();
    renderTasks();
  }
});

taskList.addEventListener("change", event => {
  const checkbox = event.target.closest(
    'input[data-action="toggle"]'
  );

  if (!checkbox) return;

  const task = tasks.find(item => item.id === checkbox.dataset.id);

  if (!task) return;

  task.completed = checkbox.checked;
  saveTasks();
  renderTasks();
});

// 10. Connect the navigation filters.
document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll("[data-status]").forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.status === currentFilter
      );
    });

    renderTasks();
  });
});

document.querySelectorAll("[data-status]").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.status;

    document.querySelectorAll("[data-status]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll("[data-filter]").forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.filter === currentFilter
      );
    });

    renderTasks();
  });
});

// 11. Connect buttons, search, and priority filtering.
document.getElementById("addTaskButton").addEventListener("click", () => {
  openTaskForm();
});

document.getElementById("emptyAddButton").addEventListener("click", () => {
  openTaskForm();
});

document.getElementById("cancelButton").addEventListener("click", () => {
  closeTaskForm();
});

searchInput.addEventListener("input", renderTasks);
priorityFilter.addEventListener("change", renderTasks);

// 12. Initialize the application.
document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

renderTasks();
