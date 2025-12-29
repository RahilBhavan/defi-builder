import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownLeft, Wallet, PieChart } from 'lucide-react';
import { Button } from '../ui/Button';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const holdings = [
    { asset: 'ETH', amount: '5.24', value: '$12,450.20', change: '+2.4%' },
    { asset: 'USDC', amount: '8,450.00', value: '$8,450.00', change: '0.0%' },
    { asset: 'AAVE', amount: '120.00', value: '$14,200.00', change: '-1.2%' },
    { asset: 'WBTC', amount: '0.15', value: '$9,150.00', change: '+0.8%' },
  ];

  const transactions = [
    { type: 'SWAP', desc: 'ETH → USDC', amount: '1.2 ETH', time: '2 mins ago', status: 'Confirmed' },
    { type: 'SUPPLY', desc: 'Supply USDC to Aave', amount: '5000 USDC', time: '4 hours ago', status: 'Confirmed' },
    { type: 'HARVEST', desc: 'Claim Aave Rewards', amount: '12.5 AAVE', time: '1 day ago', status: 'Confirmed' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-5xl h-[85vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
            <div className="flex items-center gap-3">
                <Wallet className="text-ink" size={24} />
                <h2 className="text-lg font-bold font-mono uppercase">Portfolio</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 text-ink transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-6 bg-white border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Equity</p>
                    <p className="text-4xl font-mono font-bold text-ink">$44,250.20</p>
                    <p className="text-sm font-mono text-success-green mt-2 flex items-center gap-1">
                        <ArrowUpRight size={14} /> +$1,240.50 (24h)
                    </p>
                </div>
                <div className="p-6 bg-white border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active Strategies</p>
                    <p className="text-4xl font-mono font-bold text-ink">3</p>
                    <p className="text-sm font-mono text-gray-500 mt-2">Running on Sepolia</p>
                </div>
                <div className="p-6 bg-white border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Net APY</p>
                    <p className="text-4xl font-mono font-bold text-orange">12.4%</p>
                    <p className="text-sm font-mono text-gray-500 mt-2">Weighted Average</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Holdings Table */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase text-gray-500 flex items-center gap-2">
                            <PieChart size={16} /> Assets
                        </h3>
                    </div>
                    <div className="bg-white border border-gray-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                    <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase">Asset</th>
                                    <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase text-right">Balance</th>
                                    <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase text-right">Value</th>
                                    <th className="px-6 py-3 font-mono text-xs text-gray-500 uppercase text-right">Change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {holdings.map((item) => (
                                    <tr key={item.asset} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-ink">{item.asset}</td>
                                        <td className="px-6 py-4 font-mono text-right text-gray-600">{item.amount}</td>
                                        <td className="px-6 py-4 font-mono text-right text-ink">{item.value}</td>
                                        <td className={`px-6 py-4 font-mono text-right ${item.change.startsWith('+') ? 'text-success-green' : item.change.startsWith('-') ? 'text-alert-red' : 'text-gray-400'}`}>
                                            {item.change}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="w-full md:w-1/3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase text-gray-500">History</h3>
                        <button className="text-xs text-orange hover:underline">View All</button>
                    </div>
                    <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                        {transactions.map((tx, i) => (
                            <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-none uppercase text-gray-600">{tx.type}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">{tx.time}</span>
                                </div>
                                <p className="text-sm font-bold text-ink mb-1">{tx.desc}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-mono text-gray-500">{tx.amount}</p>
                                    <div className="flex items-center gap-1 text-[10px] text-success-green uppercase font-bold">
                                        <div className="w-1.5 h-1.5 bg-success-green rounded-full" />
                                        {tx.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="h-20 border-t border-gray-300 bg-white px-8 flex items-center justify-end gap-4">
            <Button variant="secondary">Deposit</Button>
            <Button variant="primary">Withdraw</Button>
        </div>
      </motion.div>
    </div>
  );
};
