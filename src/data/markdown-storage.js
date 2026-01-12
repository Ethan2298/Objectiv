/**
 * Markdown Storage Module
 *
 * Filesystem-based storage using markdown files.
 * Stores objectives in an 'Objectives' subfolder within the user's root path.
 */

import { parseObjectiveMarkdown, serializeObjective, slugify } from './markdown-format.js';

const OBJECTIVES_FOLDER = 'Objectives';
const SIDELIST_STATE_KEY = 'objectiv-sidelist-state';

// ========================================
// Path Utilities
// ========================================

/**
 * Get root path from folder explorer state (stored in localStorage)
 */
function getRootPath() {
  try {
    const state = JSON.parse(localStorage.getItem(SIDELIST_STATE_KEY) || '{}');
    // The side-list-state saves rootPath directly, not under folderExplorer
    return state.rootPath || null;
  } catch {
    return null;
  }
}

/**
 * Check if running in Electron with filesystem access
 */
function hasFilesystemAccess() {
  return typeof window !== 'undefined' &&
         window.electronAPI &&
         window.electronAPI.folderExplorer &&
         typeof window.electronAPI.folderExplorer.readDir === 'function';
}

/**
 * Get the Objectives folder path, creating it if it doesn't exist
 */
async function getObjectivesPath() {
  const rootPath = getRootPath();
  if (!rootPath) return null;

  if (!hasFilesystemAccess()) return null;

  // Use path separator based on platform
  const separator = rootPath.includes('\\') ? '\\' : '/';
  const objectivesPath = `${rootPath}${separator}${OBJECTIVES_FOLDER}`;

  // Check if exists, create if not
  try {
    const exists = await window.electronAPI.folderExplorer.exists(objectivesPath);
    if (!exists) {
      const result = await window.electronAPI.folderExplorer.mkdir(objectivesPath);
      if (!result.success) {
        console.error('Failed to create Objectives folder:', result.error);
        return null;
      }
      console.log('Created Objectives folder:', objectivesPath);
    }
    return objectivesPath;
  } catch (err) {
    console.error('Error checking/creating Objectives folder:', err);
    return null;
  }
}

/**
 * Build a file path for an objective
 */
function buildFilePath(objectivesPath, objective) {
  const separator = objectivesPath.includes('\\') ? '\\' : '/';
  const filename = slugify(objective.name) + '.md';
  return `${objectivesPath}${separator}${filename}`;
}

// ========================================
// Storage Operations
// ========================================

/**
 * Load all objectives from markdown files in the Objectives folder
 */
export async function loadAllObjectives() {
  const objectivesPath = await getObjectivesPath();

  if (!objectivesPath) {
    console.log('No Objectives folder available');
    return { objectives: [] };
  }

  try {
    const result = await window.electronAPI.folderExplorer.readDir(objectivesPath);

    if (!result.success) {
      console.error('Failed to read Objectives folder:', result.error);
      return { objectives: [] };
    }

    const objectives = [];

    for (const item of result.items) {
      // Only process .md files
      if (!item.isFile || !item.name.endsWith('.md')) continue;

      try {
        const fileResult = await window.electronAPI.folderExplorer.readFile(item.path);

        if (fileResult.success) {
          const obj = parseObjectiveMarkdown(fileResult.content);
          obj._filePath = item.path; // Track source file for updates
          objectives.push(obj);
        } else {
          console.warn('Failed to read file:', item.path, fileResult.error);
        }
      } catch (err) {
        console.warn('Error parsing file:', item.path, err);
      }
    }

    console.log(`Loaded ${objectives.length} objectives from markdown files`);
    return { objectives };

  } catch (err) {
    console.error('Error loading objectives:', err);
    return { objectives: [] };
  }
}

/**
 * Save a single objective to a markdown file
 */
export async function saveObjective(objective) {
  const objectivesPath = await getObjectivesPath();

  if (!objectivesPath) {
    throw new Error('No folder selected. Please select a folder first.');
  }

  const newFilePath = buildFilePath(objectivesPath, objective);
  const content = serializeObjective(objective);

  // If the objective was renamed, delete the old file
  if (objective._filePath && objective._filePath !== newFilePath) {
    try {
      const oldExists = await window.electronAPI.folderExplorer.exists(objective._filePath);
      if (oldExists) {
        await window.electronAPI.folderExplorer.deleteFile(objective._filePath);
        console.log('Deleted old file after rename:', objective._filePath);
      }
    } catch (err) {
      console.warn('Failed to delete old file:', objective._filePath, err);
    }
  }

  // Write the new/updated file
  const result = await window.electronAPI.folderExplorer.writeFile(newFilePath, content);

  if (!result.success) {
    throw new Error(`Failed to save objective: ${result.error}`);
  }

  // Update the tracked file path
  objective._filePath = newFilePath;
  console.log('Saved objective to:', newFilePath);

  return objective;
}

/**
 * Delete an objective's markdown file
 */
export async function deleteObjective(objective) {
  if (!objective._filePath) {
    console.warn('No file path for objective, nothing to delete');
    return;
  }

  try {
    const exists = await window.electronAPI.folderExplorer.exists(objective._filePath);
    if (exists) {
      const result = await window.electronAPI.folderExplorer.deleteFile(objective._filePath);
      if (!result.success) {
        throw new Error(result.error);
      }
      console.log('Deleted objective file:', objective._filePath);
    }
  } catch (err) {
    console.error('Failed to delete objective file:', objective._filePath, err);
    throw err;
  }
}

/**
 * Check if the storage system is available
 * (folder is selected and filesystem access exists)
 */
export function isStorageAvailable() {
  return hasFilesystemAccess() && getRootPath() !== null;
}

/**
 * Get the current storage status
 */
export function getStorageStatus() {
  const hasAccess = hasFilesystemAccess();
  const rootPath = getRootPath();

  return {
    hasFilesystemAccess: hasAccess,
    rootPath: rootPath,
    isReady: hasAccess && rootPath !== null
  };
}

// ========================================
// Exports
// ========================================

export default {
  loadAllObjectives,
  saveObjective,
  deleteObjective,
  isStorageAvailable,
  getStorageStatus
};
