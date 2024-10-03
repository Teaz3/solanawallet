import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Circles } from 'react-loader-spinner';
import './App.css';
import { FaCopy, FaCheck } from 'react-icons/fa';

function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const [customWord, setCustomWord] = useState('');
  const [generatedWallet, setGeneratedWallet] = useState(null);
  const [purchased, setPurchased] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false); // State to control confirmation dialog

  const paymentAddress = 'GENojK77K8qwDf1SW6SpPEG8r185gSWJzvaNGnofWM8q';

  useEffect(() => {
    if (window.phantom?.solana?.isPhantom) {
      toast.success('Phantom wallet detected!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } else {
      toast.error('Phantom wallet not detected. Please install Phantom.', {
        position: 'top-right',
        autoClose: 3000,
      });
      window.open('https://phantom.app/', '_blank');
    }
  }, []);

  const handleInputChange = (event) => {
    setCustomWord(event.target.value);
  };

  const handleGenerateWallet = async () => {
    if (!customWord) {
      toast.error('Please enter a custom word.', {
        position: 'top-right',
        autoClose: 5000,
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedWallet(null);

    try {
      const response = await fetch('http://localhost:3001/generate-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customWord }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Wallet generated after ${data.attempts} attempts!`, {
          position: 'top-right',
          autoClose: 5000,
        });

        setGeneratedWallet({
          publicKey: data.publicKey,
          privateKey: data.privateKey,
        });
        setPurchased(false);
      } else {
        toast.error(`Failed to generate wallet: ${data.error}`, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    } catch (error) {
      toast.error('Server error: Unable to generate wallet.', {
        position: 'top-right',
        autoClose: 5000,
      });
    }

    setIsGenerating(false);
  };

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);

      const provider = window.phantom?.solana;
      if (!provider?.isPhantom) {
        toast.error("Please install Phantom Wallet", {
          position: "top-right",
          autoClose: 5000,
        });
        setIsPurchasing(false);
        return;
      }

      if (!provider.isConnected) {
        await provider.connect();
      }

      const connection = new Connection("https://wiser-hardworking-lake.solana-mainnet.quiknode.pro/48bc4dcb95ec7232a8fa3b81f403eb49b974fc60", 'confirmed');
      const fromPubkey = provider.publicKey;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: new PublicKey(paymentAddress),
          lamports: 0.001 * 1e9,
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const { signature } = await provider.signAndSendTransaction(transaction);

      toast.info('Transaction signature received. Waiting for confirmation...', {
        position: 'top-right',
        autoClose: 5000,
      });

      const confirmation = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        { commitment: 'confirmed', maxRetries: 5 }
      );

      if (confirmation?.value?.err === null) {
        toast.success('Transaction successful! Private key revealed.', {
          position: 'top-right',
          autoClose: 5000,
        });
        setPurchased(true);
      } else {
        throw new Error("Transaction failed.");
      }
    } catch (error) {
      toast.error('Transaction failed, please try again.', {
        position: 'top-right',
        autoClose: 5000,
      });
    }

    setIsPurchasing(false);
  };

  const copyToClipboard = (text) => {
    const textWithBrackets = `[${text}]`;
    navigator.clipboard.writeText(textWithBrackets).then(() => {
      toast.success("Copied to clipboard!", {
        position: 'top-right',
        autoClose: 2000,
      });
    }).catch(() => {
      toast.error("Failed to copy.", {
        position: 'top-right',
        autoClose: 2000,
      });
    });
  };

  const handleImport = () => {
    setShowConfirmation(true);
  };

  const confirmImport = () => {
    toast.success("Wallet imported successfully!", {
      position: 'top-right',
      autoClose: 2000,
    });
    setGeneratedWallet(null); // Clear the wallet
    setPurchased(false); // Reset purchase state
    setCustomWord(''); // Clear the custom word
    setShowConfirmation(false); // Hide confirmation dialog
  };

  const cancelImport = () => {
    setShowConfirmation(false); // Hide confirmation dialog
  };

  return (
    <ConnectionProvider endpoint={clusterApiUrl('devnet')}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app-container">
            <h1 className="app-title">Solana Custom Wallet Generator</h1>

            <div className="input-group">
              <input
                type="text"
                value={customWord}
                onChange={handleInputChange}
                placeholder="Enter a custom word"
                className="input-field"
              />
              <button
                onClick={handleGenerateWallet}
                className="generate-button"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Wallet'}
              </button>
            </div>

            {isGenerating && (
              <div className="loading-container">
                <Circles height="80" width="80" color="#4fa94d" />
                <h4>Generating wallet, please wait...</h4>
              </div>
            )}

            {generatedWallet && (
              <div className="wallet-container">
                <h3 className="wallet-header">Generated Wallet</h3>
                <div className="wallet-info">
                  <p><strong>Public Key:</strong> {generatedWallet.publicKey}</p>
                </div>

                {!purchased && (
                  <div>
                    <button
                      onClick={handlePurchase}
                      className="purchase-button"
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? 'Processing...' : 'Purchase to Reveal Private Key'}
                    </button>
                    {isPurchasing && (
                      <div className="loading-container">
                        <Circles height="80" width="80" color="#4fa94d" />
                        <h4>Transaction in progress, please wait...</h4>
                      </div>
                    )}
                  </div>
                )}

                {purchased && (
                  <div className="wallet-info">
                    <p><strong>Private Key (Hex Encoded):</strong> [{generatedWallet.privateKey}]</p>
                    <div className="button-group">
                      <button
                        className="copy-button"
                        onClick={() => copyToClipboard(generatedWallet.privateKey)}
                      >
                        <FaCopy /> {/* Copy icon */}
                      </button>
                      <button
                        className="import-button"
                        onClick={handleImport}
                      >
                        <FaCheck /> {/* Tick icon */}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showConfirmation && (
              <div className="confirmation-dialog">
                <p>Make sure the private key is saved before confirming. This action cannot be reversed!</p>
                <button className="confirm-button" onClick={confirmImport}>Confirm</button>
                <button className="cancel-button" onClick={cancelImport}>Cancel</button>
              </div>
            )}
          </div>
          <ToastContainer />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;