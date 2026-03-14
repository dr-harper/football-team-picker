import React from 'react';
import { Check } from 'lucide-react';

interface WizardStep {
    num: 1 | 2 | 3 | 4;
    label: string;
}

interface WizardProgressBarProps {
    steps: WizardStep[];
    currentStep: 1 | 2 | 3 | 4;
    onStepClick: (step: 1 | 2 | 3 | 4) => void;
}

const WizardProgressBar: React.FC<WizardProgressBarProps> = ({ steps, currentStep, onStepClick }) => (
    <div className="max-w-2xl mx-auto">
        <div className="flex items-center w-full">
            {steps.map((step, idx) => (
                <React.Fragment key={step.num}>
                    <button
                        onClick={() => { if (currentStep > step.num) onStepClick(step.num); }}
                        className={`flex flex-col items-center gap-1 shrink-0 ${currentStep > step.num ? 'cursor-pointer' : 'cursor-default'}`}
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
);

export default WizardProgressBar;
