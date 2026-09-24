'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Check, Droplets, Square } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Language } from '../../lib/translations';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export type MaterialStyle = 'glass' | 'solid';

export interface ThemeOption {
  id: string;
  nameAr: string;
  nameEn: string;
  mode: 'dark' | 'light';
  accentHex: string;
  accentHover: string;
  secondaryHex: string;
  bgDefaultHex: string;
  cardBgHex: string;
  borderHex: string;
}

export function ThemeCustomizerModal({
  isOpen,
  onClose,
  lang,
}: ThemeCustomizerModalProps) {
  // Tabs: 'light' or 'dark'
  const [activeTab, setActiveTab] = useState<'light' | 'dark'>('dark');
  const [activeThemeId, setActiveThemeId] = useState<string>('dark-blue');
  const [materialStyle, setMaterialStyle] = useState<MaterialStyle>('glass');

  // High-Contrast Light Themes
  const lightThemes: ThemeOption[] = [
    {
      id: 'light-blue',
      nameAr: 'أزرق تيليجرام (Apple Blue)',
      nameEn: 'Telegram Blue',
      mode: 'light',
      accentHex: '#007AFF',
      accentHover: '#0062CC',
      secondaryHex: '#5856D6',
      bgDefaultHex: '#EEF2F6',
      cardBgHex: '#FFFFFF',
      borderHex: '#CBD5E1',
    },
    {
      id: 'light-emerald',
      nameAr: 'أخضر زمردي (Emerald Green)',
      nameEn: 'Emerald Green',
      mode: 'light',
      accentHex: '#16A34A',
      accentHover: '#15803D',
      secondaryHex: '#0D9488',
      bgDefaultHex: '#EBF5EE',
      cardBgHex: '#FFFFFF',
      borderHex: '#B7E4C7',
    },
    {
      id: 'light-purple',
      nameAr: 'بنفسجي ملكي (Royal Purple)',
      nameEn: 'Royal Purple',
      mode: 'light',
      accentHex: '#7C3AED',
      accentHover: '#6D28D9',
      secondaryHex: '#9333EA',
      bgDefaultHex: '#F3E8FF',
      cardBgHex: '#FFFFFF',
      borderHex: '#D8B4FE',
    },
    {
      id: 'light-amber',
      nameAr: 'برتقالي كهرماني (Amber Orange)',
      nameEn: 'Amber Orange',
      mode: 'light',
      accentHex: '#EA580C',
      accentHover: '#C2410C',
      secondaryHex: '#D97706',
      bgDefaultHex: '#FFF7ED',
      cardBgHex: '#FFFFFF',
      borderHex: '#FED7AA',
    },
    {
      id: 'light-cyan',
      nameAr: 'سماوي جليدي (Cyan Ice)',
      nameEn: 'Cyan Ice',
      mode: 'light',
      accentHex: '#0284C7',
      accentHover: '#0369A1',
      secondaryHex: '#0891B2',
      bgDefaultHex: '#E0F2FE',
      cardBgHex: '#FFFFFF',
      borderHex: '#BAE6FD',
    },
    {
      id: 'light-crimson',
      nameAr: 'أحمر قرمزي (Crimson Red)',
      nameEn: 'Crimson Red',
      mode: 'light',
      accentHex: '#DC2626',
      accentHover: '#B91C1C',
      secondaryHex: '#E11D48',
      bgDefaultHex: '#FEF2F2',
      cardBgHex: '#FFFFFF',
      borderHex: '#FECACA',
    },
  ];

  // Deep Obsidian Dark Themes
  const darkThemes: ThemeOption[] = [
    {
      id: 'dark-blue',
      nameAr: 'أوبسيديان أزرق (Obsidian Blue)',
      nameEn: 'Obsidian Blue',
      mode: 'dark',
      accentHex: '#007AFF',
      accentHover: '#0062CC',
      secondaryHex: '#5856D6',
      bgDefaultHex: '#080B11',
      cardBgHex: '#11151D',
      borderHex: 'rgba(255, 255, 255, 0.12)',
    },
    {
      id: 'dark-purple',
      nameAr: 'بنفسجي داكن (Midnight Violet)',
      nameEn: 'Midnight Violet',
      mode: 'dark',
      accentHex: '#8B5CF6',
      accentHover: '#7C3AED',
      secondaryHex: '#A855F7',
      bgDefaultHex: '#090D1A',
      cardBgHex: '#121626',
      borderHex: 'rgba(139, 92, 246, 0.25)',
    },
    {
      id: 'dark-emerald',
      nameAr: 'زمردي نيون (Emerald Matrix)',
      nameEn: 'Emerald Matrix',
      mode: 'dark',
      accentHex: '#22C55E',
      accentHover: '#16A34A',
      secondaryHex: '#14B8A6',
      bgDefaultHex: '#06120E',
      cardBgHex: '#0E1D18',
      borderHex: 'rgba(34, 197, 94, 0.25)',
    },
    {
      id: 'dark-cyan',
      nameAr: 'سماوي سايبر (Cyber Cyan)',
      nameEn: 'Cyber Cyan',
      mode: 'dark',
      accentHex: '#06B6D4',
      accentHover: '#0891B2',
      secondaryHex: '#0284C7',
      bgDefaultHex: '#070F14',
      cardBgHex: '#0E1920',
      borderHex: 'rgba(6, 182, 212, 0.25)',
    },
    {
      id: 'dark-amber',
      nameAr: 'كهرماني ناري (Solar Amber)',
      nameEn: 'Solar Amber',
      mode: 'dark',
      accentHex: '#F59E0B',
      accentHover: '#D97706',
      secondaryHex: '#EA580C',
      bgDefaultHex: '#0C0E14',
      cardBgHex: '#161820',
      borderHex: 'rgba(245, 158, 11, 0.25)',
    },
    {
      id: 'dark-crimson',
      nameAr: 'قرمزي خفي (Crimson Stealth)',
      nameEn: 'Crimson Stealth',
      mode: 'dark',
      accentHex: '#EF4444',
      accentHover: '#DC2626',
      secondaryHex: '#F43F5E',
      bgDefaultHex: '#0B090B',
      cardBgHex: '#161216',
      borderHex: 'rgba(239, 68, 68, 0.25)',
    },
  ];

  // Load active theme & material mode on open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      const currentMode = isDark ? 'dark' : 'light';
      setActiveTab(currentMode);

      const storedThemeId = localStorage.getItem('tg_active_theme_id') || (currentMode === 'dark' ? 'dark-blue' : 'light-blue');
      setActiveThemeId(storedThemeId);

      const storedMaterial = (localStorage.getItem('tg_material_style') as MaterialStyle) || 'glass';
      setMaterialStyle(storedMaterial);
    }
  }, [isOpen]);

  const applyTheme = (theme: ThemeOption) => {
    if (typeof window === 'undefined') return;

    setActiveThemeId(theme.id);
    setActiveTab(theme.mode);

    localStorage.setItem('tg_active_theme_id', theme.id);
    localStorage.setItem('tg_theme', theme.mode);
    localStorage.setItem('tg_accent', theme.accentHex);

    const root = document.documentElement;

    // Apply Mode Class
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Material Style Class
    if (materialStyle === 'glass') {
      root.classList.add('glass-theme');
      root.classList.remove('solid-theme');
    } else {
      root.classList.add('solid-theme');
      root.classList.remove('glass-theme');
    }

    // Set CSS Variables
    root.style.setProperty('--brand-primary', theme.accentHex);
    root.style.setProperty('--brand-primary-hover', theme.accentHover);
    root.style.setProperty('--brand-secondary', theme.secondaryHex);
    root.style.setProperty('--bg-default', theme.bgDefaultHex);
  };

  const applyMaterial = (style: MaterialStyle) => {
    if (typeof window === 'undefined') return;

    setMaterialStyle(style);
    localStorage.setItem('tg_material_style', style);

    const root = document.documentElement;
    if (style === 'glass') {
      root.classList.add('glass-theme');
      root.classList.remove('solid-theme');
    } else {
      root.classList.add('solid-theme');
      root.classList.remove('glass-theme');
    }
  };

  const currentThemes = activeTab === 'dark' ? darkThemes : lightThemes;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'ar' ? 'الثيمات ونظام المظهر' : 'Themes & Appearance'}
      subtitle={lang === 'ar' ? 'اختر النمط المناسب للتطبيق مباشرة وبأعلى وضوح.' : 'Select a theme and material style for instant high-contrast styling.'}
      maxWidth="md"
    >
      <div className="space-y-5 text-start select-none">
        {/* 1. Light vs Dark Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-card bg-app-subtle border border-app-border">
          <button
            onClick={() => {
              setActiveTab('light');
              applyTheme(lightThemes[0]);
            }}
            className={`py-2 px-4 rounded-btn flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
              activeTab === 'light'
                ? 'bg-app-card text-brand-primary shadow-soft-xs border border-app-border'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>{lang === 'ar' ? 'المضيء (Light)' : 'Light Themes'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('dark');
              applyTheme(darkThemes[0]);
            }}
            className={`py-2 px-4 rounded-btn flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
              activeTab === 'dark'
                ? 'bg-app-card text-brand-primary shadow-soft-xs border border-app-border'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>{lang === 'ar' ? 'الداكن (Dark)' : 'Dark Themes'}</span>
          </button>
        </div>

        {/* 2. Compact Theme Selection Grid (No long descriptions or fluff) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-app-text block">
            {activeTab === 'light'
              ? (lang === 'ar' ? 'الألوان المضيئة (عالية التباين)' : 'High-Contrast Light Themes')
              : (lang === 'ar' ? 'الألوان الداكنة (سايبر أوبسيديان)' : 'Deep Dark Themes')}
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {currentThemes.map((theme) => {
              const isSelected = activeThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme)}
                  className={`p-3 rounded-card border text-start transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-brand-primary ring-2 ring-brand-primary/40 bg-brand-primary/5 shadow-soft-xs'
                      : 'border-app-border bg-app-card hover:bg-app-subtle/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-black/10"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                    <span className="text-xs font-bold text-app-text truncate">
                      {lang === 'ar' ? theme.nameAr : theme.nameEn}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Surface Material Style: Glass vs Solid (خيار زجاجي أو عادي) */}
        <div className="space-y-2 pt-2 border-t border-app-border">
          <label className="text-xs font-bold text-app-text block">
            {lang === 'ar' ? 'نمط الخامة والأسطح' : 'Surface Style'}
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Frosted Glass (خيار زجاجي) */}
            <button
              onClick={() => applyMaterial('glass')}
              className={`p-3 rounded-card border flex items-center justify-center gap-2 transition cursor-pointer ${
                materialStyle === 'glass'
                  ? 'border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary font-bold text-app-text shadow-soft-xs'
                  : 'border-app-border bg-app-card text-app-muted hover:text-app-text'
              }`}
            >
              <Droplets className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-bold">
                {lang === 'ar' ? 'خيار زجاجي (Glass)' : 'Frosted Glass'}
              </span>
              {materialStyle === 'glass' && <Check className="w-3.5 h-3.5 text-brand-primary ms-1" />}
            </button>

            {/* Solid Minimal (خيار عادي) */}
            <button
              onClick={() => applyMaterial('solid')}
              className={`p-3 rounded-card border flex items-center justify-center gap-2 transition cursor-pointer ${
                materialStyle === 'solid'
                  ? 'border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary font-bold text-app-text shadow-soft-xs'
                  : 'border-app-border bg-app-card text-app-muted hover:text-app-text'
              }`}
            >
              <Square className="w-4 h-4 text-app-muted" />
              <span className="text-xs font-bold">
                {lang === 'ar' ? 'خيار عادي (Solid)' : 'Solid Minimal'}
              </span>
              {materialStyle === 'solid' && <Check className="w-3.5 h-3.5 text-brand-primary ms-1" />}
            </button>
          </div>
        </div>

        {/* 4. Footer */}
        <div className="pt-2 flex items-center justify-end">
          <Button variant="primary" onClick={onClose}>
            {lang === 'ar' ? 'تم وحفظ' : 'Done'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
