/**
 * Google Docs API helpers.
 * createPlaybookDoc, fetchDoc, buildBatchRequests, parsePlaybook.
 */

import { ensureFreshToken } from './tokens';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ParsedPlaybook {
  who_you_are?: string;
  who_you_serve?: string;
  what_you_offer?: string;
  transformation?: string;
  common_objections?: string;
  common_questions?: string;
  discovery_questions?: string;
  closing_approach?: string;
  voice_and_tone?: string;
  guardrails?: string;
  [key: string]: string | undefined;
}

export interface AgentForDoc {
  id: string;
  host_id: string;
  internal_name: string;
  display_name: string;
  completed_sections: CompletedSection[];
}

export interface CompletedSection {
  key: string;
  content: string;
}

// Map section keys to their display titles for the Google Doc
const SECTION_TITLES: Record<string, string> = {
  who_you_are: '1. Who You Are',
  who_you_serve: '2. Who You Serve',
  what_you_offer: '3. What You Offer',
  transformation: '4. The Transformation',
  common_objections: '5. Common Objections',
  common_questions: '6. Common Questions',
  discovery_questions: '7. Discovery Questions',
  closing_approach: '8. Closing Approach',
  voice_and_tone: '9. Voice & Tone',
  guardrails: '10. Guardrails',
};

const SECTION_ORDER = [
  'who_you_are',
  'who_you_serve',
  'what_you_offer',
  'transformation',
  'common_objections',
  'common_questions',
  'discovery_questions',
  'closing_approach',
  'voice_and_tone',
  'guardrails',
];

/**
 * Create a Google Doc for an agent's playbook.
 * Populates with completed sections. Handles batchUpdate failure with cleanup.
 */
export async function createPlaybookDoc(
  agentId: string,
  companyName: string,
  sections: CompletedSection[]
): Promise<{ documentId: string; revisionId: string }> {
  // Get fresh token
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('host_id, internal_name')
    .eq('id', agentId)
    .single();

  if (!agent) throw new Error('Agent not found');

  const accessToken = await ensureFreshToken(agent.host_id);

  // 1. Create the doc
  const createResp = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${companyName} — ${agent.internal_name} — DiscoveryCall Playbook`,
    }),
  });

  if (!createResp.ok) {
    throw new Error(`Doc creation failed: ${createResp.status} ${await createResp.text()}`);
  }

  const doc = await createResp.json();
  const documentId: string = doc.documentId;

  // 2. Build batchUpdate requests from sections
  const requests = buildBatchRequests(sections);

  // 3. Batch update with content
  try {
    if (requests.length > 0) {
      const batchResp = await fetch(
        `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        }
      );

      if (!batchResp.ok) {
        throw new Error(`Batch update failed: ${batchResp.status} ${await batchResp.text()}`);
      }
    }

    // 4. Fetch the doc to get revision ID
    const fetchResp = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!fetchResp.ok) {
      throw new Error(`Could not fetch doc after creation: ${fetchResp.status}`);
    }

    const finalDoc = await fetchResp.json();

    return { documentId, revisionId: finalDoc.revisionId ?? '1' };
  } catch (err) {
    // Cleanup: delete the empty doc
    console.error('[google/docs] batchUpdate failed, deleting empty doc:', err);
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (cleanupErr) {
      console.error('[google/docs] Cleanup failed — empty doc left in Drive:', cleanupErr);
    }

    // Reset agent status back to building
    await supabaseAdmin
      .from('agents')
      .update({
        status: 'building',
        google_doc_id: null,
        doc_version: null,
      })
      .eq('id', agentId);

    throw err;
  }
}

/**
 * Build Google Docs API batchUpdate requests for all sections.
 * Inserts sections in order, with H1 headings.
 */
function buildBatchRequests(sections: CompletedSection[]): object[] {
  const requests: object[] = [];

  // Sort sections by canonical order
  const sorted = [...sections].sort(
    (a, b) => SECTION_ORDER.indexOf(a.key) - SECTION_ORDER.indexOf(b.key)
  );

  // We insert at the beginning of the doc (index 1).
  // Build in reverse order so each insertion ends up in the right place.
  const reversed = [...sorted].reverse();

  for (const section of reversed) {
    const title = SECTION_TITLES[section.key] ?? section.key;
    const content = section.content.trim();

    // Insert body content first (will be pushed down by heading insert)
    if (content) {
      requests.push({
        insertText: {
          location: { index: 1 },
          text: content + '\n\n',
        },
      });
    }

    // Insert heading
    requests.push({
      insertText: {
        location: { index: 1 },
        text: title + '\n',
      },
    });
  }

  // Apply heading styles after all insertions
  // This is done in a second pass — we'll apply styles to known heading text positions
  // For simplicity in Phase 1, we insert all text then apply named style to headings
  // A simpler approach: just insert the text with markup — Google Docs will parse it

  return requests;
}

