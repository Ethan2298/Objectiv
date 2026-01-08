const blessed = require('blessed');
const { calculateProgress, getChildKey, getChildType } = require('./data');

// Screen instance
let screen = null;

// UI Components
let headerBox = null;
let listWidget = null;
let statusBar = null;
let promptBox = null;
let questionBox = null;
let messageBox = null;

// State
let currentItems = [];
let currentLevel = 'dreams';
let currentParentName = null;
let currentItem = null;

// Callbacks
let onSelect = null;
let onAdd = null;
let onEdit = null;
let onDelete = null;
let onBack = null;
let onQuit = null;
let onToggle = null;

// Format a date for display (e.g., "Jan 15")
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Check if a date is overdue
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Initialize the blessed screen and components
function initScreen() {
  screen = blessed.screen({
    smartCSR: true,
    title: 'Life - Keep it Simple',
    fullUnicode: true,
    mouse: true,
    sendFocus: true,
    useBCE: true,
    forceUnicode: true
  });

  // Header box - shows current context (clickable to go back)
  headerBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 5,
    padding: { left: 1, right: 1 },
    tags: true,
    clickable: true,
    style: {
      fg: 'white',
      bg: 'default',
      hover: {
        bg: '#333333'
      }
    }
  });

  // Main list widget
  listWidget = blessed.list({
    top: 5,
    left: 0,
    width: '100%',
    height: '100%-8',
    padding: { left: 1, right: 1 },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    style: {
      fg: 'white',
      bg: 'default',
      selected: {
        fg: 'black',
        bg: 'cyan'
      }
    },
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    }
  });

  // Status bar at the bottom
  statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    padding: { left: 1, right: 1 },
    tags: true,
    style: {
      fg: 'gray',
      bg: 'default'
    }
  });

  // Prompt box for input
  promptBox = blessed.prompt({
    top: 'center',
    left: 'center',
    width: '60%',
    height: 'shrink',
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'cyan'
      }
    },
    hidden: true
  });

  // Question box for confirmations
  questionBox = blessed.question({
    top: 'center',
    left: 'center',
    width: '50%',
    height: 'shrink',
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'yellow'
      }
    },
    hidden: true
  });

  // Message box for notifications
  messageBox = blessed.message({
    top: 'center',
    left: 'center',
    width: '50%',
    height: 'shrink',
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'green'
      }
    },
    hidden: true
  });

  // Append all components
  screen.append(headerBox);
  screen.append(listWidget);
  screen.append(statusBar);
  screen.append(promptBox);
  screen.append(questionBox);
  screen.append(messageBox);

  // Global key bindings
  screen.key(['q', 'C-c'], () => {
    if (onQuit) onQuit();
  });

  screen.key(['escape', 'backspace', 'b'], () => {
    if (!promptBox.visible && !questionBox.visible && onBack) {
      onBack();
    }
  });

  screen.key(['a'], () => {
    if (!promptBox.visible && !questionBox.visible && onAdd) {
      onAdd();
    }
  });

  screen.key(['e'], () => {
    if (!promptBox.visible && !questionBox.visible) {
      const idx = listWidget.selected;
      if (idx < currentItems.length && onEdit) {
        onEdit(currentItems[idx], idx);
      }
    }
  });

  screen.key(['d'], () => {
    if (!promptBox.visible && !questionBox.visible) {
      const idx = listWidget.selected;
      if (idx < currentItems.length && onDelete) {
        onDelete(currentItems[idx], idx);
      }
    }
  });

  screen.key(['space'], () => {
    if (!promptBox.visible && !questionBox.visible && currentLevel === 'project') {
      const idx = listWidget.selected;
      if (idx < currentItems.length && onToggle) {
        onToggle(currentItems[idx], idx);
      }
    }
  });

  // List selection
  listWidget.on('select', (item, index) => {
    if (index < currentItems.length && onSelect) {
      onSelect(currentItems[index], index);
    }
  });

  // Header click to go back
  headerBox.on('click', () => {
    if (!promptBox.visible && !questionBox.visible && onBack) {
      onBack();
    }
  });

  // Mouse hover effects for list items
  let lastHoveredIndex = -1;
  listWidget.on('mouse', (data) => {
    if (data.action === 'mousemove') {
      // Calculate which item is being hovered based on mouse position
      const relativeY = data.y - listWidget.atop - listWidget.itop;
      const hoveredIndex = relativeY + listWidget.childBase;

      if (hoveredIndex !== lastHoveredIndex && hoveredIndex >= 0 && hoveredIndex < listWidget.items.length) {
        lastHoveredIndex = hoveredIndex;
        // Move selection to hovered item for visual feedback
        if (hoveredIndex !== listWidget.selected) {
          listWidget.select(hoveredIndex);
          screen.render();
        }
      }
    }
  });

  // Handle resize
  screen.on('resize', () => {
    headerBox.width = '100%';
    listWidget.width = '100%';
    listWidget.height = '100%-8';
    statusBar.width = '100%';
    screen.render();
  });

  // Explicitly enable mouse support for the screen
  screen.enableMouse();

  // Handle list item clicks explicitly
  listWidget.on('click', function() {
    const idx = listWidget.selected;
    if (idx < currentItems.length && onSelect) {
      onSelect(currentItems[idx], idx);
    } else if (idx >= currentItems.length && onAdd) {
      // Clicked on "Add new" option
      onAdd();
    }
  });

  listWidget.focus();
  screen.render();
}

