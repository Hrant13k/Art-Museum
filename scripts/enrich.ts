// Content enrichment: use the Claude API to generate concise, factual content
// for each artwork and artist. Resumable and incremental — re-running only
// processes items that are not yet enriched.
//
//   ANTHROPIC_API_KEY=sk-... npm run data:enrich
//
// Without a key, the script exits cleanly and the metadata fallback written by
// the collection step remains in place.
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import type { Artwork, Artist } from '../src/types/artwork.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const MODEL = process.env.ENRICH_MODEL || 'claude-haiku-4-5-20251001';
const SAVE_EVERY = 5;

const SYSTEM = `You are a museum content writer. Write concise, factual, engaging text for a calm art-appreciation app.
Rules:
- Plain English, readable in under two minutes total.
- Factual and grounded. No exaggeration, no clickbait, no invented facts.
- If something is genuinely unknown or uncertain, say so plainly (e.g. "Little is recorded about...").
- Do not repeat the title/artist verbatim in every field.`;

const ARTWORK_TOOL: Anthropic.Tool = {
  name: 'save_artwork_content',
  description: 'Save enriched, factual content for one artwork.',
  input_schema: {
    type: 'object',
    properties: {
      overview: { type: 'string', description: '2-3 sentence plain-language introduction.' },
      creationStory: { type: 'string', description: 'How and why the work was created (2-4 sentences).' },
      whoIsDepicted: { type: 'string', description: 'Who or what is depicted and why it matters. State if unknown.' },
      historicalContext: { type: 'string', description: 'The historical/cultural moment (2-4 sentences).' },
      interestingFacts: {
        type: 'array',
        items: { type: 'string' },
        description: '2-4 short, surprising-but-factual notes.',
      },
    },
    required: ['overview', 'creationStory', 'whoIsDepicted', 'historicalContext', 'interestingFacts'],
  },
};

const ARTIST_TOOL: Anthropic.Tool = {
  name: 'save_artist_content',
  description: 'Save factual biographical content for one artist.',
  input_schema: {
    type: 'object',
    properties: {
      bio: { type: 'string', description: '3-5 sentence factual biography.' },
      birthYear: { type: ['string', 'null'], description: 'Birth year as a string, or null if unknown.' },
      deathYear: { type: ['string', 'null'], description: 'Death year as a string, or null if living/unknown.' },
      nationality: { type: ['string', 'null'], description: 'Nationality, or null if unknown.' },
      movement: { type: ['string', 'null'], description: 'Primary artistic movement, or null.' },
    },
    required: ['bio'],
  },
};

async function callTool<T>(client: Anthropic, prompt: string, tool: Anthropic.Tool): Promise<T | null> {
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: prompt }],
    });
    const block = msg.content.find((b) => b.type === 'tool_use');
    return block && block.type === 'tool_use' ? (block.input as T) : null;
  } catch (err) {
    console.warn(`  ! Claude call failed: ${(err as Error).message}`);
    return null;
  }
}

async function load<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(join(DATA_DIR, file), 'utf8')) as T;
}
async function save(file: string, data: unknown): Promise<void> {
  await writeFile(join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.log('No ANTHROPIC_API_KEY set — skipping enrichment.');
    console.log('The metadata fallback content from `data:collect` remains in place.');
    console.log('Set ANTHROPIC_API_KEY and re-run `npm run data:enrich` to add rich content.');
    return;
  }
  const client = new Anthropic({ apiKey: key });

  const artworks = await load<Artwork[]>('artworks.json');
  const artists = await load<Artist[]>('artists.json');

  // — Artworks —
  const pending = artworks.filter((a) => a.enrichmentStatus !== 'enriched');
  console.log(`Enriching ${pending.length} artworks with ${MODEL}…`);
  let done = 0;
  for (const art of pending) {
    const prompt =
      `Write content for this artwork.\n` +
      `Title: ${art.title}\nArtist: ${art.artist}\nDate: ${art.year}\n` +
      `Medium: ${art.medium}\nCulture/Origin: ${art.culture || 'n/a'}\n` +
      `Movement: ${art.movement}\nMuseum: ${art.museum}`;
    const content = await callTool<Partial<Artwork>>(client, prompt, ARTWORK_TOOL);
    if (content) {
      art.overview = content.overview ?? art.overview;
      art.creationStory = content.creationStory ?? art.creationStory;
      art.whoIsDepicted = content.whoIsDepicted ?? art.whoIsDepicted;
      art.historicalContext = content.historicalContext ?? art.historicalContext;
      art.interestingFacts = content.interestingFacts ?? art.interestingFacts;
      art.enrichmentStatus = 'enriched';
    }
    if (++done % SAVE_EVERY === 0) {
      await save('artworks.json', artworks);
      process.stdout.write(`  …${done}/${pending.length}\r`);
    }
  }
  await save('artworks.json', artworks);
  console.log(`\n✓ Artworks enriched.`);

  // — Artists —
  const pendingArtists = artists.filter((a) => a.bioStatus !== 'enriched' && a.name !== 'Unknown artist');
  console.log(`Enriching ${pendingArtists.length} artists…`);
  done = 0;
  for (const artist of pendingArtists) {
    const prompt = `Write a factual biography for the artist: ${artist.name}. If you are not confident this is a real, identifiable artist, keep the bio brief and say information is limited.`;
    const content = await callTool<Partial<Artist>>(client, prompt, ARTIST_TOOL);
    if (content) {
      artist.bio = content.bio ?? artist.bio;
      artist.birthYear = content.birthYear ?? artist.birthYear;
      artist.deathYear = content.deathYear ?? artist.deathYear;
      artist.nationality = content.nationality ?? artist.nationality;
      artist.movement = content.movement ?? artist.movement;
      artist.bioStatus = 'enriched';
    }
    if (++done % SAVE_EVERY === 0) {
      await save('artists.json', artists);
      process.stdout.write(`  …${done}/${pendingArtists.length}\r`);
    }
  }
  await save('artists.json', artists);
  console.log(`\n✓ Artists enriched. Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