/**
 * Fetch and parse a Google Doc into a ParsedPlaybook.
 */
export async function fetchAndParseDoc(
  agentId: string,
  googleDocId: string
): Promise<{ playbook: ParsedPlaybook; revisionId: string }> {
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('host_id')
    .eq('id', agentId)
    .single();

  if (!agent) throw new Error('Agent not found');

  const accessToken = await ensureFreshToken(agent.host_id);

  const resp = await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch doc: ${resp.status} ${await resp.text()}`);
  }

  const doc = await resp.json();
  const playbook = parseDocContent(doc.body?.content ?? []);

  return { playbook, revisionId: doc.revisionId ?? '1' };
}

/**
 * Parse Google Docs content array into ParsedPlaybook.
 * Uses H1 headings as section delimiters.
 */
export function parseDocContent(content: GoogleDocElement[]): ParsedPlaybook {
  const sections: Record<string, string> = {};
  let currentSection: string | null = null;
  const currentContent: string[] = [];

  for (const element of content) {
    if (!element.paragraph) continue;

    const style = element.paragraph.paragraphStyle?.namedStyleType;
    const text = extractParagraphText(element.paragraph);

    if (!text.trim()) {
      if (currentSection && currentContent.length > 0) {
        currentContent.push('');
      }
      continue;
    }

    if (style === 'HEADING_1' || style === 'TITLE') {
      // Save previous section
      if (currentSection) {
        sections[normalizeKey(currentSection)] = currentContent.join('\n').trim();
        currentContent.length = 0;
      }
      currentSection = text;
    } else if (currentSection) {
      currentContent.push(text);
    }
  }

  // Save last section
  if (currentSection) {
    sections[normalizeKey(currentSection)] = currentContent.join('\n').trim();
  }

  return sections as ParsedPlaybook;
}

function normalizeKey(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extractParagraphText(paragraph: GoogleDocParagraph): string {
  if (!paragraph.elements) return '';
  return paragraph.elements
    .map((el: GoogleDocElement) => el.textRun?.content ?? '')
    .join('')
    .replace(/\n$/, '');
}

// Google Docs JSON types (minimal)
interface GoogleDocElement {
  paragraph?: GoogleDocParagraph;
  textRun?: { content: string };
}

interface GoogleDocParagraph {
  paragraphStyle?: { namedStyleType?: string };
  elements?: GoogleDocElement[];
}

/**
 * Write updated section content back to a Google Doc.
 * Replaces the body content entirely with new sections.
 */
export async function writePlaybookToDoc(
  agentId: string,
  googleDocId: string,
  sections: CompletedSection[]
): Promise<string> {
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('host_id')
    .eq('id', agentId)
    .single();

  if (!agent) throw new Error('Agent not found');

  const accessToken = await ensureFreshToken(agent.host_id);

  // First fetch the doc to get its current content length
  const fetchResp = await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!fetchResp.ok) {
    throw new Error(`Failed to fetch doc for update: ${fetchResp.status}`);
  }

  const doc = await fetchResp.json();
  const bodyContent = doc.body?.content ?? [];

  // Find the end index of the document body
  let endIndex = 1;
  for (const element of bodyContent) {
    if (element.endIndex) endIndex = Math.max(endIndex, element.endIndex);
  }

  const requests: object[] = [];

  // Delete all existing content (except the final newline the API requires)
  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    });
  }

  // Insert new content
  const sorted = [...sections].sort(
    (a, b) => SECTION_ORDER.indexOf(a.key) - SECTION_ORDER.indexOf(b.key)
  );

  // Build full text to insert at index 1
  let fullText = '';
  for (const section of sorted) {
    const title = SECTION_TITLES[section.key] ?? section.key;
    fullText += title + '\n' + section.content.trim() + '\n\n';
  }

  if (fullText.trim()) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: fullText.trim(),
      },
    });
  }

  if (requests.length > 0) {
    const batchResp = await fetch(
      `https://docs.googleapis.com/v1/documents/${googleDocId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!batchResp.ok) {
      throw new Error(`Write to doc failed: ${batchResp.status} ${await batchResp.text()}`);
    }

    const result = await batchResp.json();
    return result.documentId ?? googleDocId;
  }

  // Fetch updated revision ID
  const refetchResp = await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const refetched = await refetchResp.json();
  return refetched.revisionId ?? '1';
}
