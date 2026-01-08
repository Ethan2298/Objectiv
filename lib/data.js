const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'life.json');

// Generate a simple unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Load data from file or return empty structure
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    // If file is corrupted, start fresh
  }
  return { dreams: [] };
}

// Save data to file
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Calculate completion percentage for any level
// Tasks: direct done/total
// Projects: average of task completion
// Goals: average of project completion
// Dreams: average of goal completion
function calculateProgress(item, level) {
  if (level === 'task') {
    return item.done ? 100 : 0;
  }

  const childKey = {
    'dream': 'goals',
    'goal': 'projects',
    'project': 'tasks'
  }[level];

  const childLevel = {
    'dream': 'goal',
    'goal': 'project',
    'project': 'task'
  }[level];

  const children = item[childKey] || [];
  if (children.length === 0) return 0;

  const total = children.reduce((sum, child) => {
    return sum + calculateProgress(child, childLevel);
  }, 0);

  return Math.round(total / children.length);
}

// Create a new item with all required fields
function createItem(type, name, description = '', dueDate = null) {
  const base = {
    id: generateId(),
    name,
    description,
  };

  // Only non-dream items have due dates
  if (type !== 'dream') {
    base.dueDate = dueDate;
  }

  // Add children array based on type
  switch (type) {
    case 'dream':
      base.goals = [];
      break;
    case 'goal':
      base.projects = [];
      break;
    case 'project':
      base.tasks = [];
      break;
    case 'task':
      base.done = false;
      break;
  }

  return base;
}

// Get the child array key for a given level
function getChildKey(level) {
  return {
    'dream': 'goals',
    'goal': 'projects',
    'project': 'tasks'
  }[level];
}

// Get the child type for a given level
function getChildType(level) {
  return {
    'dream': 'goal',
    'goal': 'project',
    'project': 'task'
  }[level];
}

module.exports = {
  loadData,
  saveData,
  generateId,
  calculateProgress,
  createItem,
  getChildKey,
  getChildType
};
