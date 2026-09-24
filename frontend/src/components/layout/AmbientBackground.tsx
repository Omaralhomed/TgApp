'use client';

import React, { useState, useEffect } from 'react';

export type BackgroundStyle = 'aurora' | 'nebula' | 'alpine' | 'minimal';

export function AmbientBackground() {
  const [bgStyle, setBgStyle] = useState<BackgroundStyle>('aurora');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load initial preference
    const stored = (localStorage.getItem('tg_bg_style') as BackgroundStyle) || 'aurora';
    setBgStyle(stored);

    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    // Listen for custom event when user updates background in ThemeCustomizerModal
    const handleBgChange = (e: any) => {
      if (e.detail?.bgStyle) {
        setBgStyle(e.detail.bgStyle);
      }
      checkDark();
    };

    window.addEventListener('tg-bg-change', handleBgChange);
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('tg-bg-change', handleBgChange);
      observer.disconnect();
    };
  }, []);

  if (bgStyle === 'minimal') {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700">
      {/* 1. Dark Mode Backgrounds */}
      {isDarkMode ? (
        <>
          {bgStyle === 'aurora' && (
            <div className="absolute inset-0">
              {/* Top-Right Luminous Orb (Telegram Blue) */}
              <div
                className="absolute -top-[15%] end-[5%] w-[650px] h-[650px] rounded-full blur-[140px] opacity-25 animate-pulse-subtle"
                style={{ background: 'radial-gradient(circle, var(--brand-primary, #007AFF) 0%, transparent 70%)' }}
              />
              {/* Center-Left Radiant Orb (Royal Indigo / Violet) */}
              <div
                className="absolute top-[35%] start-[0%] w-[550px] h-[550px] rounded-full blur-[150px] opacity-20"
                style={{ background: 'radial-gradient(circle, var(--brand-secondary, #5856D6) 0%, transparent 70%)' }}
              />
              {/* Bottom Glowing Mist (Cyan / Emerald) */}
              <div
                className="absolute -bottom-[10%] end-[25%] w-[600px] h-[450px] rounded-full blur-[160px] opacity-15"
                style={{ background: 'radial-gradient(circle, #00C7BE 0%, transparent 70%)' }}
              />
            </div>
          )}

          {bgStyle === 'nebula' && (
            <div className="absolute inset-0">
              {/* Deep Cyber Space Mesh */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
              <div
                className="absolute top-[20%] end-[15%] w-[450px] h-[450px] rounded-full blur-[120px] opacity-30"
                style={{ background: 'radial-gradient(circle, #7928CA 0%, transparent 70%)' }}
              />
              <div
                className="absolute bottom-[10%] start-[10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-20"
                style={{ background: 'radial-gradient(circle, #0070F3 0%, transparent 70%)' }}
              />
              {/* Subtle Cosmic Star Dust Grid */}
              <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                  backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
                  backgroundSize: '36px 36px',
                }}
              />
            </div>
          )}

          {bgStyle === 'alpine' && (
            <div className="absolute inset-0">
              {/* Frosted Alpine Vista Lighting (Matching Reference Image 5) */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/70 via-[#0A0F1D]/80 to-[#080B11]" />
              {/* Soft Horizon Glow */}
              <div className="absolute bottom-[20%] inset-x-0 h-96 bg-gradient-to-t from-blue-900/15 via-indigo-900/10 to-transparent blur-3xl pointer-events-none" />
              {/* Floating Ambient Frost Bubble */}
              <div
                className="absolute top-12 end-24 w-80 h-80 rounded-full blur-[100px] opacity-20"
                style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }}
              />
            </div>
          )}
        </>
      ) : (
        /* 2. Light Mode Dynamic Ambient Aura (Tints to Selected Theme Accent) */
        <div className="absolute inset-0">
          {/* Top Radial Aura matching primary accent */}
          <div
            className="absolute -top-[12%] end-[8%] w-[600px] h-[500px] rounded-full blur-[140px] opacity-15"
            style={{ background: 'radial-gradient(circle, var(--brand-primary, #007AFF) 0%, transparent 70%)' }}
          />
          {/* Top-Start Radial Aura matching secondary accent */}
          <div
            className="absolute -top-[5%] start-[5%] w-[500px] h-[450px] rounded-full blur-[150px] opacity-12"
            style={{ background: 'radial-gradient(circle, var(--brand-secondary, #5856D6) 0%, transparent 70%)' }}
          />
          {/* Center Subtle Mist */}
          <div
            className="absolute top-[40%] end-[20%] w-[550px] h-[450px] rounded-full blur-[160px] opacity-10"
            style={{ background: 'radial-gradient(circle, var(--brand-primary, #007AFF) 0%, transparent 70%)' }}
          />
        </div>
      )}
    </div>
  );
}
