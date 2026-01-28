/**
 * Tools for Claude Agent
 *
 * Direct Anthropic API tool format:
 * - tools: Array of tool definitions with input_schema
 * - toolHandlers: Map of tool name to async handler function
 */

import { supabase, isAvailable } from './supabase-client.mjs';

// ========================================
// Editor.js Content Helpers
// ========================================

/**
 * Wrap blocks array in Editor.js document format
 */
function wrapBlocks(blocks) {
  return JSON.stringify({
    time: Date.now(),
    blocks,
    version: '2.29.0'
  });
}

/**
 * Create empty Editor.js document
 */
function emptyDocument() {
  return wrapBlocks([]);
}

// ========================================
// Tool Definitions (Anthropic API format)
// ========================================

export const tools = [
  {
    name: 'list_notes',
    description: 'List all notes with their id, name, folder_id, and timestamps',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_note',
    description: 'Get a note by ID with full content',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note to retrieve'
        }
      },
      required: ['note_id']
    }
  },
  {
    name: 'create_note',
    description: 'Create a new note with Editor.js block content',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name/title of the note'
        },
        blocks: {
          type: 'array',
          description: 'Array of Editor.js blocks. Block types: "header" (data: {text, level:1-6}), "paragraph" (data: {text}), "list" (data: {style:"ordered"|"unordered", items:[{content:"text",items:[]}]}), "checklist" (data: {items:[{text,checked}]}), "quote" (data: {text, caption}), "code" (data: {code}), "delimiter" (data: {})',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['type', 'data']
          }
        },
        folder_id: {
          type: 'string',
          description: 'Optional folder ID to place the note in'
        }
      },
      required: ['name', 'blocks']
    }
  },
  {
    name: 'update_note',
    description: 'Update an existing note (name and/or blocks)',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note to update'
        },
        name: {
          type: 'string',
          description: 'New name/title for the note'
        },
        blocks: {
          type: 'array',
          description: 'New Editor.js blocks array. Block types: "header" (data: {text, level:1-6}), "paragraph" (data: {text}), "list" (data: {style:"ordered"|"unordered", items:[{content:"text",items:[]}]}), "checklist" (data: {items:[{text,checked}]}), "quote" (data: {text, caption}), "code" (data: {code}), "delimiter" (data: {})',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['type', 'data']
          }
        }
      },
      required: ['note_id']
    }
  },
  {
    name: 'append_to_note',
    description: 'Append blocks to the end of an existing note (does not overwrite existing content)',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note to append to'
        },
        blocks: {
          type: 'array',
          description: 'Blocks to append to the end of the note',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['type', 'data']
          }
        }
      },
      required: ['note_id', 'blocks']
    }
  },
  {
    name: 'replace_note_block',
    description: 'Replace a specific block in a note by index (0-based)',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note'
        },
        block_index: {
          type: 'integer',
          description: 'Index of the block to replace (0-based)'
        },
        block: {
          type: 'object',
          description: 'The new block to replace with',
          properties: {
            type: { type: 'string' },
            data: { type: 'object' }
          },
          required: ['type', 'data']
        }
      },
      required: ['note_id', 'block_index', 'block']
    }
  },
  {
    name: 'delete_note_blocks',
    description: 'Delete blocks from a note by index range',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note'
        },
        start_index: {
          type: 'integer',
          description: 'Start index (0-based, inclusive)'
        },
        end_index: {
          type: 'integer',
          description: 'End index (0-based, inclusive). If omitted, deletes only the block at start_index'
        }
      },
      required: ['note_id', 'start_index']
    }
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note to delete'
        }
      },
      required: ['note_id']
    }
  },
  {
    name: 'open_note_tab',
    description: 'Open a note in a new browser tab. Returns an action for the frontend to execute.',
    input_schema: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'The UUID of the note to open'
        },
        note_name: {
          type: 'string',
          description: 'The name of the note (for display)'
        }
      },
      required: ['note_id']
    }
  },
  {
    name: 'open_url_tab',
    description: 'Open a URL in a new browser tab. Returns an action for the frontend to execute.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to open'
        },
        title: {
          type: 'string',
          description: 'Title for the tab'
        }
      },
      required: ['url']
    }
  },
  // ========================================
  // Folder Management Tools
  // ========================================
  {
    name: 'list_folders',
    description: 'List all folders with hierarchy info (id, name, parent_id, order_index)',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'create_folder',
    description: 'Create a new folder',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Folder name'
        },
        parent_id: {
          type: 'string',
          description: 'Optional parent folder ID for nesting'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'move_folder',
    description: 'Move a folder to a different parent (or to root)',
    input_schema: {
      type: 'object',
      properties: {
        folder_id: {
          type: 'string',
          description: 'Folder to move'
        },
        parent_id: {
          type: 'string',
          description: 'Target parent folder ID (omit for root)'
        }
      },
      required: ['folder_id']
    }
  },
  {
    name: 'move_item_to_folder',
    description: 'Move a note, objective, or task_list into a folder',
    input_schema: {
      type: 'object',
      properties: {
        item_type: {
          type: 'string',
          enum: ['note', 'objective', 'task_list'],
          description: 'Type of item to move'
        },
        item_id: {
          type: 'string',
          description: 'Item UUID'
        },
        folder_id: {
          type: 'string',
          description: 'Target folder ID (omit for unfiled)'
        }
      },
      required: ['item_type', 'item_id']
    }
  },
  {
    name: 'delete_folder',
    description: 'Delete a folder. Contents (items and child folders) move up to the parent folder.',
    input_schema: {
      type: 'object',
      properties: {
        folder_id: {
          type: 'string',
          description: 'Folder to delete'
        }
      },
      required: ['folder_id']
    }
  }
];

