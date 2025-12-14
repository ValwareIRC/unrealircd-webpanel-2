import { useState } from 'react'
import { useTheme, type Theme, type ThemeColors } from '@/contexts/ThemeContext'
import { Modal } from './Modal'
import { Button } from './Button'
import { useTranslation } from 'react-i18next'
import { Palette, Check, Sparkles, Monitor, Cpu, Clock, Sun, Snowflake } from 'lucide-react'

const categoryIcons = {
  modern: Sparkles,
  futuristic: Cpu,
  retro: Clock,
  classic: Sun,
  festive: Snowflake,
}

const categoryLabels = {
  modern: 'Modern',
  futuristic: 'Futuristic',
  retro: 'Retro',
  classic: 'Classic',
  festive: 'Festive',
}

function ThemeCard({ theme, isActive, onClick }: { theme: Theme; isActive: boolean; onClick: () => void }) {
  const Icon = categoryIcons[theme.category]
  
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 transition-all text-left w-full ${
        isActive
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
          : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
      }`}
      style={{
        background: theme.colors.bgSecondary,
      }}
    >
      {/* Preview colors */}
      <div className="flex gap-1 mb-3">
        <div className="w-6 h-6 rounded" style={{ background: theme.colors.accent }} />
        <div className="w-6 h-6 rounded" style={{ background: theme.colors.bgTertiary }} />
        <div className="w-6 h-6 rounded" style={{ background: theme.colors.textPrimary }} />
        <div className="w-6 h-6 rounded" style={{ background: theme.colors.success }} />
        <div className="w-6 h-6 rounded" style={{ background: theme.colors.error }} />
      </div>
      
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold" style={{ color: theme.colors.textPrimary }}>
            {theme.name}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: theme.colors.textMuted }}>
            {theme.description}
          </p>
        </div>
        <Icon size={16} style={{ color: theme.colors.textMuted }} />
      </div>
      
      {isActive && (
        <div className="absolute top-2 right-2">
          <Check size={18} className="text-[var(--accent)]" />
        </div>
      )}
    </button>
  )
}

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-[var(--border-primary)]"
      />
      <div className="flex-1">
        <label className="text-sm text-[var(--text-secondary)]">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full mt-1 px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-[var(--text-primary)]"
        />
      </div>
    </div>
  )
}

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { theme, setTheme, customColors, setCustomColors, availableThemes } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'customize'>('presets')
  const [localCustomColors, setLocalCustomColors] = useState<Partial<ThemeColors>>(
    customColors || {}
  )
  
  const groupedThemes = {
    modern: availableThemes.filter(t => t.category === 'modern'),
    futuristic: availableThemes.filter(t => t.category === 'futuristic'),
    retro: availableThemes.filter(t => t.category === 'retro'),
    classic: availableThemes.filter(t => t.category === 'classic'),
    festive: availableThemes.filter(t => t.category === 'festive'),
  }
  
  const handleApplyCustom = () => {
    setCustomColors(localCustomColors)
  }
  
  const handleResetCustom = () => {
    setLocalCustomColors({})
    setCustomColors(null)
  }
  
  const currentColors = { ...theme.colors, ...customColors }
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title={t('themeSwitcher.title')}
      >
        <Palette size={20} />
      </button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Theme Settings"
        size="xl"
      >
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-[var(--border-primary)]">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'presets'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Monitor size={16} className="inline mr-2" />
              {t('themeSwitcher.tabs.presets')}
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'customize'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Palette size={16} className="inline mr-2" />
              {t('themeSwitcher.tabs.customize')}
            </button>
          </div>
          
          {activeTab === 'presets' && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {(Object.keys(groupedThemes) as Array<keyof typeof groupedThemes>).map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    {(() => {
                      const Icon = categoryIcons[category]
                      return <Icon size={14} />
                    })()}
                    {categoryLabels[category]}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupedThemes[category].map((t) => (
                      <ThemeCard
                        key={t.id}
                        theme={t}
                        isActive={theme.id === t.id}
                        onClick={() => setTheme(t.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'customize' && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-muted)]">
                {t('themeSwitcher.customizeIntro', { name: theme.name })}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('themeSwitcher.sections.background')}</h4>
                  <ColorPicker
                    label={t('themeSwitcher.colors.primary')}
                    value={localCustomColors.bgPrimary || currentColors.bgPrimary}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, bgPrimary: v })}
                  />
                  <ColorPicker
                    label={t('themeSwitcher.colors.secondary')}
                    value={localCustomColors.bgSecondary || currentColors.bgSecondary}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, bgSecondary: v })}
                  />
                  <ColorPicker
                    label={t('themeSwitcher.colors.tertiary')}
                    value={localCustomColors.bgTertiary || currentColors.bgTertiary}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, bgTertiary: v })}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('themeSwitcher.sections.text')}</h4>
                  <ColorPicker
                    label={t('themeSwitcher.colors.textPrimary')}
                    value={localCustomColors.textPrimary || currentColors.textPrimary}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, textPrimary: v })}
                  />
                  <ColorPicker
                    label={t('themeSwitcher.colors.textMuted')}
                    value={localCustomColors.textMuted || currentColors.textMuted}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, textMuted: v })}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('themeSwitcher.colors.accent')}</h4>
                  <ColorPicker
                    label={t('themeSwitcher.colors.accent')}
                    value={localCustomColors.accent || currentColors.accent}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, accent: v })}
                  />
                  <ColorPicker
                    label={t('themeSwitcher.colors.accentHover')}
                    value={localCustomColors.accentHover || (currentColors as any).accentHover}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, accentHover: v })}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('themeSwitcher.sections.background')}</h4>
                  <ColorPicker
                    label={t('themeSwitcher.colors.success')}
                    value={localCustomColors.success || currentColors.success}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, success: v })}
                  />
                  <ColorPicker
                    label={t('themeSwitcher.colors.error')}
                    value={localCustomColors.error || currentColors.error}
                    onChange={(v) => setLocalCustomColors({ ...localCustomColors, error: v })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-primary)]">
                <Button onClick={handleApplyCustom}>{t('themeSwitcher.apply')}</Button>
                <Button variant="secondary" onClick={handleResetCustom}>{t('themeSwitcher.reset')}</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
