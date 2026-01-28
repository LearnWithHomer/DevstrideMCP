import dotenv from 'dotenv';
import { handleNaturalLanguage } from './agent';

dotenv.config();

async function run() {
  const args = process.argv.slice(2);
  let input = args.join(' ');

  if (!input) {
    // Read from stdin if no args
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    input = Buffer.concat(chunks).toString('utf8').trim();
  }

  if (!input) {
    console.log('Usage: npm run dev -- "Create epic \"My Epic\""');
    process.exit(1);
  }

  try {
    const res = await handleNaturalLanguage(input);
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message || err);
    process.exit(2);
  }
}

run();
