import { useRouter } from 'next/router';
import Link from 'next/link';
import WalletConnect from '../components/WalletConnect';
import ClaimForm from '../components/ClaimForm';
import { ClaimFormData } from '../utils/types';

export default function CreateClaim() {
  const router = useRouter();

  const handleClaimCreated = (data: ClaimFormData) => {
    // Redirect to home after successful creation
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-solana/20 bg-deep-blue/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="text-2xl font-bold text-solana">⚔️ VersusSol</div>
                <div className="text-sm text-vs-gray hidden sm:block">
                  Bet Head-to-Head on Solana
                </div>
              </div>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link href="/" className="text-solana hover:text-solana/80 transition-colors">
            ← Back to Claims
          </Link>
        </nav>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-vs-white mb-4">
            Create New Claim
          </h1>
          <p className="text-lg text-vs-gray max-w-2xl mx-auto">
            Make a prediction about the future. Others can bet for or against your claim.
            AI will resolve disputes automatically.
          </p>
        </div>

        {/* Form */}
        <ClaimForm onSubmit={handleClaimCreated} />

        {/* Tips */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-deep-blue/20 rounded-lg">
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="font-semibold text-vs-white mb-2">Be Specific</h3>
            <p className="text-sm text-vs-gray">
              Include exact dates, numbers, and sources for better AI resolution
            </p>
          </div>
          <div className="text-center p-6 bg-deep-blue/20 rounded-lg">
            <div className="text-2xl mb-3">⏰</div>
            <h3 className="font-semibold text-vs-white mb-2">Set Clear Deadlines</h3>
            <p className="text-sm text-vs-gray">
              Choose realistic timeframes that allow for proper verification
            </p>
          </div>
          <div className="text-center p-6 bg-deep-blue/20 rounded-lg">
            <div className="text-2xl mb-3">🤖</div>
            <h3 className="font-semibold text-vs-white mb-2">AI Resolution</h3>
            <p className="text-sm text-vs-gray">
              Claims with 85%+ AI confidence resolve automatically
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}