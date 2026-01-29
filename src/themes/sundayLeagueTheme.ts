import type { ThemeConfig } from './themeConfig';

export const sundayLeagueTheme: ThemeConfig = {
  name: 'sundayLeague',
  label: 'Sunday League',

  app: {
    backgroundClass: 'bg-gradient-to-b from-[#87CEEB] via-[#B8D4A8] to-[#7CB342]',
    bodyFont: 'font-nunito',
  },
  decorations: {
    showClouds: true,
    showTeaFlask: true,
    ruledPaper: true,
    marginLine: true,
    muddyPatches: true,
  },
  header: {
    containerClass:
      'bg-[#FEFCE8]/90 border-b-2 border-amber-800 shadow-md text-[#1E3A1E] p-4 flex items-center justify-between relative z-10 font-nunito',
    titleClass: 'font-marker text-xl text-[#1E3A1E]',
    iconClass: 'text-[#1E3A1E]',
    statusOk: 'bg-green-600 text-white',
    statusErr: 'bg-red-500 text-white',
  },
  modal: {
    overlayClass: 'fixed inset-0 flex items-start justify-center overflow-y-auto py-8 bg-amber-900/50 z-50',
    panelClass:
      'relative w-80 bg-[#FEFCE8] border-2 border-amber-800 rounded-lg shadow-lg p-4 text-gray-800 space-y-4 font-nunito',
    closeBtn: 'absolute top-2 right-2 text-amber-800 hover:text-red-600',
    sectionTitle: 'font-marker text-[#1E3A1E] mb-1',
    label: 'block font-semibold mb-1 text-gray-800',
    desc: 'text-xs mb-2 text-gray-600',
    input:
      'w-full bg-white border-2 border-amber-300 rounded-lg p-2 mb-2 text-gray-800 placeholder-gray-400 focus:border-green-600 focus:ring-1 focus:ring-green-500 focus:outline-none',
    primaryBtn:
      'bg-green-700 hover:bg-green-600 text-white w-full mb-2 transition-colors rounded-full font-nunito font-bold border-2 border-green-800',
    secondaryBtn:
      'bg-[#FEFCE8] border-2 border-green-700 text-green-800 w-full hover:bg-green-50 transition-colors rounded-full font-nunito font-bold',
    link: 'text-green-700 hover:text-green-900 underline text-sm transition-colors',
    checkboxLabel: 'font-bold flex items-center gap-2 text-gray-800 font-nunito',
  },
  card: {
    base: 'bg-[#FEFCE8] border-2 border-amber-800 rounded-lg shadow-[2px_4px_8px_rgba(0,0,0,0.1)] p-4',
    rotate: 'lg:rotate-[-0.5deg]',
  },
  text: {
    heading: 'text-xl font-marker text-[#1E3A1E]',
    body: 'text-gray-700 font-nunito text-lg sm:text-xl',
    tip: 'text-green-800 font-nunito font-semibold text-base sm:text-lg block mt-2',
    muted: 'text-sm text-gray-600 font-nunito',
  },
  fonts: {
    heading: 'font-marker',
    body: 'font-nunito',
    textarea: 'font-caveat text-lg',
  },
  buttons: {
    primary:
      'bg-green-700 hover:bg-green-600 text-white font-nunito font-bold rounded-full border-2 border-green-800 py-3 px-8 shadow-md transition-all duration-150 flex-grow hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    secondary:
      'bg-[#FEFCE8] border-2 border-green-700 text-green-800 font-nunito font-bold rounded-full py-3 px-8 shadow-md transition-all duration-150 flex-grow hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    ghost:
      'text-amber-800 font-nunito font-bold bg-transparent py-2 px-4 transition-all duration-150 hover:underline decoration-dashed active:scale-[0.98]',
    destructive:
      'bg-red-100 border-2 border-red-400 text-red-700 hover:bg-red-200 transition-colors delete-button',
    clear:
      'text-xs px-2 py-1 bg-amber-100 border border-amber-400 text-amber-800 hover:bg-amber-200',
  },
  inputs: {
    textarea:
      'p-3 bg-transparent border-2 border-amber-300 rounded-lg w-full h-40 font-caveat text-lg text-gray-800 placeholder-gray-400 focus:border-green-600 focus:ring-1 focus:ring-green-500 focus:outline-none',
  },
  pitch: {
    bg: '#4A7C2E',
    border: 'border-2 border-amber-800 rounded-lg shadow-lg',
    lineClass: 'bg-[#FFFDF5]/70',
    lineColour: 'rgba(255, 253, 245, 0.7)',
  },
  teamName: {
    bar: 'bg-green-800 text-white px-4 py-2 rounded-lg font-marker border-2 border-green-900',
    colourBorder: 'border-2 border-amber-800',
  },
  playerList: {
    card: 'bg-[#FEFCE8] border-2 border-amber-800 rounded-lg overflow-hidden shadow-md',
    header: 'bg-green-800 text-white p-2 text-center border-b-2 border-green-900',
    item: 'py-1 px-2 rounded-lg bg-amber-50 text-gray-800 border border-amber-300 cursor-pointer font-nunito',
    gkBadge: 'bg-yellow-400 text-green-900 text-xs px-2 py-1 rounded ml-2 font-bold',
  },
  aiSummary: {
    button:
      'bg-yellow-400 text-green-900 font-nunito font-bold px-3 py-1 rounded-full shadow flex items-center gap-2 hover:bg-yellow-300 transition-all duration-200 generate-ai-summary',
    container:
      'bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mt-2 text-gray-800 prose prose-sm max-w-none font-nunito',
  },
  notification:
    'bg-[#FEFCE8] border-2 border-amber-800 rounded-lg shadow-lg text-gray-800 px-4 py-2 font-nunito',
  footer: {
    container:
      'bg-[#FEFCE8]/80 border-t-2 border-amber-800 text-gray-600 py-4 text-center font-nunito',
    link: 'text-green-700 hover:text-green-900 underline transition-colors',
  },
  floatingFooter: {
    container:
      'fixed bottom-0 left-0 right-0 bg-[#FEFCE8]/95 border-t-2 border-amber-800 shadow-lg text-[#1E3A1E] py-3 flex items-center justify-end pr-4 z-50 font-nunito',
    label: 'flex-grow pl-4 font-bold text-gray-800',
    exportBtn:
      'bg-[#FEFCE8] border-2 border-green-700 text-green-800 font-nunito font-bold py-2 px-6 rounded-full hover:bg-green-50 flex items-center gap-2 mr-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]',
    shareBtn:
      'text-amber-800 font-nunito font-bold py-2 px-6 bg-transparent hover:underline decoration-dashed flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]',
  },
  playerIcon: {
    stroke: '#000000',
    nameBg: 'bg-[#1E3A1E]/80',
  },
  welcomeModal: {
    overlayBg: 'rgba(92, 64, 31, 0.5)',
    corkBg: '#C9956B',
    showCork: true,
    showPin: true,
    showCorner: true,
    card: 'relative bg-[#FEFCE8] border-2 border-amber-800 rounded-lg shadow-lg p-8 max-w-sm overflow-hidden',
    title: 'font-marker text-3xl text-[#1E3A1E] text-center mb-3',
    stepNum: 'font-marker text-lg text-[#92400E]',
    stepIcon: '#92400E',
    stepText: 'font-nunito text-gray-700 font-semibold',
    divider: '#92400E',
    cta: 'bg-green-700 hover:bg-green-600 text-white font-nunito font-bold py-3 px-8 rounded-full border-2 border-green-800 shadow-md rotate-1 transition-colors',
  },
  banners: {
    error: 'mt-3 bg-red-50 border-2 border-red-400 text-red-800 px-4 py-2 rounded-lg font-nunito',
    warning:
      'bg-amber-50 border-2 border-amber-500 text-amber-900 p-4 rounded-lg mb-4 mt-4 font-nunito',
    validation: 'text-sm text-orange-600 font-nunito',
  },
  counters: {
    valid: 'text-green-700',
    invalid: 'text-red-600',
    gkWarn: 'text-orange-600',
  },
  export: {
    cardBg: '#FEFCE8',
    watermarkBg: '#92400E',
    watermarkText: 'white',
    watermarkFont: 'bold 20px Nunito, Arial',
  },
};
