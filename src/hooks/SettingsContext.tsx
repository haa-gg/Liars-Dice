import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DiceStyle = 'pixel' | 'doodle' | 'html' | 'laser-ghost' | 'gold' | 'metal';
export type ThemeMode = 'dark' | 'light';

interface UserSettings {
    diceStyle: DiceStyle;
    theme: ThemeMode;
}

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
    diceStyle: 'pixel',
    theme: 'dark',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<UserSettings>(() => {
        const saved = localStorage.getItem('liarsDicePreferences');
        if (saved) {
            try {
                return { ...defaultSettings, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('liarsDicePreferences', JSON.stringify(settings));
    }, [settings]);

    // Apply theme to the document root whenever it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }, [settings.theme]);

    const updateSettings = (newSettings: Partial<UserSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useUserSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useUserSettings must be used within a SettingsProvider');
    }
    return context;
};
