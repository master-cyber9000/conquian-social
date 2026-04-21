'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface CharacterProfile {
  displayName: string;
  avatar: string;
  borderColor: string;
  playerId: string;
}

const STORAGE_KEY = 'conquian_character';

export function useCharacter() {
  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const saveProfile = (data: Omit<CharacterProfile, 'playerId'>) => {
    const fullProfile: CharacterProfile = {
      ...data,
      playerId: uuidv4(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullProfile));
    setProfile(fullProfile);
    return fullProfile;
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  };

  return { profile, loaded, saveProfile, clearProfile };
}
