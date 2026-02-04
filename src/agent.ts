import { createEpic, createStory, updateItem, getItem, listBoards, listWorkstreams, createItemInWorkstream, updateItemStatus, laneToLaneIdMap, postComment, assignItem, getItemStatus } from './devstrideClient';

function extractQuoted(text: string) {
  const m = text.match(/"([^"]+)"|'([^']+)'/);
  return m ? (m[1] || m[2]) : null;
}

function extractAfterKeywords(text: string, keywords: string[]) {
  for (const kw of keywords) {
    const idx = text.toLowerCase().indexOf(kw.toLowerCase());
    if (idx >= 0) {
      const after = text.slice(idx + kw.length).trim();
      if (after) return after.replace(/^[:\-\s]+/, '').trim();
    }
  }
  return null;
}

export async function handleNaturalLanguage(input: string) {
  const text = input.trim();

  // Create Epic
  if (/create|add|make|new/.test(text) && /epic/.test(text)) {
    const title = extractQuoted(text) || extractAfterKeywords(text, ['epic called', 'epic named', 'epic:','create epic','add epic','new epic']) || text;
    const description = null;

    // Try to find workstream name in the command
    const wsQuoted = text.match(/in workstream "([^"]+)"|in the "([^"]+)" workstream|in workstream '([^']+)'/i);
    const wsName = wsQuoted ? (wsQuoted[1] || wsQuoted[2] || wsQuoted[3]) : extractAfterKeywords(text, ['in workstream', 'in the workstream', 'in the']) ;

    if (wsName) {
      // Resolve workstream name to id
      const boards = await listBoards();
      let workstreamId: string | undefined;

      if (boards && Array.isArray(boards)) {
        for (const b of boards) {
          const boardId = b.id || b._id || b.boardId;
          if (!boardId) continue;
          const wss = await listWorkstreams(boardId).catch(() => null);
          if (wss && Array.isArray(wss)) {
            const matched = wss.find((w: any) => (w.name || '').toLowerCase() === wsName.toLowerCase());
            if (matched) {
              workstreamId = matched.id || matched._id || matched.workstreamId;
              break;
            }
          }
        }
      }

      // If not found via boards, try top-level workstreams list
      if (!workstreamId) {
        const wss = await listWorkstreams().catch(() => null);
        if (wss && Array.isArray(wss)) {
          const matched = wss.find((w: any) => (w.name || '').toLowerCase() === wsName.toLowerCase());
          if (matched) workstreamId = matched.id || matched._id || matched.workstreamId;
        }
      }

      if (!workstreamId) {
        return { error: `Workstream '${wsName}' not found; please provide the workstream ID.` };
      }

      const created = await createItemInWorkstream('Epic', title, workstreamId, description || undefined);
      return { id: created.id || created._id || null, raw: created };
    }

    // Fallback to create without workstream
    return await createEpic(title, undefined);
  }

  // Create Story
  if (/create|add|make|new/.test(text) && /story/.test(text)) {
    const title = extractQuoted(text) || extractAfterKeywords(text, ['story called', 'story named', 'story:','create story','add story','new story']) || text;
    const description: string | undefined = undefined;
    return await createStory(title, description);
  }

  // Get item status (example: "What's the status of I20147?" or "Get I20146")
  if (/(status|get|what|show)/i.test(text) && /\b(I\d+)\b/i.test(text)) {
    const idMatch = text.match(/\b(I\d+)\b/i);
    if (idMatch) {
      const id = idMatch[1];
      return await getItemStatus(id);
    }
  }

  // Update item status (example: "start work on I20135" or "move I20135 to In Progress")
  if ((/(start|begin|move|update)/i.test(text) && (/(work|status|to)/i.test(text))) || /(in progress|code review|qa review|design review|not started)/i.test(text)) {
    const idMatch = text.match(/\b(I\d+)\b/i) || text.match(/item\s+(\w[\w-]*)/i);
    if (idMatch) {
      const id = idMatch[1];
      
      // Try to extract status from common patterns
      let status: string | null = null;
      const statuses = Object.keys(laneToLaneIdMap);
      
      for (const s of statuses) {
        if (text.toLowerCase().includes(s.toLowerCase())) {
          status = s;
          break;
        }
      }
      
      // Default to "In Progress" if moving/starting work
      if (!status && (/start|begin|move|working/.test(text))) {
        status = 'In Progress';
      }
      
      if (status) {
        return await updateItemStatus(id, status);
      }
    }
  }

  // Update item by id (example: "update item 12345 set title to \"New title\"")
  if (/update/.test(text) && /item/.test(text)) {
    const idMatch = text.match(/item\s+(\w[\w-]*)/i);
    if (idMatch) {
      const id = idMatch[1];
      const titleQuoted = extractQuoted(text);
      const patch: any = {};
      if (/title/.test(text) && titleQuoted) patch.title = titleQuoted;
      // additional naive updates could be implemented here
      if (Object.keys(patch).length === 0) throw new Error('No recognized update fields (try quoting the new title).');
      return await updateItem(id, patch);
    }
  }

  // Post comment (example: "Post a comment on I20147 saying 'build 232 is spinning'")
  if (/(post|add|comment|say)/i.test(text)) {
    const idMatch = text.match(/\b(I\d+)\b/i);
    if (idMatch) {
      const itemNumber = idMatch[1];
      const message = extractQuoted(text) || extractAfterKeywords(text, ['saying', 'with', 'message', 'saying:']) || text;
      if (message && message !== text) {
        return await postComment(itemNumber, message);
      }
    }
  }

  // Assign item (example: "assign I20146 to Nico Cinquegrani")
  if (/(assign)/i.test(text) && /(to)/i.test(text)) {
    const idMatch = text.match(/\b(I\d+)\b/i);
    if (idMatch) {
      const itemId = idMatch[1];
      const assignee = extractAfterKeywords(text, ['to']) || extractAfterKeywords(text, ['assign']) || null;
      if (assignee) {
        return await assignItem(itemId, assignee);
      }
    }
  }

  // Fallback: echo help
  return {
    message: 'Could not parse command. Examples: \n - Create epic "My Epic"\n - Create story "User can log in"\n - What is the status of I20147\n - Start work on I20135\n - Move I20135 to Code Review\n - Post a comment on I20147 saying "your message"\n - Assign I20146 to Nico Cinquegrani'
  };
}
