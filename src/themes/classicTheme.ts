import type { ThemeConfig } from './themeConfig';

export const classicTheme: ThemeConfig = {
  name: 'classic',
  label: 'Classic',

  app: {
    backgroundClass: 'bg-gradient-to-br from-emerald-950 via-green-900 to-teal-900',
    bodyFont: 'font-sans',
  },
  decorations: {
    showClouds: false,
    showTeaFlask: false,
    ruledPaper: false,
    marginLine: false,
    muddyPatches: false,
  },
  header: {
    containerClass:
      'bg-white/[0.08] backdrop-blur-xl border-b border-emerald-400/20 shadow-[0_1px_12px_rgba(16,185,129,0.1)] text-white p-4 flex items-center justify-between relative z-10',
    titleClass: 'font-bold text-xl text-white tracking-tight',
    iconClass: 'text-white/90',
    statusOk: 'bg-emerald-500 text-white',
    statusErr: 'bg-red-500 text-white',
  },
  modal: {
    overlayClass: 'fixed inset-0 flex items-start justify-center overflow-y-auto py-8 bg-black/50 z-50',
    panelClass:
      'relative w-80 bg-emerald-950/95 backdrop-blur-2xl border border-emerald-400/20 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-5 text-white space-y-4',
    closeBtn: 'absolute top-3 right-3 text-white/50 hover:text-red-400 transition-colors',
    sectionTitle: 'font-bold text-white mb-1',
    label: 'block font-semibold mb-1 text-white/80',
    desc: 'text-xs mb-2 text-white/50',
    input:
      'w-full bg-white/[0.08] border border-white/15 rounded-lg p-2 mb-2 text-white placeholder-white/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 focus:outline-none transition-colors',
    primaryBtn:
      'bg-white text-green-900 w-full mb-2 transition-all rounded-full font-bold hover:bg-white/90 hover:shadow-[0_0_16px_rgba(255,255,255,0.15)]',
    secondaryBtn:
      'bg-white/[0.08] border border-white/20 text-white w-full hover:bg-white/[0.15] transition-all rounded-full font-bold',
    link: 'text-emerald-300 hover:text-emerald-200 underline text-sm transition-colors',
    checkboxLabel: 'font-bold flex items-center gap-2 text-white',
  },
  card: {
    base: 'bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset] p-4',
  },
  text: {
    heading: 'text-xl font-bold text-white tracking-tight',
    body: 'text-white/85 text-lg sm:text-xl',
    tip: 'text-emerald-300 font-semibold text-base sm:text-lg block mt-2',
    muted: 'text-sm text-white/60',
  },
  fonts: {
    heading: 'font-sans font-bold',
    body: 'font-sans',
    textarea: 'font-mono text-base',
  },
  buttons: {
    primary:
      'bg-white text-green-900 font-bold rounded-full py-3 px-8 shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition-all duration-150 flex-grow hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    secondary:
      'bg-white/[0.1] border border-white/20 text-white font-bold rounded-full py-3 px-8 shadow-md transition-all duration-150 flex-grow hover:bg-white/[0.18] hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    ghost:
      'text-white/60 font-bold bg-transparent py-2 px-4 transition-all duration-150 hover:text-white hover:underline active:scale-[0.98]',
    destructive:
      'bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30 transition-colors delete-button',
    clear:
      'text-xs px-2 py-1 bg-white/[0.08] border border-white/15 text-white/60 hover:bg-white/[0.15] transition-colors',
  },
  inputs: {
    textarea:
      'p-3 bg-white/[0.05] border border-white/15 rounded-lg w-full h-40 font-mono text-base text-white placeholder-white/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 focus:outline-none transition-colors',
  },
  pitch: {
    bg: '#166534',
    border: 'border border-emerald-400/20 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
    lineClass: 'bg-white/70',
    lineColour: 'rgba(255, 255, 255, 0.7)',
  },
  teamName: {
    bar: 'bg-emerald-800/60 backdrop-blur text-white px-4 py-2 rounded-lg font-bold border border-emerald-400/20',
    colourBorder: 'border-2 border-white/30',
  },
  playerList: {
    card: 'bg-white/[0.07] border border-white/[0.12] rounded-xl overflow-hidden shadow-lg',
    header: 'bg-emerald-800/50 text-white p-2 text-center border-b border-emerald-400/20',
    item: 'py-1 px-2 rounded-lg bg-white/[0.05] text-white border border-white/[0.08] cursor-pointer hover:bg-white/[0.1] transition-colors',
    gkBadge: 'bg-yellow-400 text-green-900 text-xs px-2 py-1 rounded ml-2 font-bold',
  },
  aiSummary: {
    button:
      'bg-white text-green-900 font-bold px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(255,255,255,0.1)] flex items-center gap-2 hover:bg-white/90 transition-all duration-200 generate-ai-summary',
    container:
      'bg-white/[0.07] border border-white/[0.12] rounded-xl p-4 mt-2 text-white/90 prose prose-sm prose-invert max-w-none',
  },
  notification:
    'bg-emerald-900/90 backdrop-blur-lg border border-emerald-400/20 rounded-xl shadow-lg text-white px-4 py-2',
  footer: {
    container: 'bg-white/[0.04] border-t border-white/[0.08] text-white/50 py-4 text-center',
    link: 'text-emerald-300 hover:text-emerald-200 underline transition-colors',
  },
  floatingFooter: {
    container:
      'fixed bottom-0 left-0 right-0 bg-emerald-950/95 backdrop-blur-xl border-t border-emerald-400/20 shadow-[0_-2px_16px_rgba(0,0,0,0.3)] text-white py-3 flex items-center justify-end pr-4 z-50',
    label: 'flex-grow pl-4 font-bold text-white/80',
    exportBtn:
      'bg-white text-green-900 font-bold py-2 px-6 rounded-full hover:bg-white/90 hover:shadow-[0_0_16px_rgba(255,255,255,0.15)] flex items-center gap-2 mr-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98]',
    shareBtn:
      'text-white/60 font-bold py-2 px-6 bg-transparent hover:text-white hover:underline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]',
  },
  playerIcon: {
    stroke: '#052e16',
    nameBg: 'bg-emerald-950/80',
  },
  welcomeModal: {
    overlayBg: 'rgba(0, 0, 0, 0.65)',
    showCork: false,
    showPin: false,
    showCorner: false,
    card: 'relative bg-emerald-950/95 backdrop-blur-2xl border border-emerald-400/20 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-8 max-w-sm overflow-hidden',
    title: 'font-bold text-3xl text-white text-center mb-3 tracking-tight',
    stepNum: 'font-bold text-lg text-emerald-300',
    stepIcon: '#6ee7b7',
    stepText: 'text-white/80 font-semibold',
    divider: '#6ee7b7',
    cta: 'bg-white text-green-900 font-bold py-3 px-8 rounded-full shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition-all hover:bg-white/90 hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)]',
  },
  banners: {
    error: 'mt-3 bg-red-500/15 border border-red-400/40 text-red-300 px-4 py-2 rounded-lg',
    warning: 'bg-amber-500/15 border border-amber-400/40 text-amber-200 p-4 rounded-lg mb-4 mt-4',
    validation: 'text-sm text-orange-300',
  },
  counters: {
    valid: 'text-emerald-300',
    invalid: 'text-red-400',
    gkWarn: 'text-orange-300',
  },
  export: {
    cardBg: '#064e3b',
    watermarkBg: '#065f46',
    watermarkText: 'white',
    watermarkFont: 'bold 20px Arial, sans-serif',
  },
};
