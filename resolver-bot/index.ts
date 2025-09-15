import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'Bdb3u2HsT8FSVanNXrpLWvBxxYXrvLebWki2NqeBcgYT');
const N8N_WEBHOOK = process.env.N8N_WEBHOOK || 'https://erikande85.app.n8n.cloud/webhook/5a62baa2-c8f3-4aaf-affb-8ae753e0a4ab';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

// Load resolver keypair
const secret = JSON.parse(fs.readFileSync('resolver-keypair.json', 'utf8'));
const RESOLVER_KEYPAIR = Keypair.fromSecretKey(new Uint8Array(secret));

async function main() {
    console.log('Starting Solana Betting Resolver Bot...');
    console.log('Program ID:', PROGRAM_ID.toString());
    console.log('Resolver:', RESOLVER_KEYPAIR.publicKey.toString());

    const connection = new Connection(RPC_URL);
    const wallet = new Wallet(RESOLVER_KEYPAIR);
    const provider = new AnchorProvider(connection, wallet, {});

    // For now, just log that we're running
    console.log('Bot is monitoring for claims...');

    // Keep the process alive
    setInterval(() => {
        console.log('Bot is active...');
    }, 30000);
}

main().catch(console.error);