const { Connection, PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

async function testProgram() {
    // Connect to Devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Program ID
    const programId = new PublicKey('Bdb3u2HsT8FSVanNXrpLWvBxxYXrvLebWki2NqeBcgYT');

    // Load wallet
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('C:\\Users\\rooster\\.config\\solana\\id.json', 'utf8')))
    );

    console.log('Wallet:', walletKeypair.publicKey.toString());
    console.log('Program ID:', programId.toString());

    // Test instruction (create_claim = 0)
    const instructionData = Buffer.from([0]); // create_claim instruction

    const transaction = new Transaction().add(
        new TransactionInstruction({
            keys: [],
            programId,
            data: instructionData,
        })
    );

    try {
        const signature = await connection.sendTransaction(transaction, [walletKeypair]);
        console.log('Transaction sent:', signature);

        // Wait for confirmation
        await connection.confirmTransaction(signature);
        console.log('Transaction confirmed!');
    } catch (error) {
        console.error('Error:', error);
    }
}

testProgram();