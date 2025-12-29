import React from 'react';
import { motion } from 'framer-motion';
import { X, Search, Copy, Star, TrendingUp, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

interface StrategyLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyLibraryModal: React.FC<StrategyLibraryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const strategies = [
    {
      title: 'ETH Accumulator',
      desc: 'Buy ETH on dips below moving average and stake in Lido.',
      apy: '14.5%',
      risk: 'Medium',
      blocks: 4,
      author: 'DeFi_Wizard',
      popular: true,
    },
    {
      title: 'Stablecoin Yield Farm',
      desc: 'Loop USDC/DAI supply on Aave with leverage monitoring.',
      apy: '8.2%',
      risk: 'Low',
      blocks: 6,
      author: 'StableLab',
      popular: true,
    },
    {
      title: 'Trend Follower V2',
      desc: 'Momentum strategy using RSI and MACD crossovers for BTC/ETH pair.',
      apy: '22.1%',
      risk: 'High',
      blocks: 8,
      author: 'Quant_X',
      popular: false,
    },
    {
      title: 'Delta Neutral Arb',
      desc: 'Uniswap v3 vs Curve stable arbitrage with flashloans.',
      apy: '18.5%',
      risk: 'Medium',
      blocks: 12,
      author: 'ArbBot_01',
      popular: false,
    },
    {
      title: 'Portfolio Rebalancer',
      desc: 'Monthly rebalance of top 5 DeFi tokens with 20% allocation each.',
      apy: 'N/A',
      risk: 'Low',
      blocks: 5,
      author: 'IndexCo',
      popular: false,
    },
    {
      title: 'Liquidation Protector',
      desc: 'Auto-repay Aave loans when health factor drops below 1.2.',
      apy: 'Safety',
      risk: 'Low',
      blocks: 3,
      author: 'SafetyFirst',
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-6xl h-[85vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
            <h2 className="text-lg font-bold font-mono uppercase">Strategy Library</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 text-ink transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
                <input 
                    type="text" 
                    placeholder="Search strategies..." 
                    className="w-full h-10 pl-10 pr-4 border border-gray-300 focus:border-ink outline-none text-sm font-sans"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
            <div className="flex gap-2">
                <button className="px-4 py-2 text-xs font-bold uppercase bg-ink text-white">Popular</button>
                <button className="px-4 py-2 text-xs font-bold uppercase bg-white border border-gray-300 hover:border-ink text-gray-600 hover:text-ink transition-colors">Newest</button>
                <button className="px-4 py-2 text-xs font-bold uppercase bg-white border border-gray-300 hover:border-ink text-gray-600 hover:text-ink transition-colors">My Saved</button>
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {strategies.map((strategy, i) => (
                    <div key={i} className="bg-white border border-gray-200 hover:border-ink shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-ink text-lg leading-tight mb-1">{strategy.title}</h3>
                                <p className="text-xs text-gray-400 font-mono">by {strategy.author}</p>
                            </div>
                            {strategy.popular && <Star size={16} className="text-orange fill-orange" />}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-6 flex-1">{strategy.desc}</p>
                        
                        <div className="flex items-center gap-4 mb-6 text-xs font-mono">
                            <div>
                                <span className="text-gray-400 uppercase block mb-1">APY</span>
                                <span className="font-bold text-success-green bg-green-50 px-2 py-1">{strategy.apy}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 uppercase block mb-1">Risk</span>
                                <span className={`font-bold px-2 py-1 ${strategy.risk === 'High' ? 'text-alert-red bg-red-50' : strategy.risk === 'Low' ? 'text-blue-600 bg-blue-50' : 'text-orange bg-orange/10'}`}>
                                    {strategy.risk}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400 uppercase block mb-1">Blocks</span>
                                <span className="font-bold text-ink bg-gray-100 px-2 py-1">{strategy.blocks}</span>
                            </div>
                        </div>

                        <Button variant="secondary" fullWidth className="group-hover:bg-ink group-hover:text-white group-hover:border-ink">
                            Load Strategy
                        </Button>
                    </div>
                ))}
            </div>
        </div>
      </motion.div>
    </div>
  );
};
