import { ThemeMode } from '../types/settings';

/**
 * Returns a 5-color interpolated gradient color for the urgency score (0.0 to 1.0)
 * 0.0 - 0.2: Calm Blue (#2E7CF6)
 * 0.2 - 0.4: Cyan / Teal (#00B4D8)
 * 0.4 - 0.6: Vibrant Amber (#E5A500)
 * 0.6 - 0.8: Energetic Orange (#F26419)
 * 0.8 - 1.0: Urgent Crimson (#E63946)
 */
export function getUrgencyColor(urgency: number): { primary: string; glow: string; text: string } {
  const clamped = Math.max(0, Math.min(1, urgency));

  if (clamped < 0.25) {
    return {
      primary: '#2E7CF6',
      glow: 'rgba(46, 124, 246, 0.65)',
      text: '#EBF4FF'
    };
  } else if (clamped < 0.5) {
    return {
      primary: '#00B4D8',
      glow: 'rgba(0, 180, 216, 0.65)',
      text: '#E0FAFF'
    };
  } else if (clamped < 0.7) {
    return {
      primary: '#E5A500',
      glow: 'rgba(229, 165, 0, 0.65)',
      text: '#FFFBE6'
    };
  } else if (clamped < 0.85) {
    return {
      primary: '#F26419',
      glow: 'rgba(242, 100, 25, 0.70)',
      text: '#FFF0EA'
    };
  } else {
    return {
      primary: '#E63946',
      glow: 'rgba(230, 57, 70, 0.80)',
      text: '#FFEAEB'
    };
  }
}

/**
 * Generates Shadow DOM styles for Apple Liquid Glass UI
 * - Low operational cost: GPU composited, no continuous whole-page repaints
 * - True liquid glass depth with ambient light pools, double-line beveled borders, and specular highlights
 * - Zero emoji usage (clean vector SVG icons)
 * - Modern typography with tabular numerals and refined letter spacing
 */
