# DevStride MCP Server (Node + TypeScript)

This project provides a Model Context Protocol (MCP) server for DevStride, allowing LLMs and Copilot agents to create and manage work items (Epics, Stories, Tasks, Bugs) and list workstreams via natural language.

## Setup

1. Install dependencies:

```bash
npm install
```

2. **Configure Environment Variables**

Copy the example environment file and fill in your DevStride credentials:

```bash
cp .env.example .env
```

Then edit `.env` and add your DEVSTRIDE_API_SECRET credentials:

```bash
DEVSTRIDE_API_SECRET=YOUR_API_SECRET_FROM_1PASSWORD
```

**Where to find these values:**
- **DEVSTRIDE_API_SECRET**: Retrieve from 1Password (Mobile vault)

**Security Note:** The `.env` file is in `.gitignore` and will never be committed to version control. Keep your API secret safe.

3. Build (optional, for production):

```bash
npm run build
```

## Running the MCP Server

Start the server on stdio:

```bash
npm run mcp
```

The server will start listening on stdin/stdout for MCP protocol messages.

## Workflow Example

1. **List all boards/workstreams:**
```bash
# In Copilot: "List all workstreams in DevStride"
```

2. **Set the current board context:**
```bash
# In Copilot: "Set the current board to 2406aa12-4d39-4e3a-bd34-70f4f9a0c3fc"
```

3. **Create an epic in the current board with extended properties:**
```bash
# In Copilot: "Create an epic named 'Build awesome feature' with priority Low and due date Feb 15"
# Response: Epic created with all properties
```

4. **Verify the current board:**
```bash
# In Copilot: "What's the current board?"
```

## Without Setting Current Board

You can also create items directly by providing the board ID:
```bash
# In Copilot: "Create an epic named 'Do something' in board 2406aa12-4d39-4e3a-bd34-70f4f9a0c3fc with priority High and due date tomorrow"
```

## Important Notes

- **Work Type IDs**: DevStride uses `workTypeId` to specify item type (not `type`). The mapping is:
  - **Epic**: `105342df-7a2f-4386-ba7d-d17ae7e23549`
  - **Story**: `633fa51c-f100-4ce9-9167-06fb1201d3c5`
  - **Task**: `c36fae19-412d-4465-8bd4-8dc740477da4`
  - **Bug**: `281aeb23-ec70-4ef0-90f5-770493d7d838`
  - These are automatically handled by the client in the `typeToWorkTypeIdMap` configuration.

- **Lane IDs (Status Mapping)**: DevStride uses `laneId` to control item status. The known mappings are:
  - **Not Started**: `112ae3d2-a7a0-4bac-b17a-620c7ddb5956`
  - **In Progress**: `5f0b83db-29e7-4466-b701-6e6ccb3379d7`
  - **Code Review**: `fd33282a-6c94-4720-91e2-27963ccafb3f`
  - **Design Review**: `57dd8c0d-95de-4d4a-bc08-4a31c0bb7c02`
  - **QA Review**: `60ea1adf-f8e3-46ee-8fa6-415356e04168`
  - These are configured in the `laneToLaneIdMap` in [src/devstrideClient.ts](src/devstrideClient.ts).

- **Workstream Mapping**: DevStride items are created within a "Parent Workstream" (a workstream ID like "F942"). These parent workstreams are automatically configured for known boards in [src/devstrideClient.ts](src/devstrideClient.ts). To add support for additional boards, update the `boardToWorkstreamMap` configuration.

- **Extended Properties**: Due date, priority, and assignee properties are passed to the API but may require additional configuration or setup in DevStride to fully display/utilize.

- **Authentication**: Uses HTTP Basic Auth (API Key as username, API Secret as password) per DevStride API docs.

## MCP Tools

### `set_current_board`

Set the current board/workstream context. Subsequent epic and story creation will default to this board without needing to specify the workstream ID.

**Parameters:**
- `boardId` (required): UUID of the board to set as current

Example: Set current board to Sprint 2 (Q1|26):
```bash
# In Copilot: "Set the current board to 2406aa12-4d39-4e3a-bd34-70f4f9a0c3fc"
```

### `get_current_board`

Get the currently set board/workstream context.

**No parameters required.**

### `list_workstreams`

Returns all boards (workstreams) in your DevStride organization.

**No parameters required.**

### `list_items`

Returns all items (Epics, Stories, Tasks, Bugs) in your organization. Optionally filter by type.

**Parameters:**
- `type` (optional): Filter by item type, e.g., "Epic", "Story"

Example output:
```json
[
  {
    "id": "item-1",
    "type": "Epic",
    "title": "Q1 Roadmap",
    "workstreamId": "abc-123-def"
  }
]
```

### `create_epic`

Create a new Epic in a specified board. If boardId is not provided, uses the current board context.

**Parameters:**
- `title` (required): Epic title
- `boardId` (optional): Target board UUID. If not provided, uses current board context.
- `description` (optional): Epic description
- `priority` (optional): Priority level (e.g., "Low", "Medium", "High", "Critical")
- `dueDate` (optional): Due date in YYYY-MM-DD format
- `assignee` (optional): Assignee name or username

Example in Copilot:
```
"Create an epic named 'MCP Test' with description 'This was created via AI', 
due date Jan 29, 2026, and assign to Adam Saslow with Low priority"
```

Example response:
```json
{
  "success": true,
  "id": "I20121",
  "title": "MCP Test",
  "description": "<p>This was created via AI</p>",
  "dueDate": "2026-01-29",
  "priority": null,
  "assignee": null
}
```

### `create_story`

Create a new Story in a specified board. If boardId is not provided, uses the current board context.

**Parameters:**
- `title` (required): Story title
- `boardId` (optional): Target board UUID. If not provided, uses current board context.
- `description` (optional): Story description
- `priority` (optional): Priority level (e.g., "Low", "Medium", "High", "Critical")
- `dueDate` (optional): Due date in YYYY-MM-DD format
- `assignee` (optional): Assignee name or username

- **MCP Protocol**: The server runs on stdio and expects MCP protocol messages, designed for integration with Copilot and other MCP-compatible clients.
