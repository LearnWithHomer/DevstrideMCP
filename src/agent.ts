import { createEpic, createStory, updateItem, getItem, listBoards, listWorkstreams, createItemInWorkstream } from './devstrideClient';

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

  // Fallback: echo help
  return {
    message: 'Could not parse command. Examples: \n - Create epic "My Epic"\n - Create story "User can log in"\n - Update item ITEM_ID set title "New title"'
  };
}