export function getLiquidGlassStyles(theme: ThemeMode): string {
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const colors = isDark ? {
    // 50% opacity ambient liquid glass panel background
    bgPanel: `
      radial-gradient(ellipse 380px 220px at 50% 0%, rgba(46, 124, 246, 0.16) 0%, transparent 70%),
      radial-gradient(circle 280px at 100% 40%, rgba(207, 184, 124, 0.10) 0%, transparent 60%),
      linear-gradient(175deg, rgba(14, 20, 32, 0.50) 0%, rgba(8, 12, 20, 0.52) 100%)
    `,
    panelBorder: 'rgba(255, 255, 255, 0.22)',
    panelSpecular: 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.40), inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.30)',
    panelShadow: '0 28px 72px -12px rgba(0, 0, 0, 0.45), 0 10px 30px -6px rgba(0, 0, 0, 0.30)',

    // Translucent glass cards
    bgCard: 'linear-gradient(145deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
    bgCardHover: 'linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
    cardBorderHover: 'rgba(255, 255, 255, 0.35)',
    cardSpecular: 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.30), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.20)',
    cardShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.25)',

    // Header & controls
    headerBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%)',
    navTrackBg: 'rgba(0, 0, 0, 0.25)',
    navActivePill: 'linear-gradient(145deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 100%)',
    inputBg: 'rgba(255, 255, 255, 0.08)',
    inputBorder: 'rgba(255, 255, 255, 0.24)',
    placeholderColor: 'rgba(248, 250, 252, 0.65)',

    // Text & accents with WCAG AAA / AA contrast
    textPrimary: '#FFFFFF',
    textSecondary: '#E2E8F0', // High-contrast subtitle (>10:1 contrast)
    textMuted: '#94A3B8',     // Readable slate 400 (5.8:1 contrast, never washed out)
    accentGold: '#F3E5AB',    // Ultra-crisp CU Gold (13:1 contrast against dark glass)
    iconDefault: '#E2E8F0',
    coursePillBg: 'rgba(255, 255, 255, 0.10)',
    coursePillBorder: 'rgba(255, 255, 255, 0.20)',
  } : {
    // Light mode 50% opacity liquid glass
    bgPanel: `
      radial-gradient(ellipse 380px 220px at 50% 0%, rgba(46, 124, 246, 0.12) 0%, transparent 70%),
      radial-gradient(circle 280px at 100% 40%, rgba(207, 184, 124, 0.08) 0%, transparent 60%),
      linear-gradient(175deg, rgba(255, 255, 255, 0.52) 0%, rgba(240, 245, 255, 0.48) 100%)
    `,
    panelBorder: 'rgba(255, 255, 255, 0.70)',
    panelSpecular: 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.05)',
    panelShadow: '0 28px 72px -12px rgba(0, 0, 0, 0.12), 0 10px 30px -6px rgba(0, 0, 0, 0.06)',

    bgCard: 'linear-gradient(145deg, rgba(255, 255, 255, 0.75) 0%, rgba(245, 248, 254, 0.60) 100%)',
    bgCardHover: 'linear-gradient(145deg, rgba(255, 255, 255, 0.90) 0%, rgba(240, 245, 255, 0.75) 100%)',
    cardBorder: 'rgba(0, 0, 0, 0.10)',
    cardBorderHover: 'rgba(0, 0, 0, 0.22)',
    cardSpecular: 'inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.90), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.03)',
    cardShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06)',

    headerBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.40) 100%)',
    navTrackBg: 'rgba(0, 0, 0, 0.06)',
    navActivePill: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 248, 254, 0.85) 100%)',
    inputBg: 'rgba(255, 255, 255, 0.92)',
    inputBorder: 'rgba(0, 0, 0, 0.18)',
    placeholderColor: 'rgba(15, 23, 42, 0.55)',

    // High contrast light mode text (WCAG AAA compliant)
    textPrimary: '#0F172A',   // Deep slate 900 (16.5:1 contrast against light glass)
    textSecondary: '#1E293B', // Deep slate 800 (13:1 contrast)
    textMuted: '#475569',     // Slate 600 (7:1 contrast, never washed-out grey)
    accentGold: '#8D6F25',    // Deep CU bronze gold (5.2:1 contrast)
    iconDefault: '#1E293B',
    coursePillBg: 'rgba(0, 0, 0, 0.06)',
    coursePillBorder: 'rgba(0, 0, 0, 0.14)',
  };

  return `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: ${colors.textPrimary};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      box-sizing: border-box;
      z-index: 2147483640;

      /* High-contrast design tokens */
      --text-primary: ${colors.textPrimary};
      --text-secondary: ${colors.textSecondary};
      --text-muted: ${colors.textMuted};
      --accent-gold: ${colors.accentGold};
      --icon-default: ${colors.iconDefault};
      --bg-card: ${colors.bgCard};
      --card-border: ${colors.cardBorder};
      --bg-subtle: ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'};
      --border-subtle: ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)'};
    }

    .text-primary { color: var(--text-primary) !important; }
    .text-secondary { color: var(--text-secondary) !important; }
    .text-muted { color: var(--text-muted) !important; }
    .text-gold { color: var(--accent-gold) !important; }

    *, *::before, *::after {
      box-sizing: inherit;
      margin: 0;
      padding: 0;
    }

    /* Vector Icon Shared Styles */
    .svg-icon {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
      stroke: currentColor;
    }

    /* =========================================================
       1. FLOATING COMPASS ORB (Animated Flight & Centering)
       ========================================================= */
    .compass-float-btn {
      position: fixed;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      z-index: 2147483648;
      background: var(--urgency-bg, linear-gradient(135deg, #2E7CF6, #1C5BC2));
      border: 1.5px solid rgba(255, 255, 255, 0.65);
      box-shadow: 
        0 6px 22px 0 var(--urgency-glow, rgba(46, 124, 246, 0.65)),
        inset 0 2px 2px 0 rgba(255, 255, 255, 0.75),
        inset 0 -2px 3px 0 rgba(0, 0, 0, 0.40);
      color: white;
      touch-action: none;
      will-change: top, right, transform;
      overflow: visible !important;
      /* Smooth flight transition between corner and header center */
      transition: 
        top 0.45s cubic-bezier(0.16, 1, 0.3, 1),
        right 0.45s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.30s ease;
    }

    /* Specular Crescent Highlight (Physical Curved Glass Lens) */
    .compass-float-btn::before {
      content: "";
      position: absolute;
      top: 2px;
      left: 6px;
      right: 6px;
      height: 20px;
      border-radius: 50% 50% 45% 45%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.15) 60%, transparent 100%);
      pointer-events: none;
    }

    /* Docked State: Centered at top of Floating Squircle Panel */
    .compass-float-btn.docked {
      top: 32px !important;
      right: 216px !important; /* Mathematically centered: 20px panel margin + (440 - 48)/2 */
      cursor: pointer;
      box-shadow: 
        0 8px 32px 2px var(--urgency-glow, rgba(46, 124, 246, 0.75)),
        inset 0 2px 2.5px 0 rgba(255, 255, 255, 0.85),
        inset 0 -2px 3px 0 rgba(0, 0, 0, 0.45);
    }

    @media (max-width: 480px) {
      .compass-float-btn.docked {
        right: calc(50vw - 24px) !important;
      }
    }

    .compass-float-btn:hover {
      transform: scale(1.08);
    }

    .compass-float-btn:active {
      cursor: grabbing;
      transform: scale(0.92);
      transition-duration: 0.10s;
    }

    .compass-icon-svg {
      width: 25px;
      height: 25px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
      transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 2;
    }

    .compass-float-btn.docked .compass-icon-svg {
      transform: rotate(45deg);
    }

    /* Red Tabular Notification Badge Pip (Always fully visible) */
    .compass-badge-pip {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      padding: 0 5px;
      background: #E63946;
      border: 2px solid white;
      color: white;
      font-size: 11px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      z-index: 30;
      pointer-events: none;
      line-height: 1;
    }

    /* =========================================================
       2. HOVERING SQUIRCLE PANEL (Floating Liquid Glass Island)
       ========================================================= */
    .compass-panel-container {
      position: fixed;
      top: 20px;
      right: 20px;
      bottom: 20px;
      width: 440px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 40px);
      background: ${colors.bgPanel};
      backdrop-filter: blur(32px) saturate(185%);
      -webkit-backdrop-filter: blur(32px) saturate(185%);
      border: 1.5px solid ${colors.panelBorder};
      border-radius: 28px; /* Authentic Apple squircle shape */
      box-shadow: 
        0 28px 72px -12px rgba(0, 0, 0, 0.55),
        0 10px 30px -6px rgba(0, 0, 0, 0.35),
        ${colors.panelSpecular};
      display: flex;
      flex-direction: column;
      transform: translate3d(calc(100% + 50px), 0, 0);
      transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483642;
      overflow: hidden;
      will-change: transform;
      contain: layout style;
    }

    .compass-panel-container.open {
      transform: translate3d(0, 0, 0);
    }

    /* Panel Header */
    .compass-header {
      padding: 14px 20px 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: ${colors.headerBg};
      border-top-left-radius: 28px;
      border-top-right-radius: 28px;
      box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.35);
      position: relative;
      min-height: 72px;
    }

    /* Center Dock Halo Slot for the Orb */
    .compass-header-center-dock {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 180, 216, 0.32) 0%, rgba(46, 124, 246, 0.15) 50%, transparent 75%);
      box-shadow: 0 0 24px rgba(0, 180, 216, 0.30);
      border: 1px dashed rgba(255, 255, 255, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 1;
    }

    .compass-title-group {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 2;
      min-width: 0;
      padding-right: 28px;
    }

    .compass-logo-glyph {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #CFB87C 0%, #9E8236 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.5);
      flex-shrink: 0;
    }

    .compass-title {
      font-size: 14.5px;
      font-weight: 750;
      letter-spacing: -0.025em;
      color: ${colors.textPrimary};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .compass-subtitle {
      font-size: 10px;
      color: ${colors.textSecondary};
      font-weight: 500;
      white-space: nowrap;
    }

    .compass-header-actions {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      z-index: 2;
      padding-left: 28px;
    }

    .glass-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: ${colors.iconDefault};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
      transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s ease, border-color 0.18s ease;
    }

    .glass-icon-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      color: ${colors.textPrimary};
      border-color: rgba(255, 255, 255, 0.35);
      transform: scale(1.06);
    }

    .glass-icon-btn:active {
      transform: scale(0.92);
    }

    /* =========================================================
       3. NAVIGATION BAR (iOS Segmented Capsule Switch)
       ========================================================= */
    .compass-nav {
      padding: 8px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .compass-segmented-track {
      display: flex;
      padding: 3px;
      gap: 3px;
      background: ${colors.navTrackBg};
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      box-shadow: inset 0 1.5px 3px rgba(0, 0, 0, 0.25);
    }

    .nav-pill {
      flex: 1;
      padding: 6px 10px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      border-radius: 11px;
      border: 1px solid transparent;
      color: ${colors.textSecondary};
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.20s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .nav-pill:hover {
      color: ${colors.textPrimary};
      background: rgba(255, 255, 255, 0.08);
    }

    .nav-pill.active {
      color: ${colors.textPrimary};
      background: ${colors.navActivePill};
      border-color: rgba(255, 255, 255, 0.30);
      box-shadow: 
        inset 0 1px 1px 0 rgba(255, 255, 255, 0.40),
        0 3px 10px rgba(0, 0, 0, 0.20);
      font-weight: 700;
    }

    /* =========================================================
       4. FILTER BAR
       ========================================================= */
    .compass-filter-bar {
      padding: 8px 16px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .filter-search-wrapper {
      position: relative;
      flex: 1.2;
      display: flex;
      align-items: center;
    }

    .filter-search-wrapper .search-icon {
      position: absolute;
      left: 9px;
      pointer-events: none;
      color: ${colors.textMuted};
    }

    .glass-select, .glass-input {
      background: ${colors.inputBg};
      border: 1.5px solid ${colors.inputBorder};
      border-radius: 12px;
      padding: 8px 11px;
      color: ${colors.textPrimary};
      font-size: 12px;
      font-weight: 500;
      outline: none;
      box-shadow: ${isDark ? 'inset 0 1px 2px rgba(0, 0, 0, 0.35)' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'};
      transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    }

    .glass-input::placeholder,
    .glass-input::-webkit-input-placeholder {
      color: ${colors.placeholderColor} !important;
      -webkit-text-fill-color: ${colors.placeholderColor};
      font-weight: 450;
    }

    .glass-select option {
      background: ${isDark ? '#1E293B' : '#FFFFFF'};
      color: ${isDark ? '#F8FAFC' : '#0F172A'};
    }

    .glass-input.with-search-icon {
      padding-left: 28px;
      width: 100%;
    }

    .glass-select:focus, .glass-input:focus {
      border-color: ${colors.accentGold};
      box-shadow: 0 0 0 2.5px ${isDark ? 'rgba(243, 229, 171, 0.35)' : 'rgba(141, 111, 37, 0.25)'};
      background: ${isDark ? 'rgba(255, 255, 255, 0.13)' : '#FFFFFF'};
    }

    /* =========================================================
       5. CONTENT SCROLL AREA
       ========================================================= */
    .compass-scroll-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .compass-scroll-content::-webkit-scrollbar {
      width: 6px;
    }
    .compass-scroll-content::-webkit-scrollbar-track {
      background: transparent;
    }
    .compass-scroll-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 3px;
    }

    /* Section Headers */
    .compass-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 0 2px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${colors.textMuted};
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .section-count-badge {
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.07);
      color: ${colors.textSecondary};
      border: 1px solid rgba(255, 255, 255, 0.10);
    }

    /* =========================================================
       6. FROSTED LIQUID GLASS CARDS (Reference Images 2 & 3)
       ========================================================= */
    .glass-card {
      background: ${colors.bgCard};
      border: 1.5px solid ${colors.cardBorder};
      border-radius: 20px; /* Continuous squircle radius */
      padding: 13px 15px;
      margin-bottom: 9px;
      box-shadow: ${colors.cardSpecular}, ${colors.cardShadow};
      transition: 
        transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
        border-color 0.20s ease,
        box-shadow 0.20s ease,
        background 0.20s ease;
      cursor: pointer;
      position: relative;
      will-change: transform;
      contain: layout style;
    }

    /* Hover: Luminous course vapor rim */
    .glass-card:hover {
      transform: translateY(-2px);
      border-color: var(--card-course-border, ${colors.cardBorderHover});
      background: ${colors.bgCardHover};
      box-shadow: 
        inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.60),
        0 0 20px -2px var(--card-course-glow, rgba(207, 184, 124, 0.40)),
        ${colors.cardShadow};
    }

    /* Tactile Press Down */
    .glass-card:active {
      transform: scale(0.978);
      transition-duration: 0.08s;
    }

    .glass-card.completed {
      opacity: 0.50;
    }

    .glass-card.completed .card-title {
      text-decoration: line-through;
    }

    .card-top-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .card-checkbox {
      width: 20px;
      height: 20px;
      margin-top: 1px;
      border-radius: 6px;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      color: white;
      transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .card-checkbox.checked {
      background: #10B981;
      border-color: #10B981;
      color: white;
      transform: scale(1.05);
    }

    .card-checkbox:hover {
      border-color: rgba(255, 255, 255, 0.60);
      background: rgba(255, 255, 255, 0.12);
    }

    .card-checkbox svg {
      pointer-events: none;
    }

    /* Course Accordion Header & Chevron */
    .course-accordion-header {
      cursor: pointer;
      user-select: none;
      transition: background 0.2s ease;
      border-radius: 14px;
      padding: 4px;
      margin: -4px;
    }

    .course-accordion-header:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .course-chevron {
      width: 22px;
      height: 22px;
      border-radius: 7px;
      background: ${isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)'};
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.12)'};
      color: ${colors.textPrimary};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease, color 0.15s ease;
      flex-shrink: 0;
    }

    .course-chevron:hover {
      background: ${isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'};
      color: ${colors.accentGold};
    }

    .course-chevron.expanded {
      transform: rotate(180deg);
      color: ${colors.accentGold};
      background: ${isDark ? 'rgba(243, 229, 171, 0.20)' : 'rgba(141, 111, 37, 0.12)'};
      border-color: ${colors.accentGold};
    }

    .course-accordion-body {
      transition: all 0.3s ease;
    }

    /* High-contrast status badges */
    .badge-status-ready {
      background: ${isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(219, 234, 254, 0.95)'} !important;
      color: ${isDark ? '#93C5FD' : '#1D4ED8'} !important;
      border: 1px solid ${isDark ? 'rgba(96, 165, 250, 0.55)' : 'rgba(59, 130, 246, 0.45)'} !important;
      font-weight: 700;
    }
    .badge-status-synced {
      background: ${isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(209, 250, 229, 0.95)'} !important;
      color: ${isDark ? '#6EE7B7' : '#065F46'} !important;
      border: 1px solid ${isDark ? 'rgba(52, 211, 153, 0.55)' : 'rgba(16, 185, 129, 0.45)'} !important;
      font-weight: 700;
    }
    .badge-status-scanning {
      background: ${isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(254, 243, 199, 0.95)'} !important;
      color: ${isDark ? '#FDE68A' : '#92400E'} !important;
      border: 1px solid ${isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(245, 158, 11, 0.45)'} !important;
      font-weight: 700;
    }

    /* High-contrast Tracked & Muted buttons */
    .course-btn-tracked {
      background: ${isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(209, 250, 229, 0.90)'} !important;
      color: ${isDark ? '#6EE7B7' : '#065F46'} !important;
      border: 1px solid ${isDark ? 'rgba(52, 211, 153, 0.50)' : 'rgba(16, 185, 129, 0.45)'} !important;
      font-weight: 650;
    }
    .course-btn-muted {
      background: ${isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(254, 226, 226, 0.90)'} !important;
      color: ${isDark ? '#FCA5A5' : '#991B1B'} !important;
      border: 1px solid ${isDark ? 'rgba(248, 113, 113, 0.50)' : 'rgba(239, 68, 68, 0.45)'} !important;
      font-weight: 650;
    }

    .text-completed-count {
      color: ${isDark ? '#6EE7B7' : '#047857'} !important;
      font-weight: 650;
    }
    .text-muted-tag {
      color: ${isDark ? '#FCA5A5' : '#B91C1C'} !important;
      font-weight: 650;
    }
    .course-muted {
      border-color: ${isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.30)'};
    }

    /* Calendar Next Due Anchor Banner */
    .calendar-next-due-anchor {
      margin: 16px 0 10px 0;
      padding: 9px 14px;
      background: linear-gradient(135deg, rgba(46, 124, 246, 0.22) 0%, rgba(207, 184, 124, 0.14) 100%);
      border: 1px solid rgba(46, 124, 246, 0.40);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: ${isDark ? '#93C5FD' : '#1E40AF'};
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(46, 124, 246, 0.20);
    }

    .card-title {
      font-size: 13.5px;
      font-weight: 650;
      color: ${colors.textPrimary};
      margin-bottom: 5px;
      word-break: break-word;
      letter-spacing: -0.015em;
    }

    .card-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: ${colors.textSecondary};
      margin-top: 4px;
      font-variant-numeric: tabular-nums;
    }

    .course-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 650;
      background: ${colors.coursePillBg};
      border: 1px solid ${colors.coursePillBorder};
      color: ${colors.textPrimary};
    }

    .course-dot {
      width: 6.5px;
      height: 6.5px;
      border-radius: 50%;
      box-shadow: 0 0 6px currentColor;
    }

    .meta-date-span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }

    .badge-pill {
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-canvas {
      background: ${isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(37, 99, 235, 0.12)'};
      color: ${isDark ? '#93C5FD' : '#1D4ED8'};
      border: 1px solid ${isDark ? 'rgba(59, 130, 246, 0.45)' : 'rgba(37, 99, 235, 0.35)'};
    }
    .badge-syllabus {
      background: ${isDark ? 'rgba(168, 85, 247, 0.22)' : 'rgba(147, 51, 234, 0.12)'};
      color: ${isDark ? '#D8B4FE' : '#7E22CE'};
      border: 1px solid ${isDark ? 'rgba(168, 85, 247, 0.45)' : 'rgba(147, 51, 234, 0.35)'};
    }
    .badge-custom {
      background: ${isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.12)'};
      color: ${isDark ? '#6EE7B7' : '#047857'};
      border: 1px solid ${isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.35)'};
    }
    .badge-conflict {
      background: ${isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.12)'};
      color: ${isDark ? '#FCA5A5' : '#B91C1C'};
      border: 1px solid ${isDark ? '#EF4444' : 'rgba(239, 68, 68, 0.40)'};
    }
    .badge-inferred {
      background: ${isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(217, 119, 6, 0.12)'};
      color: ${isDark ? '#FDE68A' : '#B45309'};
      border: 1px solid ${isDark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(217, 119, 6, 0.35)'};
    }
    .badge-tbd {
      background: ${isDark ? 'rgba(148, 163, 184, 0.20)' : 'rgba(100, 116, 139, 0.12)'};
      color: ${isDark ? '#E2E8F0' : '#475569'};
      border: 1px solid ${isDark ? 'rgba(148, 163, 184, 0.40)' : 'rgba(100, 116, 139, 0.30)'};
    }

    .relevance-score-tag {
      font-size: 10px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: ${colors.textMuted};
      margin-left: auto;
    }

    /* Card Expansion & Inline Edit */
    .card-expanded-body {
      margin-top: 12px;
      padding-top: 11px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-notes {
      font-size: 12px;
      color: ${colors.textSecondary};
      background: ${isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.04)'};
      padding: 9px 12px;
      border-radius: 12px;
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
      line-height: 1.45;
    }

    .card-btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 4px;
    }

    .glass-btn {
      padding: 6px 13px;
      border-radius: 11px;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)'};
      background: ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
      color: ${colors.textPrimary};
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: ${isDark ? 'inset 0 1px 1px rgba(255, 255, 255, 0.20)' : 'inset 0 1px 1px rgba(255, 255, 255, 0.80)'};
      transition: all 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .glass-btn:hover {
      background: ${isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.10)'};
      border-color: ${isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.22)'};
      transform: scale(1.02);
    }

    .glass-btn:active {
      transform: scale(0.96);
    }

    .glass-btn.primary {
      background: #2E7CF6;
      color: white;
      border-color: rgba(255, 255, 255, 0.45);
      box-shadow: 0 3px 10px rgba(46, 124, 246, 0.40);
    }

    .glass-btn.primary:hover {
      background: #1C6FE0;
    }

    .glass-btn.danger {
      color: #EF4444;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .glass-btn.danger:hover {
      background: rgba(239, 68, 68, 0.15);
    }

    /* =========================================================
       7. BOTTOM DEBUG DRAWER
       ========================================================= */
    .debug-drawer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 52%;
      background: ${colors.bgCard};
      backdrop-filter: blur(36px);
      border-top: 1.5px solid rgba(255, 255, 255, 0.25);
      border-bottom-left-radius: 28px;
      border-bottom-right-radius: 28px;
      box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.40);
      display: flex;
      flex-direction: column;
      transform: translate3d(0, 100%, 0);
      transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.32s ease;
      z-index: 2147483643;
      will-change: transform;
      visibility: hidden;
      pointer-events: none;
    }

    .debug-drawer.open {
      transform: translate3d(0, 0%, 0);
      visibility: visible;
      pointer-events: auto;
    }

    .debug-header {
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.20);
    }

    .debug-log-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
    }

    .log-row {
      display: flex;
      gap: 8px;
      padding: 3.5px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .log-info { color: #60A5FA; }
    .log-warn { color: #FBBF24; }
    .log-error { color: #F87171; }

    /* =========================================================
       8. TOAST NOTIFICATION
       ========================================================= */
    .compass-toast {
      position: absolute;
      top: 72px;
      left: 20px;
      right: 20px;
      padding: 11px 16px;
      border-radius: 14px;
      background: rgba(28, 36, 52, 0.88);
      backdrop-filter: blur(28px);
      border: 1.5px solid rgba(255, 255, 255, 0.30);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      font-size: 12px;
      font-weight: 550;
      color: ${colors.textPrimary};
      display: flex;
      align-items: center;
      justify-content: space-between;
      transform: translate3d(0, -20px, 0);
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 2147483646;
    }

    .compass-toast.show {
      transform: translate3d(0, 0, 0);
      opacity: 1;
    /* =========================================================
       9. SUBMISSION BADGE & CARD DEEP-LINK
       ========================================================= */
    .badge-submitted {
      background: rgba(16, 185, 129, 0.20) !important;
      color: #34D178 !important;
      border: 1px solid rgba(16, 185, 129, 0.45) !important;
      font-weight: 700;
    }

    .card-deep-link-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: ${colors.textSecondary};
      transition: all 0.15s ease;
      cursor: pointer;
      text-decoration: none;
      flex-shrink: 0;
      margin-left: 4px;
    }

    .card-deep-link-btn:hover {
      background: rgba(207, 184, 124, 0.25);
      border-color: rgba(207, 184, 124, 0.6);
      color: var(--text-primary);
      transform: scale(1.08);
    }

    /* =========================================================
       10. DRAG & DROP SYLLABUS PDF DROPZONE
       ========================================================= */
    .pdf-dropzone {
      border: 1.5px dashed rgba(207, 184, 124, 0.40);
      background: rgba(207, 184, 124, 0.04);
      border-radius: 14px;
      padding: 14px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      margin-bottom: 10px;
    }

    .pdf-dropzone:hover, .pdf-dropzone.dragover {
      background: rgba(207, 184, 124, 0.12);
      border-color: #CFB87C;
      box-shadow: 0 0 20px rgba(207, 184, 124, 0.25);
      transform: scale(1.01);
    }

    /* =========================================================
       11. INSTRUCTOR & OFFICE HOURS CARD
       ========================================================= */
    .office-hours-card {
      background: ${isDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.04)'};
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }

    .office-hours-row {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      color: ${colors.textSecondary};
      margin-top: 5px;
    }

    .office-hours-row a {
      color: ${isDark ? '#60A5FA' : '#1D4ED8'};
      text-decoration: none;
      font-weight: 550;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .office-hours-row a:hover {
      text-decoration: underline;
    }

    /* =========================================================
       12. OPTION C: WORKLOAD & HELL WEEK RADAR DRAWER
       ========================================================= */
    .hell-week-drawer {
      background: linear-gradient(180deg, rgba(20, 26, 40, 0.65) 0%, rgba(12, 16, 26, 0.70) 100%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      padding: 12px;
      margin-bottom: 14px;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
    }

    .workload-week-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 8px 10px;
      margin-top: 6px;
      transition: background 0.15s ease;
    }

    .workload-week-card.critical {
      background: rgba(239, 68, 68, 0.10);
      border-color: rgba(239, 68, 68, 0.35);
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.15);
    }

    .workload-bar-track {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.10);
      overflow: hidden;
      margin-top: 5px;
    }

    .workload-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    /* =========================================================
       13. FLOATING IN-PAGE LIQUID GLASS TOAST BANNER (TOP VIEWPORT)
       ========================================================= */
    .liquid-floating-banner {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(-30px);
      min-width: 340px;
      max-width: 480px;
      padding: 12px 18px;
      border-radius: 20px;
      background: ${isDark ? 'rgba(18, 24, 38, 0.78)' : 'rgba(255, 255, 255, 0.88)'};
      backdrop-filter: blur(32px) saturate(190%);
      -webkit-backdrop-filter: blur(32px) saturate(190%);
      border: 1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.12)'};
      box-shadow: 
        ${isDark ? '0 16px 40px rgba(0, 0, 0, 0.50), inset 0 1.5px 2px rgba(255, 255, 255, 0.45)' : '0 16px 40px rgba(0, 0, 0, 0.16), inset 0 1.5px 2px rgba(255, 255, 255, 0.80)'};
      color: ${colors.textPrimary};
      font-size: 12px;
      font-weight: 550;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      opacity: 0;
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483647;
    }

    .liquid-floating-banner.visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
  `;
}