// Update the header display
function updateHeader(item, level) {
  currentItem = item;
  let content = '';

  if (level === 'dreams') {
    content = '{bold}LIFE{/bold}\n{gray-fg}────{/gray-fg}\n{gray-fg}Keep it Simple{/gray-fg}';
  } else if (item) {
    content = `{bold}${item.name}{/bold}`;
    if (item.description) {
      content += `\n{gray-fg}"${item.description}"{/gray-fg}`;
    }
    if (item.dueDate) {
      const dateStr = formatDate(item.dueDate);
      if (isOverdue(item.dueDate)) {
        content += `\n{red-fg}Due: ${dateStr} (overdue){/red-fg}`;
      } else {
        content += `\n{gray-fg}Due: ${dateStr}{/gray-fg}`;
      }
    }
  }

  headerBox.setContent(content);
  screen.render();
}

// Build display label for an item
function buildItemLabel(item, index, level) {
  let label = `${index + 1}. `;

  if (level === 'project') {
    // Tasks show checkbox
    if (item.done) {
      label += `{green-fg}[x] ${item.name}{/green-fg}`;
    } else {
      label += `[ ] ${item.name}`;
    }
  } else {
    label += item.name;
    // Show progress for non-task items
    const childLevel = getChildType(level) || level;
    const progress = calculateProgress(item, childLevel);
    label += ` {gray-fg}[${progress}%]{/gray-fg}`;
  }

  // Add due date if present
  if (item.dueDate) {
    const dateStr = formatDate(item.dueDate);
    if (isOverdue(item.dueDate) && !item.done) {
      label += ` {red-fg}${dateStr}{/red-fg}`;
    } else {
      label += ` {gray-fg}${dateStr}{/gray-fg}`;
    }
  }

  return label;
}

// Update the list display
function updateList(items, level, parentName = null) {
  currentItems = items;
  currentLevel = level;
  currentParentName = parentName;

  const displayItems = [];

  items.forEach((item, index) => {
    displayItems.push(buildItemLabel(item, index, level));
  });

  // Add "Add new" option if under limit
  const childType = getChildType(level) || 'dream';
  if (items.length < 3) {
    displayItems.push(`{cyan-fg}+ Add new ${childType}{/cyan-fg}`);
  } else {
    displayItems.push(`{gray-fg}(max 3 reached){/gray-fg}`);
  }

  listWidget.setItems(displayItems);
  listWidget.select(0);
  listWidget.focus();
  screen.render();
}

