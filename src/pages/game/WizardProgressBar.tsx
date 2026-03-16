import React from 'react';
import { Check, ClipboardList, Users, Radio, Trophy, ChevronRight } from 'lucide-react';

interface WizardStep {
    num: 1 | 2 | 3 | 4;
    label: string;
}

interface WizardProgressBarProps {
    steps: WizardStep[];
    currentStep: 1 | 2 | 3 | 4;
    onStepClick: (step: 1 | 2 | 3 | 4) => void;
}

const STEP_ICONS = [ClipboardList, Users, Radio, Trophy];

const WizardProgressBar: React.FC<WizardProgressBarProps> = ({ steps, currentStep, onStepClick }) => (
    <>
        {/* Desktop: inline progress bar */}
        <div className="hidden sm:block max-w-2xl mx-auto">
            <div className="flex items-center w-full">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.num}>
                        <button
                            onClick={() => onStepClick(step.num)}
                            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                currentStep > step.num ? 'bg-green-500 text-white' :
                                currentStep === step.num ? 'bg-white text-green-900' :
                                'bg-white/20 text-white/40'
                            }`}>
                                {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
                            </div>
                            <span className={`text-xs whitespace-nowrap ${
                                currentStep === step.num ? 'text-white font-semibold' :
                                currentStep > step.num ? 'text-green-400' :
                                'text-white/40'
                            }`}>{step.label}</span>
                        </button>
                        {idx < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-3 mb-4 transition-colors ${currentStep > step.num ? 'bg-green-500' : 'bg-white/20'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>

        {/* Mobile: fixed bottom nav */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40">
            <div className="bg-green-950/95 backdrop-blur-lg border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] flex items-stretch">
                {steps.map((step, idx) => {
                    const Icon = STEP_ICONS[step.num - 1];
                    const active = currentStep === step.num;
                    const completed = currentStep > step.num;
                    return (
                        <React.Fragment key={step.num}>
                            <button
                                onClick={() => onStepClick(step.num)}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                                    active ? 'text-green-400' :
                                    completed ? 'text-green-500/60' :
                                    'text-white/30'
                                }`}
                            >
                                {completed ? (
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                    </div>
                                ) : (
                                    <Icon className="w-5 h-5" />
                                )}
                                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{step.label}</span>
                            </button>
                            {idx < steps.length - 1 && (
                                <div className="flex items-center justify-center shrink-0 mb-3">
                                    <ChevronRight className={`w-3.5 h-3.5 ${completed ? 'text-green-500/50' : 'text-white/15'}`} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    </>
);

export default WizardProgressBar;
