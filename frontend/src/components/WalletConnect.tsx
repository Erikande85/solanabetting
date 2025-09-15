import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

export default function WalletConnect() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (connected && publicKey) {
      connection.getBalance(publicKey).then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL);
      });
    }
  }, [connected, publicKey, connection]);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-4">
      {connected && publicKey ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-vs-gray">
              {shortenAddress(publicKey.toString())}
            </div>
            <div className="text-sm font-semibold text-solana">
              {balance.toFixed(3)} SOL
            </div>
          </div>
          <WalletMultiButton className="btn-primary" />
        </div>
      ) : (
        <WalletMultiButton className="btn-primary" />
      )}
    </div>
  );
}