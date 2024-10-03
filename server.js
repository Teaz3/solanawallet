const express = require('express');
const { Keypair } = require('@solana/web3.js');
const cors = require('cors'); // To allow cross-origin requests
const os = require('os'); // To detect the number of CPU cores

const app = express();
app.use(express.json());
app.use(cors());

const maxAttempts = 1000000;
const numCores = os.cpus().length; // Use available CPU cores for parallel processing

const generateWalletsInParallel = (customWord) => {
  return new Promise((resolve) => {
    let attempts = 0;
    let foundWallet = null;
    let completedTasks = 0;

    const generateWalletTask = () => {
      for (let i = 0; i < maxAttempts / numCores; i++) {
        const wallet = Keypair.generate();
        const publicKeyString = wallet.publicKey.toString();
        attempts++;

        if (publicKeyString.startsWith(customWord)) {
          foundWallet = wallet;
          resolve({
            wallet: foundWallet,
            attempts,
          });
          return;
        }
      }

      completedTasks++;
      if (completedTasks === numCores) {
        // If all tasks are done and no wallet is found, return null
        resolve(null);
      }
    };

    // Start parallel tasks across CPU cores
    for (let i = 0; i < numCores; i++) {
      generateWalletTask();
    }
  });
};

app.post('/generate-wallet', async (req, res) => {
  const { customWord } = req.body;

  console.log(`Received custom word: ${customWord}`);

  if (!customWord || customWord.length > 4) {
    console.log('Custom word validation failed');
    return res.status(400).send({ error: 'Custom word is required and should be at most 4 characters.' });
  }

  try {
    const result = await generateWalletsInParallel(customWord);

    if (result) {
      const { wallet, attempts } = result;
      console.log(`Success after ${attempts} attempts. Public Key: ${wallet.publicKey.toString()}`);

      res.send({
        publicKey: wallet.publicKey.toString(),
        privateKey: wallet.secretKey.toString('hex'),
        attempts,
      });
    } else {
      console.log(`Failed to generate wallet after ${maxAttempts} attempts.`);
      res.status(500).send({ error: 'Failed to generate a wallet with the custom word.' });
    }
  } catch (error) {
    console.error('Error during wallet generation:', error);
    res.status(500).send({ error: 'Server error during wallet generation.' });
  }
});


app.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});