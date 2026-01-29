export type ThemeName = 'classic' | 'glass' | 'sundayLeague';

export interface ThemeConfig {
  name: ThemeName;
  label: string;

  app: { backgroundClass: string; bodyFont: string };
  decorations: {
    showClouds: boolean;
    showTeaFlask: boolean;
    ruledPaper: boolean;
    marginLine: boolean;
    muddyPatches: boolean;
  };
  header: {
    containerClass: string;
    titleClass: string;
    iconClass: string;
    statusOk: string;
    statusErr: string;
  };
  modal: {
    overlayClass: string;
    panelClass: string;
    closeBtn: string;
    sectionTitle: string;
    label: string;
    desc: string;
    input: string;
    primaryBtn: string;
    secondaryBtn: string;
    link: string;
    checkboxLabel: string;
  };
  card: { base: string; rotate?: string };
  text: { heading: string; body: string; tip: string; muted: string };
  fonts: { heading: string; body: string; textarea: string };
  buttons: {
    primary: string;
    secondary: string;
    ghost: string;
    destructive: string;
    clear: string;
  };
  inputs: { textarea: string };
  pitch: { bg: string; border: string; lineClass: string; lineColour: string };
  teamName: { bar: string; colourBorder: string };
  playerList: { card: string; header: string; item: string; gkBadge: string };
  aiSummary: { button: string; container: string };
  notification: string;
  footer: { container: string; link: string };
  floatingFooter: {
    container: string;
    label: string;
    exportBtn: string;
    shareBtn: string;
  };
  playerIcon: { stroke: string; nameBg: string };
  welcomeModal: {
    overlayBg: string;
    corkBg?: string;
    showCork: boolean;
    showPin: boolean;
    showCorner: boolean;
    card: string;
    title: string;
    stepNum: string;
    stepIcon: string;
    stepText: string;
    divider: string;
    cta: string;
  };
  banners: { error: string; warning: string; validation: string };
  counters: { valid: string; invalid: string; gkWarn: string };
  export: {
    cardBg: string;
    watermarkBg: string;
    watermarkText: string;
    watermarkFont: string;
  };
}
