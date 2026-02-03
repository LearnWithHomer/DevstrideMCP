# DevStride MCP Server (Node + TypeScript)

This project provides a Model Context Protocol (MCP) server for DevStride, allowing you to use natural language commands in GitHub Copilot to create and manage work items, view sprints, and interact with your DevStride workspace.

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
DEVSTRIDE_API_SECRET=YOUR_API_SECRET
```

**Security Note:** The `.env` file is in `.gitignore` and will never be committed to version control. Keep your API secret safe.

3. Build (optional, for production):

```bash
npm run build
```

## VS Code Workspace Setup

To integrate DevstrideMCP with your development workspace for Copilot access, create or update a VS Code workspace file (`.code-workspace`):

### Step 1: Create a Workspace File

Create a file named `workspace.code-workspace` (or use existing workspace):

```json
{
  "folders": [
    { "path": "/path/to/your/project" },
    { "path": "/path/to/DevstrideMCP" }
  ],
  "settings": {
    "modelcontextprotocol.servers": {
      "devstride": {
        "command": "npm",
        "args": ["run", "mcp"],
        "cwd": "/path/to/DevstrideMCP"
      }
    }
  }
}
```

### Step 2: Open the Workspace

In VS Code:
1. File → Open Workspace from File
2. Select your `workspace.code-workspace` file
3. Trust the workspace when prompted

### Step 3: Verify MCP Server

Once the workspace is open:
1. GitHub Copilot should automatically connect to the DevstrideMCP server
2. You can now use natural language commands in Copilot to manage DevStride items
3. Check the MCP logs in the terminal if issues occur

## Running the MCP Server

### Via VS Code Workspace (Recommended)

The easiest way is to set up a [VS Code Workspace](#vs-code-workspace-setup) as described above. VS Code and Copilot will automatically start the server.

### Manual Start

To start the server on stdio (for testing or standalone use):

```bash
npm run mcp
```

## Natural Language Commands

Once connected to Copilot, you can use commands like:

### Sprint & Board Management
- "What tickets are in the current sprint for the Apps team?"
- "List the items for the next upcoming sprint"
- "Set the current board to [board-id]"
- "What's the current board?"
- "List all workstreams"

### Creating Items
- "Create an epic named 'Build awesome feature'"
- "Create a story named 'As a user, I want to...' with description 'Details here' and due date tomorrow"
- "Create an epic named 'Q1 Roadmap' with priority High and assign to John"

### Managing Items
- "Start work on I20135" (moves to In Progress)
- "Move I20135 to Code Review"
- "Move I20147 to QA Review"

### Setting Board Context

You can also create items directly by specifying the board ID:

```bash
# In Copilot: "Create an epic named 'Do something' in board 2406aa12-4d39-4e3a-bd34-70f4f9a0c3fc with priority High and due date tomorrow"
```
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