// Update status bar with context-appropriate shortcuts
function updateStatusBar(level) {
  let shortcuts = '{gray-fg}';

  if (level === 'project') {
    shortcuts += '[↑↓/Scroll] Navigate  [Enter/Click] Toggle  [a] Add  [e] Edit  [d] Delete';
  } else if (level === 'dreams') {
    shortcuts += '[↑↓/Scroll] Navigate  [Enter/Click] Select  [a] Add  [e] Edit  [d] Delete  [q] Quit';
  } else {
    shortcuts += '[↑↓/Scroll] Navigate  [Enter/Click] Select  [a] Add  [e] Edit  [d] Delete  [Header] Back';
  }

  shortcuts += '{/gray-fg}';

  const levelLabel = level === 'dreams' ? 'Dreams' :
                     level === 'dream' ? 'Goals' :
                     level === 'goal' ? 'Projects' : 'Tasks';

  statusBar.setContent(`${levelLabel} (${currentItems.length}/3)\n${shortcuts}`);
  screen.render();
}

// Show prompt for text input
function showPrompt(title, defaultValue = '') {
  return new Promise((resolve) => {
    promptBox.input(title, defaultValue, (err, value) => {
      screen.render();
      listWidget.focus();
      resolve(value || null);
    });
  });
}

// Show confirmation dialog
function showConfirm(question) {
  return new Promise((resolve) => {
    questionBox.ask(question, (err, confirmed) => {
      screen.render();
      listWidget.focus();
      resolve(confirmed);
    });
  });
}

// Show message
function showMessage(text, duration = 2) {
  return new Promise((resolve) => {
    messageBox.display(text, duration, () => {
      screen.render();
      listWidget.focus();
      resolve();
    });
  });
}

// Multi-step prompt for new item
async function promptNewItem(type) {
  const name = await showPrompt(`${capitalize(type)} name:`);
  if (!name || !name.trim()) {
    await showMessage('Name is required', 1);
    return null;
  }

  const description = await showPrompt('Description (optional):');

  let dueDate = null;
  if (type !== 'dream') {
    const dueDateStr = await showPrompt('Due date (YYYY-MM-DD, optional):');
    if (dueDateStr && /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) {
      dueDate = dueDateStr;
    }
  }

  return {
    name: name.trim(),
    description: description?.trim() || '',
    dueDate
  };
}

// Multi-step prompt for editing item
async function promptEditItem(item, type) {
  const name = await showPrompt('Name:', item.name);
  if (!name || !name.trim()) {
    await showMessage('Name is required', 1);
    return null;
  }

  const description = await showPrompt('Description:', item.description || '');

  let dueDate = item.dueDate;
  if (type !== 'dream' && type !== 'task') {
    const dueDateStr = await showPrompt('Due date (YYYY-MM-DD, empty to clear):', item.dueDate || '');
    if (dueDateStr && /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) {
      dueDate = dueDateStr;
    } else {
      dueDate = null;
    }
  }

  return {
    name: name.trim(),
    description: description?.trim() || '',
    dueDate
  };
}

// Show typewriter effect for intro
async function showIntro() {
  return new Promise((resolve) => {
    const introBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: 3,
      content: '',
      style: {
        fg: 'white',
        bg: 'default'
      }
    });

    screen.append(introBox);
    screen.render();

    const text = 'Life, Keep it Simple.';
    let i = 0;

    const interval = setInterval(() => {
      if (i <= text.length) {
        introBox.setContent(text.slice(0, i));
        screen.render();
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          introBox.destroy();
          screen.render();
          resolve();
        }, 1500);
      }
    }, 80);
  });
}

// Set event callbacks
function setCallbacks(callbacks) {
  onSelect = callbacks.onSelect || null;
  onAdd = callbacks.onAdd || null;
  onEdit = callbacks.onEdit || null;
  onDelete = callbacks.onDelete || null;
  onBack = callbacks.onBack || null;
  onQuit = callbacks.onQuit || null;
  onToggle = callbacks.onToggle || null;
}

// Render the screen
function render() {
  if (screen) {
    screen.render();
  }
}

// Destroy the screen
function destroy() {
  if (screen) {
    screen.destroy();
  }
}

// Get the screen instance
function getScreen() {
  return screen;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  initScreen,
  updateHeader,
  updateList,
  updateStatusBar,
  showPrompt,
  showConfirm,
  showMessage,
  promptNewItem,
  promptEditItem,
  showIntro,
  setCallbacks,
  render,
  destroy,
  getScreen,
  formatDate,
  isOverdue
};
