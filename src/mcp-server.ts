import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  TextContent,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createEpicInWorkstream, createStoryInWorkstream, listBoardsAndWorkstreams, listItems, getBoardById, BOARD_IDS, updateItemStatus, postComment, assignItem } from './devstrideClient';
import dotenv from 'dotenv';

dotenv.config();

// Store current board context
let currentBoardId: string | null = null;

const server = new Server({
  name: 'devstride-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Expose tools
const tools: Tool[] = [
  {
    name: 'set_current_board',
    description: 'Set the current board/workstream context. Subsequent epic/story creation will default to this board.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        boardId: {
          type: 'string',
          description: 'UUID of the board to set as current',
        },
      },
      required: ['boardId'],
    },
  },
  {
    name: 'get_current_board',
    description: 'Get the currently set board/workstream context.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_workstreams',
    description: 'List all workstreams in the DevStride organization.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_items',
    description: 'List all items (Epics, Stories, etc.) in the DevStride organization. Optionally filter by type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          description: 'Optional: filter by item type (e.g., "Epic", "Story", "Task", "Bug")',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_epic',
    description: 'Create a new Epic. If boardId is not provided, uses the current board context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Epic title',
        },
        boardId: {
          type: 'string',
          description: 'Optional: UUID of the target board. If not provided, uses current board context.',
        },
        description: {
          type: 'string',
          description: 'Optional epic description',
        },
        priority: {
          type: 'string',
          description: 'Optional: Priority level (e.g., "Low", "Medium", "High", "Critical")',
        },
        dueDate: {
          type: 'string',
          description: 'Optional: Due date in YYYY-MM-DD format',
        },
        assignee: {
          type: 'string',
          description: 'Optional: Assignee name or username',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_story',
    description: 'Create a new Story. If boardId is not provided, uses the current board context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Story title',
        },
        boardId: {
          type: 'string',
          description: 'Optional: UUID of the target board. If not provided, uses current board context.',
        },
        description: {
          type: 'string',
          description: 'Optional story description',
        },
        priority: {
          type: 'string',
          description: 'Optional: Priority level (e.g., "Low", "Medium", "High", "Critical")',
        },
        dueDate: {
          type: 'string',
          description: 'Optional: Due date in YYYY-MM-DD format',
        },
        assignee: {
          type: 'string',
          description: 'Optional: Assignee name or username',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_item_status',
    description: 'Update the status/lane of an item (e.g., move to In Progress, Code Review, etc.)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        itemId: {
          type: 'string',
          description: 'Item ID or number (e.g., "I20135")',
        },
        status: {
          type: 'string',
          description: 'Target status: "Not Started", "In Progress", "QA Review", "Code Review", or "Design Review"',
        },
      },
      required: ['itemId', 'status'],
    },
  },
  {
    name: 'post_comment',
    description: 'Post a comment on a DevStride item.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        itemNumber: {
          type: 'string',
          description: 'Item number (e.g., "I20135")',
        },
        message: {
          type: 'string',
          description: 'Comment message (supports HTML formatting)',
        },
      },
      required: ['itemNumber', 'message'],
    },
  },
  {
    name: 'assign_item',
    description: 'Assign a DevStride item to a user.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        itemId: {
          type: 'string',
          description: 'Item ID or number (e.g., "I20135")',
        },
        assignee: {
          type: 'string',
          description: 'Assignee name or username',
        },
      },
      required: ['itemId', 'assignee'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

    try {
      if (name === 'set_current_board') {
        const { boardId } = args;
        const board = await getBoardById(boardId);
        if (!board) {
          return {
            content: [
              {
                type: 'text',
                text: `Board not found: ${boardId}`,
              },
            ],
            isError: true,
          };
        }
        currentBoardId = boardId;
        return {
          content: [
            {
              type: 'text',
              text: `Current board set to: ${board.label} (${boardId})`,
            },
          ],
        };
      }

      if (name === 'get_current_board') {
        if (!currentBoardId) {
          return {
            content: [
              {
                type: 'text',
                text: 'No current board set. Use set_current_board to set one.',
              },
            ],
          };
        }
        const board = await getBoardById(currentBoardId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(board, null, 2),
            },
          ],
        };
      }

      if (name === 'list_workstreams') {
        const workstreams = await listBoardsAndWorkstreams();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workstreams, null, 2),
            },
          ],
        };
      }

      if (name === 'list_items') {
        const items = await listItems();
        let filtered = items;
        if (args.type && Array.isArray(items)) {
          filtered = items.filter((item: any) => item.type === args.type);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      }

      if (name === 'create_epic') {
        const { title, boardId, description, priority, dueDate, assignee } = args;
        const targetBoardId = boardId || currentBoardId;
        if (!targetBoardId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: boardId not provided and no current board set. Use set_current_board first or provide boardId.',
              },
            ],
            isError: true,
          };
        }
        const result = await createEpicInWorkstream(title, targetBoardId, {
          description,
          priority,
          dueDate,
          assignee,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  id: result.id || result.number,
                  title: result.title,
                  description: result.description,
                  priority: result.priority,
                  dueDate: result.dueDate,
                  assignee: result.assignee,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'create_story') {
        const { title, boardId, description, priority, dueDate, assignee } = args;
        const targetBoardId = boardId || currentBoardId;
        if (!targetBoardId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: boardId not provided and no current board set. Use set_current_board first or provide boardId.',
              },
            ],
            isError: true,
          };
        }
        const result = await createStoryInWorkstream(title, targetBoardId, {
          description,
          priority,
          dueDate,
          assignee,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  id: result.id || result.number,
                  title: result.title,
                  description: result.description,
                  priority: result.priority,
                  dueDate: result.dueDate,
                  assignee: result.assignee,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'update_item_status') {
        const { itemId, status } = args;
        const result = await updateItemStatus(itemId, status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  id: result.id || result.number,
                  title: result.title,
                  status: status,
                  laneId: result.laneId,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'post_comment') {
        const { itemNumber, message } = args;
        const result = await postComment(itemNumber, message);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  itemNumber,
                  message,
                  response: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === 'assign_item') {
        const { itemId, assignee } = args;
        const result = await assignItem(itemId, assignee);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  id: result.id || result.number,
                  assignee: result.assignee,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message || error}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[DevStride MCP] Server started on stdio transport');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
