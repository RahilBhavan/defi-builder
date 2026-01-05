import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Command, Lightbulb, Play, Sparkles, TrendingUp, Zap } from 'lucide-react';
import React, { useState } from 'react';
import type { LegoBlock } from '../types';

interface EmptyWorkspaceStateProps {
  onOpenSuggester: () => void;
  onAddBlock?: (block: LegoBlock, targetIndex?: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

// Suppress unused parameter warning - will be used when template loading is implemented
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// Example strategy templates
const exampleStrategies = [
  {
    name: 'Simple DCA',
    description: 'Dollar-cost average into ETH',
    blocks: [
      { type: 'price_trigger', label: 'Price Trigger', category: 'ENTRY' },
      { type: 'uniswap_v3_swap', label: 'Uniswap Swap', category: 'PROTOCOL' },
    ],
    color: 'from-blue-500/10 to-blue-600/5',
    borderColor: 'border-blue-300',
  },
  {
    name: 'Yield Farming',
    description: 'Supply assets to earn yield',
    blocks: [
      { type: 'time_trigger', label: 'Time Trigger', category: 'ENTRY' },
      { type: 'aave_v3_supply', label: 'Aave Supply', category: 'PROTOCOL' },
      { type: 'stop_loss', label: 'Stop Loss', category: 'EXIT' },
    ],
    color: 'from-green-500/10 to-green-600/5',
    borderColor: 'border-green-300',
  },
  {
    name: 'Arbitrage Bot',
    description: 'Capture price differences',
    blocks: [
      { type: 'price_trigger', label: 'Price Trigger', category: 'ENTRY' },
      { type: 'flash_loan', label: 'Flash Loan', category: 'PROTOCOL' },
      { type: 'uniswap_v3_swap', label: 'Swap', category: 'PROTOCOL' },
      { type: 'take_profit', label: 'Take Profit', category: 'EXIT' },
    ],
    color: 'from-purple-500/10 to-purple-600/5',
    borderColor: 'border-purple-300',
  },
];

const quickTips = [
  {
    icon: Lightbulb,
    title: 'Start with a Trigger',
    description: 'Every strategy begins with an entry condition like price, time, or volume.',
  },
  {
    icon: TrendingUp,
    title: 'Add Protocol Actions',
    description: 'Connect to DeFi protocols like Uniswap, Aave, or Compound to execute trades.',
  },
  {
    icon: Zap,
    title: 'Manage Risk',
    description: 'Include stop-loss and take-profit blocks to protect your capital.',
  },
  {
    icon: Sparkles,
    title: 'Use AI Suggestions',
    description: 'Let AI help you discover the next best block for your strategy.',
  },
];

export const EmptyWorkspaceState: React.FC<EmptyWorkspaceStateProps> = ({
  onOpenSuggester,
  onAddBlock: _onAddBlock,
  onDragOver,
  onDrop,
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<number | null>(null);
  const [showTips, setShowTips] = useState(true);

  const handleTemplateClick = (_template: typeof exampleStrategies[0]) => {
    // This would load the template - for now just open suggester
    onOpenSuggester();
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange/20 to-orange/5 border-2 border-orange/30 mb-4"
          >
            <Sparkles className="w-10 h-10 text-orange" strokeWidth={1.5} />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink font-mono tracking-tight">
            Build Your DeFi Strategy
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-sans">
            Create automated trading strategies with visual blocks. No coding required.
          </p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSuggester();
              }}
              className="group relative px-8 py-4 bg-orange text-white font-bold uppercase tracking-wider rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Start Building</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              className="px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-orange hover:text-orange transition-all duration-300 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>View Tutorial</span>
            </button>
          </motion.div>

          {/* Keyboard Shortcut Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-2"
          >
            <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">
              ⌘K
            </kbd>
            <span className="text-gray-400">or</span>
            <span className="text-gray-600">Click the</span>
            <span className="px-2 py-1 bg-orange/10 text-orange rounded font-mono text-xs font-bold">
              + Blocks
            </span>
            <span className="text-gray-600">button on the left</span>
          </motion.div>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            onDragOver?.(e);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDrop?.(e);
          }}
          className="relative group"
        >
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 bg-gradient-to-br from-white to-gray-50/50 hover:border-orange hover:bg-gradient-to-br hover:from-orange/5 hover:to-orange/0 transition-all duration-300 cursor-pointer">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenSuggester();
              }}
              className="flex flex-col items-center justify-center space-y-4"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-orange/20 to-orange/5 border-2 border-orange/30 flex items-center justify-center group-hover:border-orange group-hover:from-orange/30 group-hover:to-orange/10 transition-all"
              >
                <span className="text-3xl text-orange font-thin">+</span>
              </motion.div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-gray-700 group-hover:text-ink transition-colors">
                  Drag & Drop Blocks Here
                </p>
                <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                  Or click to browse the AI-powered block library
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Example Strategies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-ink font-mono">Quick Start Templates</h2>
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="text-sm text-gray-500 hover:text-ink transition-colors"
            >
              {showTips ? 'Hide Tips' : 'Show Tips'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exampleStrategies.map((template, index) => (
              <motion.button
                key={template.name}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                onMouseEnter={() => setHoveredTemplate(index)}
                onMouseLeave={() => setHoveredTemplate(null)}
                onClick={() => handleTemplateClick(template)}
                className={`relative p-6 rounded-xl border-2 ${template.borderColor} bg-gradient-to-br ${template.color} hover:shadow-lg transition-all duration-300 text-left group overflow-hidden`}
              >
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-ink font-mono">{template.name}</h3>
                    <ArrowRight
                      className={`w-5 h-5 text-gray-400 group-hover:text-orange transition-all ${
                        hoveredTemplate === index ? 'translate-x-1' : ''
                      }`}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{template.description}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {template.blocks.map((block, blockIndex) => (
                      <span
                        key={blockIndex}
                        className="px-2 py-1 text-xs font-mono bg-white/60 border border-gray-200 rounded text-gray-700"
                      >
                        {block.label}
                      </span>
                    ))}
                  </div>
                </div>
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                  initial={false}
                />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Quick Tips */}
        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-ink font-mono">Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickTips.map((tip, index) => {
                  const Icon = tip.icon;
                  return (
                    <motion.div
                      key={tip.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                      className="p-5 bg-white border border-gray-200 rounded-xl hover:border-orange hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange/20 to-orange/5 border border-orange/30 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-orange" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold text-sm text-ink">{tip.title}</h3>
                          <p className="text-xs text-gray-600 leading-relaxed">{tip.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="pt-8 border-t border-gray-200"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-orange transition-colors flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Documentation</span>
              </a>
              <a href="#" className="hover:text-orange transition-colors flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>Video Tutorial</span>
              </a>
              <a href="#" className="hover:text-orange transition-colors flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                <span>Examples</span>
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Command className="w-3 h-3" />
              <span>Press</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono">
                ⌘K
              </kbd>
              <span>for quick actions</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

