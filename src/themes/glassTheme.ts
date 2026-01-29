import type { ThemeConfig } from './themeConfig';

export const glassTheme: ThemeConfig = {
  name: 'glass',
  label: 'Glass',

  app: {
    backgroundClass: 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950',
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
      'bg-white/[0.05] backdrop-blur-2xl border-b border-white/10 text-white p-4 flex items-center justify-between relative z-10',
    titleClass: 'font-bold text-xl text-white',
    iconClass: 'text-white',
    statusOk: 'bg-indigo-500 text-white',
    statusErr: 'bg-red-500 text-white',
  },
  modal: {
    overlayClass: 'fixed inset-0 flex items-start justify-center overflow-y-auto py-8 bg-black/60 z-50',
    panelClass:
      'relative w-80 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-4 text-white space-y-4',
    closeBtn: 'absolute top-2 right-2 text-white/50 hover:text-red-400',
    sectionTitle: 'font-bold text-white mb-1',
    label: 'block font-semibold mb-1 text-white/90',
    desc: 'text-xs mb-2 text-slate-400',
    input:
      'w-full bg-white/[0.07] border border-white/10 rounded-lg p-2 mb-2 text-white placeholder-white/25 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none',
    primaryBtn:
      'bg-indigo-600 hover:bg-indigo-500 text-white w-full mb-2 transition-colors rounded-full font-bold',
    secondaryBtn:
      'bg-white/[0.07] border border-indigo-500/50 text-indigo-300 w-full hover:bg-white/[0.12] transition-colors rounded-full font-bold',
    link: 'text-indigo-300 hover:text-indigo-200 underline text-sm transition-colors',
    checkboxLabel: 'font-bold flex items-center gap-2 text-white',
  },
  card: {
    base: 'bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-4',
  },
  text: {
    heading: 'text-xl font-bold text-white',
    body: 'text-slate-300 text-lg sm:text-xl',
    tip: 'text-indigo-300 font-semibold text-base sm:text-lg block mt-2',
    muted: 'text-sm text-slate-400',
  },
  fonts: {
    heading: 'font-sans font-bold',
    body: 'font-sans',
    textarea: 'font-mono text-base',
  },
  buttons: {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full py-3 px-8 shadow-md transition-all duration-150 flex-grow hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    secondary:
      'bg-white/[0.07] border border-indigo-500/50 text-indigo-300 font-bold rounded-full py-3 px-8 shadow-md transition-all duration-150 flex-grow hover:bg-white/[0.12] hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    ghost:
      'text-slate-400 font-bold bg-transparent py-2 px-4 transition-all duration-150 hover:text-white hover:underline active:scale-[0.98]',
    destructive:
      'bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition-colors delete-button',
    clear:
      'text-xs px-2 py-1 bg-white/[0.07] border border-white/10 text-slate-400 hover:bg-white/[0.12]',
  },
  inputs: {
    textarea:
      'p-3 bg-white/[0.04] border border-white/10 rounded-lg w-full h-40 font-mono text-base text-white placeholder-white/25 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none',
  },
  pitch: {
    bg: '#0f2a4a',
    border: 'border border-white/10 rounded-xl shadow-lg',
    lineClass: 'bg-white/50',
    lineColour: 'rgba(255, 255, 255, 0.5)',
  },
  teamName: {
    bar: 'bg-indigo-600/80 text-white px-4 py-2 rounded-lg font-bold border border-indigo-500/50',
    colourBorder: 'border-2 border-white/20',
  },
  playerList: {
    card: 'bg-white/[0.07] border border-white/10 rounded-xl overflow-hidden shadow-md',
    header: 'bg-indigo-600/50 text-white p-2 text-center border-b border-indigo-500/30',
    item: 'py-1 px-2 rounded-lg bg-white/[0.04] text-white border border-white/[0.07] cursor-pointer',
    gkBadge: 'bg-indigo-500 text-white text-xs px-2 py-1 rounded ml-2 font-bold',
  },
  aiSummary: {
    button:
      'bg-indigo-600 text-white font-bold px-3 py-1 rounded-full shadow flex items-center gap-2 hover:bg-indigo-500 transition-all duration-200 generate-ai-summary',
    container:
      'bg-white/[0.07] border border-indigo-500/30 rounded-xl p-4 mt-2 text-slate-200 prose prose-sm prose-invert max-w-none',
  },
  notification:
    'bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg text-white px-4 py-2',
  footer: {
    container: 'bg-white/[0.03] border-t border-white/[0.07] text-slate-400 py-4 text-center',
    link: 'text-indigo-300 hover:text-indigo-200 underline transition-colors',
  },
  floatingFooter: {
    container:
      'fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 shadow-lg text-white py-3 flex items-center justify-end pr-4 z-50',
    label: 'flex-grow pl-4 font-bold text-slate-300',
    exportBtn:
      'bg-indigo-600 text-white font-bold py-2 px-6 rounded-full hover:bg-indigo-500 flex items-center gap-2 mr-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]',
    shareBtn:
      'text-slate-400 font-bold py-2 px-6 bg-transparent hover:text-white hover:underline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]',
  },
  playerIcon: {
    stroke: '#1e1b4b',
    nameBg: 'bg-indigo-950/80',
  },
  welcomeModal: {
    overlayBg: 'rgba(0, 0, 0, 0.7)',
    showCork: false,
    showPin: false,
    showCorner: false,
    card: 'relative bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-8 max-w-sm overflow-hidden',
    title: 'font-bold text-3xl text-white text-center mb-3',
    stepNum: 'font-bold text-lg text-indigo-300',
    stepIcon: '#818cf8',
    stepText: 'text-slate-300 font-semibold',
    divider: '#818cf8',
    cta: 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full shadow-md transition-colors',
  },
  banners: {
    error: 'mt-3 bg-red-500/20 border border-red-400/30 text-red-300 px-4 py-2 rounded-lg',
    warning: 'bg-amber-500/20 border border-amber-400/30 text-amber-200 p-4 rounded-lg mb-4 mt-4',
    validation: 'text-sm text-orange-300',
  },
  counters: {
    valid: 'text-indigo-300',
    invalid: 'text-red-400',
    gkWarn: 'text-orange-300',
  },
  export: {
    cardBg: '#0f172a',
    watermarkBg: '#312e81',
    watermarkText: 'white',
    watermarkFont: 'bold 20px Arial, sans-serif',
  },
};
