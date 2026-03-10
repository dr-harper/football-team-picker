import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface TourStep {
    title: string;
    description: string;
    tab?: string;
}

interface DemoTourProps {
    steps: TourStep[];
    currentStep: number;
    onStepChange: (step: number) => void;
    onDismiss: () => void;
}

const DemoTour: React.FC<DemoTourProps> = ({ steps, currentStep, onStepChange, onDismiss }) => {
    const navigate = useNavigate();
    const step = steps[currentStep];
    const isLast = currentStep === steps.length - 1;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto">
                <div className="bg-green-950/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl p-4 sm:p-5">
                    {/* Progress dots */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => onStepChange(i)}
                                    className={`h-1.5 rounded-full transition-all ${
                                        i === currentStep
                                            ? 'w-6 bg-green-400'
                                            : i < currentStep
                                                ? 'w-1.5 bg-green-400/40'
                                                : 'w-1.5 bg-white/20'
                                    }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={onDismiss}
                            className="text-white/40 hover:text-white/70 transition-colors p-1"
                            title="Close tour"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                        <h3 className="text-white font-bold text-base sm:text-lg mb-1">{step.title}</h3>
                        <p className="text-white/60 text-sm leading-relaxed">{step.description}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => onStepChange(currentStep - 1)}
                            disabled={currentStep === 0}
                            className="flex items-center gap-1 text-sm text-white/50 hover:text-white disabled:opacity-0 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>

                        <span className="text-white/30 text-xs">
                            {currentStep + 1} / {steps.length}
                        </span>

                        {isLast ? (
                            <button
                                onClick={() => navigate('/auth?mode=signup')}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                            >
                                Create your own
                            </button>
                        ) : (
                            <button
                                onClick={() => onStepChange(currentStep + 1)}
                                className="flex items-center gap-1 text-sm font-medium text-green-300 hover:text-green-200 transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoTour;
