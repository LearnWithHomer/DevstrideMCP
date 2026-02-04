import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.DEVSTRIDE_API_BASE || 'https://api.devstride.com';
const ORG_ID = process.env.DEVSTRIDE_ORG_ID;
const API_KEY = process.env.DEVSTRIDE_API_KEY;
const API_SECRET = process.env.DEVSTRIDE_API_SECRET;

if (!ORG_ID || !API_KEY || !API_SECRET) {
  console.warn('Warning: DEVSTRIDE_ORG_ID, DEVSTRIDE_API_KEY or DEVSTRIDE_API_SECRET is not set.');
}

const client = axios.create({
  baseURL: `${API_BASE}/v1/organizations/${ORG_ID}`,
  auth: {
    username: API_KEY || '',
    password: API_SECRET || ''
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

export type ItemType = 'Epic' | 'Story' | 'Task' | 'Bug';

export const BOARD_IDS = {
  SPRINT_2_Q1_26: '2406aa12-4d39-4e3a-bd34-70f4f9a0c3fc',
  SPRINT_3_Q1_26: 'bdb79b38-8b45-4460-bcce-efaa2bd2e562'
} as const;

// Map item types to their workTypeIds
const typeToWorkTypeIdMap: Record<ItemType, string> = {
  'Epic': '105342df-7a2f-4386-ba7d-d17ae7e23549',
  'Story': '633fa51c-f100-4ce9-9167-06fb1201d3c5',
  'Task': 'c36fae19-412d-4465-8bd4-8dc740477da4',
  'Bug': '281aeb23-ec70-4ef0-90f5-770493d7d838'
} as const;

// Map lane labels to their laneIds
export const laneToLaneIdMap: Record<string, string> = {
  'Not Started': '112ae3d2-a7a0-4bac-b17a-620c7ddb5956',
  'In Progress': '5f0b83db-29e7-4466-b701-6e6ccb3379d7',
  'QA Review': '60ea1adf-f8e3-46ee-8fa6-415356e04168',
  'Code Review': 'fd33282a-6c94-4720-91e2-27963ccafb3f',
  'Design Review': '57dd8c0d-95de-4d4a-bc08-4a31c0bb7c02'
} as const;

export async function createItem(type: ItemType, title: string, description?: string) {
  const payload: any = {
    type,
    title
  };
  if (description) payload.description = description;

  const res = await client.post('/items', payload);
  return res.data;
}

export async function createEpic(title: string, description?: string) {
  return createItem('Epic', title, description);
}

export async function createStory(title: string, description?: string) {
  return createItem('Story', title, description);
}

export async function updateItem(itemId: string, patch: any) {
  // Extract just the number part if it's a full ID
  const id = itemId.includes(':') ? itemId.split(':')[1] : itemId;
  const res = await client.patch(`/work-items/${id}`, patch);
  return res.data?.data || res.data;
}

export async function getItem(itemId: string) {
  const res = await client.get(`/items/${itemId}`);
  return res.data;
}

export async function listBoards() {
  try {
    const res = await client.get('/boards');
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

export async function getBoardById(boardId: string) {
  try {
    const res = await client.get(`/boards/${boardId}`);
    return res.data?.data || res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

export async function listWorkstreams(boardId?: string) {
  // Try several likely endpoints: /workstreams, /boards/{id}/workstreams
  try {
    if (boardId) {
      const res = await client.get(`/boards/${boardId}/workstreams`);
      return res.data;
    }
  } catch (err: any) {
    if (!(err.response && err.response.status === 404)) throw err;
  }

  try {
    const res = await client.get('/workstreams');
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

const boardToWorkstreamMap: Record<string, string> = {
  '2406aa12-4d39-4e3a-bd34-70f4f9a0c3fc': 'F942'
};

export interface CreateItemOptions {
  description?: string;
  priority?: string;
  dueDate?: string;
  assignee?: string;
  parentNumber?: string;
}

export async function createItemInWorkstream(
  type: ItemType,
  title: string,
  boardId: string,
  options: CreateItemOptions = {}
) {
  const parentNumber = options.parentNumber || boardToWorkstreamMap[boardId];
  if (!parentNumber) {
    throw new Error(`No parent workstream configured for board ${boardId}`);
  }

  const workTypeId = typeToWorkTypeIdMap[type];
  if (!workTypeId) {
    throw new Error(`Unknown item type: ${type}`);
  }

  const payload: any = { workTypeId, title, boardId, parentNumber };
  
  if (options.description) {
    payload.description = { html: `<p>${options.description}</p>` };
  }
  if (options.priority) {
    payload.priority = options.priority;
  }
  if (options.dueDate) {
    payload.dueDate = options.dueDate;
  }
  if (options.assignee) {
    payload.assignee = options.assignee;
  }

  const res = await client.post('/work-items', payload);
  return res.data?.data || res.data;
}

export async function createEpicInWorkstream(
  title: string,
  boardId: string,
  options: CreateItemOptions = {}
) {
  return createItemInWorkstream('Epic', title, boardId, options);
}

export async function createStoryInWorkstream(
  title: string,
  boardId: string,
  options: CreateItemOptions = {}
) {
  return createItemInWorkstream('Story', title, boardId, options);
}

export async function listBoardsAndWorkstreams() {
  const result: any[] = [];

  try {
    const boards = await listBoards();
    if (boards && Array.isArray(boards)) {
      for (const board of boards) {
        const boardId = board.id || board._id;
        if (!boardId) continue;
        try {
          const wss = await listWorkstreams(boardId);
          if (wss && Array.isArray(wss)) {
            result.push(...wss);
          }
        } catch (err) {
          // continue if board has no workstreams
        }
      }
    }
  } catch (err) {
    // ignore boards error, try top-level workstreams
  }

  // Also try top-level workstreams
  try {
    const topLevelWss = await listWorkstreams();
    if (topLevelWss && Array.isArray(topLevelWss)) {
      result.push(...topLevelWss);
    }
  } catch (err) {
    // ignore
  }

  return result;
}

export async function listItems(limit?: number) {
  try {
    const params = limit ? { limit } : {};
    const res = await client.get('/items', { params });
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) return [];
    throw err;
  }
}

export async function updateItemStatus(itemId: string, status: string) {
  const laneId = laneToLaneIdMap[status];
  if (!laneId) {
    throw new Error(`Unknown status: ${status}. Valid statuses: ${Object.keys(laneToLaneIdMap).join(', ')}`);
  }
  return updateItem(itemId, { laneId });
}

export async function getCurrentSprintBoard(boardFolderId: string) {
  try {
    // Fetch all boards in the folder
    let allBoards: any[] = [];
    let cursor = null;
    
    while (true) {
      const params: any = { limit: 50 };
      if (cursor) params.cursor = cursor;
      
      const res = await client.get('/boards', { params });
      const boards = res.data || [];
      
      if (Array.isArray(boards)) {
        allBoards = allBoards.concat(boards);
      } else if (Array.isArray(res.data?.data)) {
        allBoards = allBoards.concat(res.data.data);
      }
      
      cursor = res.data?.meta?.cursor;
      if (!cursor) break;
    }
    
    // Filter by folder and time-based (sprints)
    const sprints = allBoards.filter(b => b.boardFolderId === boardFolderId && b.timeBased);
    
    // Find current sprint
    const today = new Date();
    const currentSprint = sprints.find(sprint => {
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      return today >= startDate && today <= endDate;
    });
    
    return currentSprint || null;
  } catch (err: any) {
    console.error('Error fetching current sprint:', err.message);
    return null;
  }
}

export async function getSprintItems(boardId: string) {
  try {
    // Query items directly by boardId
    const itemsRes = await client.get('/items', {
      params: {
        itemType: 'workitem',
        boardId,
        limit: 100
      }
    });
    
    const items = itemsRes.data?.data || itemsRes.data || [];
    return items;
  } catch (err: any) {
    console.error('Error fetching sprint items:', err.message);
    return [];
  }
}

export async function postComment(itemNumber: string, message: string) {
  const payload = {
    message: { html: message },
    itemNumber
  };
  const res = await client.post('/item-comments', payload);
  return res.data;
}

export async function assignItem(itemId: string, assignee: string) {
  return updateItem(itemId, { assigneeUsername: assignee });
}