// ========================================
// Tool Handlers
// ========================================

export const toolHandlers = {
  list_notes: async () => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    const { data, error } = await supabase
      .from('notes')
      .select('id, name, folder_id, created_at, updated_at')
      .order('order_index', { ascending: true });

    if (error) {
      return `Error listing notes: ${error.message}`;
    }

    return JSON.stringify(data, null, 2);
  },

  get_note: async ({ note_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', note_id)
      .single();

    if (error) {
      return `Error getting note: ${error.message}`;
    }

    if (!data) {
      return `Note not found: ${note_id}`;
    }

    // Parse content to show blocks with indices for easier editing
    let blocksWithIndices = [];
    try {
      const parsed = JSON.parse(data.content || '{}');
      if (parsed.blocks) {
        blocksWithIndices = parsed.blocks.map((block, i) => ({
          index: i,
          type: block.type,
          data: block.data
        }));
      }
    } catch {
      // Content not parseable
    }

    return JSON.stringify({
      id: data.id,
      name: data.name,
      folder_id: data.folder_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      blocks: blocksWithIndices
    }, null, 2);
  },

  create_note: async ({ name, blocks, folder_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Wrap blocks array in Editor.js document format
    const content = wrapBlocks(blocks || []);

    const record = {
      name,
      content,
      folder_id: folder_id || null,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(record)
      .select()
      .single();

    if (error) {
      return `Error creating note: ${error.message}`;
    }

    return `Note created successfully:\n${JSON.stringify(data, null, 2)}`;
  },

  update_note: async ({ note_id, name, blocks }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updates.name = name;
    }
    if (blocks !== undefined) {
      // Wrap blocks array in Editor.js document format
      updates.content = wrapBlocks(blocks);
    }

    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', note_id)
      .select()
      .single();

    if (error) {
      return `Error updating note: ${error.message}`;
    }

    return `Note updated successfully:\n${JSON.stringify(data, null, 2)}`;
  },

  append_to_note: async ({ note_id, blocks }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Get existing note
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('content')
      .eq('id', note_id)
      .single();

    if (fetchError) {
      return `Error fetching note: ${fetchError.message}`;
    }

    // Parse existing content
    let existingBlocks = [];
    try {
      const parsed = JSON.parse(note.content || '{}');
      existingBlocks = parsed.blocks || [];
    } catch {
      existingBlocks = [];
    }

    // Append new blocks
    const newBlocks = [...existingBlocks, ...blocks];
    const newContent = wrapBlocks(newBlocks);

    const { data, error } = await supabase
      .from('notes')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', note_id)
      .select()
      .single();

    if (error) {
      return `Error updating note: ${error.message}`;
    }

    return `Appended ${blocks.length} block(s) to note. Total blocks: ${newBlocks.length}`;
  },

  replace_note_block: async ({ note_id, block_index, block }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Get existing note
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('content')
      .eq('id', note_id)
      .single();

    if (fetchError) {
      return `Error fetching note: ${fetchError.message}`;
    }

    // Parse existing content
    let blocks = [];
    try {
      const parsed = JSON.parse(note.content || '{}');
      blocks = parsed.blocks || [];
    } catch {
      return 'Error: Could not parse note content';
    }

    if (block_index < 0 || block_index >= blocks.length) {
      return `Error: Block index ${block_index} out of range (0-${blocks.length - 1})`;
    }

    // Replace block
    blocks[block_index] = block;
    const newContent = wrapBlocks(blocks);

    const { error } = await supabase
      .from('notes')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', note_id);

    if (error) {
      return `Error updating note: ${error.message}`;
    }

    return `Replaced block at index ${block_index}`;
  },

  delete_note_blocks: async ({ note_id, start_index, end_index }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Get existing note
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('content')
      .eq('id', note_id)
      .single();

    if (fetchError) {
      return `Error fetching note: ${fetchError.message}`;
    }

    // Parse existing content
    let blocks = [];
    try {
      const parsed = JSON.parse(note.content || '{}');
      blocks = parsed.blocks || [];
    } catch {
      return 'Error: Could not parse note content';
    }

    const endIdx = end_index !== undefined ? end_index : start_index;

    if (start_index < 0 || endIdx >= blocks.length || start_index > endIdx) {
      return `Error: Invalid index range (${start_index}-${endIdx}) for blocks (0-${blocks.length - 1})`;
    }

    // Delete blocks
    const deleteCount = endIdx - start_index + 1;
    blocks.splice(start_index, deleteCount);
    const newContent = wrapBlocks(blocks);

    const { error } = await supabase
      .from('notes')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', note_id);

    if (error) {
      return `Error updating note: ${error.message}`;
    }

    return `Deleted ${deleteCount} block(s). Remaining blocks: ${blocks.length}`;
  },

  delete_note: async ({ note_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', note_id);

    if (error) {
      return `Error deleting note: ${error.message}`;
    }

    return `Note deleted successfully: ${note_id}`;
  },

  open_note_tab: async ({ note_id, note_name }) => {
    // Returns an action for the frontend to execute
    return JSON.stringify({
      action: 'open_note_tab',
      noteId: note_id,
      noteName: note_name || 'Note'
    });
  },

  open_url_tab: async ({ url, title }) => {
    // Returns an action for the frontend to execute
    return JSON.stringify({
      action: 'open_url_tab',
      url,
      title: title || 'Web'
    });
  },

  // ========================================
  // Folder Management Handlers
  // ========================================

  list_folders: async () => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    const { data, error } = await supabase
      .from('folders')
      .select('id, name, parent_id, order_index, created_at, updated_at')
      .order('order_index', { ascending: true });

    if (error) {
      return `Error listing folders: ${error.message}`;
    }

    return JSON.stringify(data, null, 2);
  },

  create_folder: async ({ name, parent_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    const record = {
      name,
      parent_id: parent_id || null,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('folders')
      .insert(record)
      .select()
      .single();

    if (error) {
      return `Error creating folder: ${error.message}`;
    }

    return `Folder created successfully:\n${JSON.stringify(data, null, 2)}`;
  },

  move_folder: async ({ folder_id, parent_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Prevent moving folder into itself
    if (folder_id === parent_id) {
      return 'Error: Cannot move a folder into itself';
    }

    // Check if target parent exists (if specified)
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentFolder) {
        return `Error: Target parent folder not found: ${parent_id}`;
      }

      // Prevent circular reference - ensure parent_id is not a descendant of folder_id
      // Simple check: walk up from parent_id and make sure we don't hit folder_id
      let currentId = parent_id;
      while (currentId) {
        const { data: current } = await supabase
          .from('folders')
          .select('parent_id')
          .eq('id', currentId)
          .single();

        if (!current) break;
        if (current.parent_id === folder_id) {
          return 'Error: Cannot move a folder into one of its descendants';
        }
        currentId = current.parent_id;
      }
    }

    const { data, error } = await supabase
      .from('folders')
      .update({
        parent_id: parent_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', folder_id)
      .select()
      .single();

    if (error) {
      return `Error moving folder: ${error.message}`;
    }

    return `Folder moved successfully:\n${JSON.stringify(data, null, 2)}`;
  },

  move_item_to_folder: async ({ item_type, item_id, folder_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Determine the table based on item type
    const tableMap = {
      note: 'notes',
      objective: 'objectives',
      task_list: 'task_lists'
    };

    const table = tableMap[item_type];
    if (!table) {
      return `Error: Invalid item_type "${item_type}". Must be one of: note, objective, task_list`;
    }

    // Verify folder exists (if specified)
    if (folder_id) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folder_id)
        .single();

      if (folderError || !folder) {
        return `Error: Folder not found: ${folder_id}`;
      }
    }

    const { data, error } = await supabase
      .from(table)
      .update({
        folder_id: folder_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', item_id)
      .select()
      .single();

    if (error) {
      return `Error moving ${item_type}: ${error.message}`;
    }

    const locationText = folder_id ? `into folder ${folder_id}` : 'to unfiled';
    return `${item_type} moved ${locationText}:\n${JSON.stringify(data, null, 2)}`;
  },

  delete_folder: async ({ folder_id }) => {
    if (!isAvailable()) {
      return 'Error: Supabase not configured';
    }

    // Get the folder's parent_id so we can move contents up
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('parent_id')
      .eq('id', folder_id)
      .single();

    if (fetchError) {
      return `Error fetching folder: ${fetchError.message}`;
    }

    const parentId = folder?.parent_id || null;

    // Move child folders up to the parent
    const { error: childError } = await supabase
      .from('folders')
      .update({ parent_id: parentId, updated_at: new Date().toISOString() })
      .eq('parent_id', folder_id);

    if (childError) {
      return `Error moving child folders: ${childError.message}`;
    }

    // Move notes up to the parent
    const { error: notesError } = await supabase
      .from('notes')
      .update({ folder_id: parentId, updated_at: new Date().toISOString() })
      .eq('folder_id', folder_id);

    if (notesError) {
      return `Error moving notes: ${notesError.message}`;
    }

    // Move objectives up to the parent
    const { error: objectivesError } = await supabase
      .from('objectives')
      .update({ folder_id: parentId, updated_at: new Date().toISOString() })
      .eq('folder_id', folder_id);

    if (objectivesError) {
      return `Error moving objectives: ${objectivesError.message}`;
    }

    // Move task_lists up to the parent (if table exists)
    await supabase
      .from('task_lists')
      .update({ folder_id: parentId, updated_at: new Date().toISOString() })
      .eq('folder_id', folder_id);
    // Ignore error if task_lists table doesn't exist

    // Delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folder_id);

    if (error) {
      return `Error deleting folder: ${error.message}`;
    }

    const locationText = parentId ? `parent folder ${parentId}` : 'root';
    return `Folder deleted successfully: ${folder_id}. Contents moved to ${locationText}.`;
  }
};
