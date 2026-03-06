// ============================================================
// DiscoTube Mobile – Global State Store
// Simple React Context for app-wide state management
// ============================================================

import React, {createContext, useContext, useReducer, useCallback, useRef, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {DiscoTubeState} from '../services/api';

// ── State ───────────────────────────────────────────────
interface AppState {
  connected: boolean;
  hostIp: string;
  power: boolean;
  brightness: number;
  speed: number;
  effect: string;
  color: {r: number; g: number; b: number};
  colorTemp: number;
  musicMode: string;
  musicSensitivity: number;
  timer: number;
  effects: string[];
  audio: {bass: number; mid: number; high: number; overall: number; beat: boolean; eq: number[]};
}

const initialState: AppState = {
  connected: false,
  hostIp: '',
  power: false,
  brightness: 80,
  speed: 50,
  effect: 'rainbow',
  color: {r: 255, g: 0, b: 128},
  colorTemp: 4000,
  musicMode: 'off',
  musicSensitivity: 1.0,
  timer: 0,
  effects: [],
  audio: {bass: 0, mid: 0, high: 0, overall: 0, beat: false, eq: []},
};

// ── Actions ─────────────────────────────────────────────
type Action =
  | {type: 'SET_STATE'; payload: Partial<AppState>}
  | {type: 'SET_CONNECTED'; payload: boolean}
  | {type: 'SET_HOST'; payload: string}
  | {type: 'SYNC_REMOTE'; payload: DiscoTubeState};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return {...state, ...action.payload};
    case 'SET_CONNECTED':
      return {...state, connected: action.payload};
    case 'SET_HOST':
      return {...state, hostIp: action.payload};
    case 'SYNC_REMOTE':
      const remote = action.payload;
      return {
        ...state,
        connected: true,
        power: remote.power,
        brightness: remote.brightness,
        speed: remote.speed,
        effect: remote.effect,
        color: remote.color,
        colorTemp: remote.colorTemp,
        musicMode: remote.musicMode,
        musicSensitivity: remote.musicSensitivity,
        timer: remote.timer,
        effects: remote.effects || state.effects,
        audio: remote.audio ? {
          bass: remote.audio.bass || 0,
          mid: remote.audio.mid || 0,
          high: remote.audio.high || 0,
          overall: remote.audio.overall || 0,
          beat: remote.audio.beat || false,
          eq: remote.audio.eq || [],
        } : state.audio,
      };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  connectToHost: (ip: string) => Promise<boolean>;
  syncState: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  state: initialState,
  dispatch: () => {},
  connectToHost: async () => false,
  syncState: async () => {},
});

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved host IP on mount
  useEffect(() => {
    AsyncStorage.getItem('disco_host_ip').then(ip => {
      if (ip) {
        connectToHost(ip);
      }
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectToHost = useCallback(async (ip: string): Promise<boolean> => {
    api.setHost(ip);
    dispatch({type: 'SET_HOST', payload: ip});

    const result = await api.getState();
    if (result) {
      dispatch({type: 'SYNC_REMOTE', payload: result});
      await AsyncStorage.setItem('disco_host_ip', ip);

      // Start polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const s = await api.getState();
        if (s) {
          dispatch({type: 'SYNC_REMOTE', payload: s});
        } else {
          dispatch({type: 'SET_CONNECTED', payload: false});
        }
      }, 5000);

      return true;
    } else {
      dispatch({type: 'SET_CONNECTED', payload: false});
      return false;
    }
  }, []);

  const syncState = useCallback(async () => {
    const result = await api.getState();
    if (result) {
      dispatch({type: 'SYNC_REMOTE', payload: result});
    }
  }, []);

  return (
    <StoreContext.Provider value={{state, dispatch, connectToHost, syncState}}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

export default StoreContext;
