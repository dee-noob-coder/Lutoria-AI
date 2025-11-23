import React from 'react';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { ProcessingState } from '../types';

interface Props {
  state: ProcessingState;
}

export const ProcessingLog: React.FC<Props> = ({ state }) => {
  if (!state.isProcessing && state.stage === '') return null;

  return (
    <div className="fixed bottom-6 right-80 z-50 w-80">
        <div className="bg-zinc-900/90 backdrop-blur border border-indigo-500/30 rounded-lg p-4 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Gemini 2.5 Engine
                </span>
                <span className="text-xs font-mono text-zinc-500">{state.progress}%</span>
            </div>
            
            <div className="space-y-2">
                <Step label="Technical Analysis" active={state.progress > 0 && state.progress < 30} completed={state.progress >= 30} />
                <Step label="Color Space Transform" active={state.progress >= 30 && state.progress < 60} completed={state.progress >= 60} />
                <Step label="Generating LUT" active={state.progress >= 60 && state.progress < 80} completed={state.progress >= 80} />
                <Step label="Final Render" active={state.progress >= 80 && state.progress < 100} completed={state.progress === 100} />
            </div>

            <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" 
                    style={{ width: `${state.progress}%` }}
                />
            </div>
        </div>
    </div>
  );
};

const Step = ({ label, active, completed }: { label: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${active ? 'text-white' : completed ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {completed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : active ? <Circle className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20 animate-pulse" /> : <Circle className="w-3.5 h-3.5" />}
        <span>{label}</span>
    </div>
);
