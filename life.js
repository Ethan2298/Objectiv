#!/usr/bin/env node

const {
  loadData,
  saveData,
  createItem,
  getChildKey,
  getChildType
} = require('./lib/data');
const {
  initScreen,
  updateHeader,
  updateList,
  updateStatusBar,
  showConfirm,
  promptNewItem,
  promptEditItem,
  showIntro,
  setCallbacks,
  destroy
} = require('./lib/ui');

// Application state
let data = null;
let navigationStack = []; // Stack of { items, level, parent, parentName } for going back
let currentView = {
  items: null,
  level: 'dreams',
  parent: null,
  parentName: null
};

// Initialize and run the app
async function main() {
  // Initialize blessed screen
  initScreen();

  // Show intro animation
  await showIntro();

  // Load data
  data = loadData();

  // Set up event callbacks
  setCallbacks({
    onSelect: handleSelect,
    onAdd: handleAdd,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onBack: handleBack,
    onQuit: handleQuit,
    onToggle: handleToggle
  });

  // Start at dreams level
  showDreams();
}

// Display the dreams list (top level)
function showDreams() {
  currentView = {
    items: data.dreams,
    level: 'dreams',
    parent: null,
    parentName: null
  };
  navigationStack = [];

  updateHeader(null, 'dreams');
  updateList(data.dreams, 'dreams');
  updateStatusBar('dreams');
}

// Display a dream's goals
function showGoals(dream) {
  navigationStack.push({ ...currentView });

  currentView = {
    items: dream.goals,
    level: 'dream',
    parent: dream,
    parentName: dream.name
  };

  updateHeader(dream, 'dream');
  updateList(dream.goals, 'dream', dream.name);
  updateStatusBar('dream');
}

// Display a goal's projects
function showProjects(goal) {
  navigationStack.push({ ...currentView });

  currentView = {
    items: goal.projects,
    level: 'goal',
    parent: goal,
    parentName: goal.name
  };

  updateHeader(goal, 'goal');
  updateList(goal.projects, 'goal', goal.name);
  updateStatusBar('goal');
}

// Display a project's tasks
function showTasks(project) {
  navigationStack.push({ ...currentView });

  currentView = {
    items: project.tasks,
    level: 'project',
    parent: project,
    parentName: project.name
  };

  updateHeader(project, 'project');
  updateList(project.tasks, 'project', project.name);
  updateStatusBar('project');
}

// Handle item selection
function handleSelect(item, index) {
  const { level, items } = currentView;

  // Check if this is the "Add new" option
  if (index >= items.length) {
    handleAdd();
    return;
  }

  // Navigate to next level based on current level
  switch (level) {
    case 'dreams':
      showGoals(item);
      break;
    case 'dream':
      showProjects(item);
      break;
    case 'goal':
      showTasks(item);
      break;
    case 'project':
      // Tasks are the bottom level - toggle completion
      handleToggle(item, index);
      break;
  }
}

// Handle adding a new item
async function handleAdd() {
  const { level, parent, items } = currentView;

  // Check if at max capacity
  if (items.length >= 3) {
    return;
  }

  // Determine what type of item to create
  const childType = getChildType(level) || 'dream';
  const details = await promptNewItem(childType);

  if (!details) {
    refreshCurrentView();
    return;
  }

  // Create the new item
  const newItem = createItem(childType, details.name, details.description, details.dueDate);

  // Add to appropriate location
  if (level === 'dreams') {
    data.dreams.push(newItem);
  } else {
    const childKey = getChildKey(level);
    parent[childKey].push(newItem);
  }

  saveData(data);
  refreshCurrentView();
}

// Handle editing an item
async function handleEdit(item, index) {
  const { level, items } = currentView;

  if (index >= items.length) {
    return;
  }

  // Determine item type
  const itemType = level === 'dreams' ? 'dream' :
                   level === 'dream' ? 'goal' :
                   level === 'goal' ? 'project' : 'task';

  const updates = await promptEditItem(item, itemType);

  if (!updates) {
    refreshCurrentView();
    return;
  }

  // Apply updates
  Object.assign(item, updates);
  saveData(data);
  refreshCurrentView();
}

// Handle deleting an item
async function handleDelete(item, index) {
  const { level, parent, items } = currentView;

  if (index >= items.length) {
    return;
  }

  const confirmed = await showConfirm(`Delete "${item.name}"?`);

  if (!confirmed) {
    refreshCurrentView();
    return;
  }

  // Remove from appropriate location
  if (level === 'dreams') {
    data.dreams.splice(index, 1);
  } else {
    const childKey = getChildKey(level);
    parent[childKey].splice(index, 1);
  }

  saveData(data);
  refreshCurrentView();
}

// Handle going back to previous level
function handleBack() {
  if (navigationStack.length === 0) {
    // Already at top level, do nothing
    return;
  }

  currentView = navigationStack.pop();
  updateHeader(currentView.parent, currentView.level);
  updateList(currentView.items, currentView.level, currentView.parentName);
  updateStatusBar(currentView.level);
}

// Handle quitting the app
function handleQuit() {
  destroy();
  console.log('\nKeep it simple.\n');
  process.exit(0);
}

// Handle toggling task completion
function handleToggle(item, index) {
  if (currentView.level !== 'project') {
    return;
  }

  item.done = !item.done;
  saveData(data);
  refreshCurrentView();
}

// Refresh the current view
function refreshCurrentView() {
  const { level, parent, parentName } = currentView;

  // Update items reference based on current context
  if (level === 'dreams') {
    currentView.items = data.dreams;
  } else {
    const childKey = getChildKey(level);
    currentView.items = parent[childKey];
  }

  updateHeader(parent, level);
  updateList(currentView.items, level, parentName);
  updateStatusBar(level);
}

// Handle graceful exit
process.on('SIGINT', handleQuit);
process.on('SIGTERM', handleQuit);

// Run
main().catch(err => {
  destroy();
  console.error('Error:', err.message);
  process.exit(1);
});
