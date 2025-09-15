import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import WalletConnect from '../src/components/WalletConnect';
import ClaimCard from '../src/components/ClaimCard';
import { ClaimAccount, ClaimStatus, Side } from '../src/utils/types';
import { solanaClient } from '../utils/solana';
import { toast } from 'react-hot-toast';

export default function Home() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const { connected } = useWallet();
  const [claims, setClaims] = useState<ClaimAccount[]>([]);
  const [filter, setFilter] = useState<ClaimStatus | 'All'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const claimsData = await solanaClient.getClaims();
      setClaims(claimsData);
    } catch (error) {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const handleBet = async (claimId: string, side: Side, amount: number) => {
    try {
      const signature = await solanaClient.joinPool(claimId, side, amount);
      toast.success(`Bet placed! Signature: ${signature.slice(0, 8)}...`);
      loadClaims(); // Refresh claims
    } catch (error: any) {
      toast.error(`Failed to place bet: ${error.message}`);
    }
  };

  const filteredClaims = claims.filter(claim => 
    filter === 'All' || claim.status === filter
  );

  const getFilterCount = (status: ClaimStatus | 'All') => {
    if (status === 'All') return claims.length;
    return claims.filter(claim => claim.status === status).length;
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-solana/20 bg-deep-blue/20 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-solana">⚔️ VersusSol</div>
                    <div className="text-sm text-vs-gray hidden sm:block">
                      Bet Head-to-Head on Solana
                    </div>
                  </div>
                  <WalletConnect />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-6xl font-bold text-vs-white mb-4">
                  Bet on <span className="text-solana">Anything</span>
                </h1>
                <p className="text-xl text-vs-gray mb-8 max-w-2xl mx-auto">
                  Create claims, challenge others, and let AI resolve disputes. 
                  Powered by Solana for instant, low-cost betting.
                </p>
                <Link href="/create">
                  <button className="btn-primary text-lg px-8 py-4">
                    Create Your First Claim
                  </button>
                </Link>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-8">
                {(['All', ClaimStatus.Open, ClaimStatus.Locked, ClaimStatus.Resolved, ClaimStatus.Disputed] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      filter === status
                        ? 'bg-solana text-vs-dark'
                        : 'bg-deep-blue/30 text-vs-gray hover:text-vs-white hover:bg-deep-blue/50'
                    }`}
                  >
                    {status} ({getFilterCount(status)})
                  </button>
                ))}
              </div>

              {/* Claims Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-solana border-t-transparent rounded-full mx-auto mb-4"></div>
                  <div className="text-vs-gray">Loading claims...</div>
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-semibold text-vs-white mb-2">
                    {filter === 'All' ? 'No claims yet' : `No ${filter.toLowerCase()} claims`}
                  </h3>
                  <p className="text-vs-gray mb-6">
                    {filter === 'All' 
                      ? 'Be the first to create a claim and start betting!'
                      : `Switch to "All" to see other claims.`
                    }
                  </p>
                  {filter === 'All' && (
                    <Link href="/create">
                      <button className="btn-primary">
                        Create First Claim
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClaims.map((claim, index) => (
                    <Link key={index} href={`/claim/${index}`}>
                      <div className="cursor-pointer">
                        <ClaimCard 
                          claim={claim} 
                          onBet={handleBet}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Stats */}
              {claims.length > 0 && (
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-solana">{claims.length}</div>
                    <div className="text-vs-gray">Total Claims</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-solana">
                      {claims.filter(c => c.status === ClaimStatus.Open).length}
                    </div>
                    <div className="text-vs-gray">Open Bets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-solana">
                      {claims.filter(c => c.status === ClaimStatus.Resolved).length}
                    </div>
                    <div className="text-vs-gray">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-solana">~2.5 SOL</div>
                    <div className="text-vs-gray">Total Volume</div>
                  </div>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="border-t border-solana/20 bg-deep-blue/20 backdrop-blur-sm mt-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="text-vs-gray text-sm mb-4 md:mb-0">
                    © 2025 VersusSol. Powered by Solana.
                  </div>
                  <div className="flex gap-6">
                    <a href="#" className="text-vs-gray hover:text-solana transition-colors">
                      Twitter
                    </a>
                    <a href="#" className="text-vs-gray hover:text-solana transition-colors">
                      GitHub
                    </a>
                    <a href="#" className="text-vs-gray hover:text-solana transition-colors">
                      Docs
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}