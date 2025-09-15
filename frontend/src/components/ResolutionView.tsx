import { ResolutionData, Side } from '../utils/types';

interface ResolutionViewProps {
  resolution: ResolutionData;
  winner: Side | null;
  onDispute?: () => void;
  onPayout?: () => void;
}

export default function ResolutionView({ resolution, winner, onDispute, onPayout }: ResolutionViewProps) {
  const isLowConfidence = resolution.confidence < 85;
  const verdictColor = resolution.verdict ? 'text-solana' : 'text-vs-red';
  const winnerSide = winner === Side.A ? 'FOR' : 'AGAINST';

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-vs-white mb-6">Resolution</h3>
      
      <div className="space-y-4">
        {/* Verdict */}
        <div className="text-center p-6 bg-deep-blue/30 rounded-lg">
          <div className="text-sm text-vs-gray mb-2">Final Verdict</div>
          <div className={`text-4xl font-bold ${verdictColor} mb-2`}>
            {resolution.verdict ? 'TRUE' : 'FALSE'}
          </div>
          <div className="text-lg text-vs-white">
            Side {winner} ({winnerSide}) Wins!
          </div>
        </div>

        {/* Confidence Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-vs-gray">AI Confidence</span>
            <span className={`text-sm font-medium ${isLowConfidence ? 'text-vs-red' : 'text-solana'}`}>
              {resolution.confidence}%
            </span>
          </div>
          <div className="w-full bg-deep-blue/30 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isLowConfidence ? 'bg-vs-red' : 'bg-solana'
              }`}
              style={{ width: `${resolution.confidence}%` }}
            />
          </div>
          {isLowConfidence && (
            <div className="text-xs text-vs-red mt-1">
              ⚠️ Low confidence - eligible for human review
            </div>
          )}
        </div>

        {/* Resolution Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-vs-gray">Method:</span>
            <span className="ml-2 text-vs-white font-medium">
              {resolution.method}
            </span>
          </div>
          <div>
            <span className="text-vs-gray">Resolved:</span>
            <span className="ml-2 text-vs-white font-medium">
              {formatTimestamp(resolution.timestamp)}
            </span>
          </div>
        </div>

        <div>
          <span className="text-vs-gray text-sm">Resolver:</span>
          <span className="ml-2 text-vs-white font-mono text-sm">
            {resolution.resolver.toString().slice(0, 8)}...
          </span>
        </div>

        {/* Evidence Link */}
        <div className="p-3 bg-deep-blue/20 rounded-lg">
          <div className="text-xs text-vs-gray mb-1">Evidence & Data Sources</div>
          <a
            href="#"
            className="text-solana hover:text-solana/80 text-sm transition-colors"
          >
            View on Arweave →
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {isLowConfidence && resolution.method === 'AI' && (
            <button
              onClick={onDispute}
              className="btn-danger flex-1"
            >
              Request Human Review
            </button>
          )}
          
          {resolution.confidence >= 85 && (
            <button
              onClick={onPayout}
              className="btn-primary flex-1"
            >
              Claim Payout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}