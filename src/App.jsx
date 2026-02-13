import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Flame, 
  RefreshCw, 
  Award,
  Upload,
  HeartPulse,
  Target,
  Save,
  Clock,
  Utensils,
  TrendingUp,
  Dna,
  Camera,
  ImagePlus,
  Trophy,
  History,
  Sparkles
} from 'lucide-react';

// --- Configuration & Constants ---
const apiKey = "AIzaSyCBS0YP4aGn_zX6SedZKdMPR0F0ZonbRpk"; 
const modelName = "gemini-2.5-flash-preview-09-2025";

const EQUIPMENT_LIST = `
Elliptical, Titan power rack (3x3), REP functional trainer, Multi-grip pull-up bar, Olympic & EZ bars, Lever arms, Adjustable bench, Landmine, Dips rack, Bumper/Iron plates, Leg ext/curl rack attachment, Nordic/GHD pad, Leg press attachment, Kettlebells, Hex Dumbbells, Slam ball, Ab wheel, Battlerope.
`;

const FOOD_LIST = "Eggs, Chicken Breast, Tuna, Rice, Broccoli, Green Beans, Bresaola, Filet Mignon, Whey, Casein.";

const SUPPLEMENT_DATA = {
  morning: [
    { id: 'm1', name: 'Creatine (Klean)', dose: '5g', notes: 'Fasted with Water' },
    { id: 'm2', name: 'Tongkat Ali', dose: '200-400mg', notes: '5 on / 2 off' },
    { id: 'm3', name: 'Myo & D-Chiro Inositol', dose: 'Full label' },
    { id: 'm4', name: 'NMN', dose: '500-1000mg', pauseOnSenolytic: true, notes: 'NAD+ Signal' },
  ],
  postWorkout: [
    { id: 'p1', name: "One-A-Day Men's", dose: '1 tab' },
    { id: 'p2', name: 'Omega-3', dose: '2-3g' },
    { id: 'p3', name: 'CoQ10', dose: '300mg' },
    { id: 'p4', name: 'Policosanol & Red Yeast Rice', dose: 'Per label' },
    { id: 'p5', name: 'Ceylon Cinnamon', dose: '1000-1800mg' },
    { id: 'p6', name: 'Alpha-Lipoic Acid', dose: '600mg' },
    { id: 'p7', name: 'Turkesterone', dose: 'Full dose' },
    { id: 'p8', name: 'Trans-Resveratrol', dose: '250-500mg', pauseOnSenolytic: true, notes: 'Must have FAT' },
  ],
  midday: [
    { id: 'md1', name: 'Milk Thistle', dose: '300-600mg', notes: 'Optional' },
    { id: 'c1', name: 'Berberine Phytosome', dose: '500mg', notes: 'Only with Carb Meals' },
  ],
  bedtime: [
    { id: 'b1', name: 'Alpha Lion Night Burn', dose: 'Per label' },
    { id: 'b2', name: 'Magnesium Lysinate', dose: '200-400mg' },
    { id: 'b3', name: 'Glycine', dose: '3-5g' },
  ],
  senolyticOnly: [
    { id: 's1', name: 'Fisetin', dose: '1000-1500mg', notes: 'Senolytic Reset' },
    { id: 's2', name: 'Quercetin Phytosome', dose: '500-1000mg', notes: 'Senolytic Reset' },
  ]
};

// Muscle group → color (left bar + badge). Keys normalized to lowercase; AI may return "Hamstrings", "Quadriceps", etc.
const MUSCLE_GROUP_COLORS = {
  chest:     { bar: 'bg-rose-500',   badge: 'bg-rose-500/20',   text: 'text-rose-400' },
  back:     { bar: 'bg-amber-500',  badge: 'bg-amber-500/20',  text: 'text-amber-400' },
  shoulders:{ bar: 'bg-sky-500',    badge: 'bg-sky-500/20',    text: 'text-sky-400' },
  quads:    { bar: 'bg-emerald-500',badge: 'bg-emerald-500/20',text: 'text-emerald-400' },
  quadriceps:{ bar: 'bg-emerald-500',badge: 'bg-emerald-500/20',text: 'text-emerald-400' },
  hams:     { bar: 'bg-violet-500', badge: 'bg-violet-500/20', text: 'text-violet-400' },
  hamstrings:{ bar: 'bg-violet-500',badge: 'bg-violet-500/20', text: 'text-violet-400' },
  biceps:   { bar: 'bg-cyan-500',   badge: 'bg-cyan-500/20',   text: 'text-cyan-400' },
  triceps:  { bar: 'bg-orange-500', badge: 'bg-orange-500/20', text: 'text-orange-400' },
  abs:      { bar: 'bg-lime-500',   badge: 'bg-lime-500/20',   text: 'text-lime-400' },
  glutes:   { bar: 'bg-fuchsia-500',badge: 'bg-fuchsia-500/20',text: 'text-fuchsia-400' },
  calves:   { bar: 'bg-teal-500',   badge: 'bg-teal-500/20',   text: 'text-teal-400' },
  traps:    { bar: 'bg-amber-600',  badge: 'bg-amber-600/20',  text: 'text-amber-300' },
};
const DEFAULT_MUSCLE_COLOR = { bar: 'bg-neutral-500', badge: 'bg-neutral-500/20', text: 'text-neutral-400' };
const getMuscleGroupStyle = (group) => {
  if (!group) return DEFAULT_MUSCLE_COLOR;
  const key = String(group).toLowerCase().trim();
  return MUSCLE_GROUP_COLORS[key] || DEFAULT_MUSCLE_COLOR;
};

function buildOuraContextForCoach(oura) {
  if (!oura || typeof oura !== 'object') return '';
  const lines = ['--- OURA DATA (use this to tailor weights, cardio, food timing, and intensity) ---'];
  const r = (oura.readiness || []).slice(-5);
  if (r.length) {
    lines.push('Readiness (latest first): ' + r.map((x) => `day ${x.day ?? '?'} score ${x.score ?? '?'}`).join('; '));
    const last = r[r.length - 1];
    if (last?.contributors) lines.push('  Contributors: ' + JSON.stringify(last.contributors));
  }
  const s = (oura.sleep || []).slice(-5);
  if (s.length) {
    lines.push('Sleep: ' + s.map((x) => {
      const dur = x.total_sleep_duration ?? x.sleep_duration;
      const mins = typeof dur === 'number' ? Math.round(dur / 60) : null;
      return `day ${x.day ?? '?'} score ${x.score ?? '?'}${mins != null ? ` ${mins}min` : ''} eff ${x.efficiency ?? '?'}`;
    }).join('; '));
  }
  const a = (oura.activity || []).slice(-5);
  if (a.length) {
    lines.push('Activity: ' + a.map((x) => {
      const steps = x.steps ?? x.daily_movement ?? '?';
      const cal = x.calories_total ?? x.total_calories ?? '?';
      return `day ${x.day ?? '?'} score ${x.score ?? '?'} steps ${steps} cal ${cal}`;
    }).join('; '));
  }
  const p = oura.personal;
  if (p && typeof p === 'object') {
    const parts = [];
    if (p.weight != null) parts.push(`weight ${p.weight}kg`);
    if (p.age != null) parts.push(`age ${p.age}`);
    if (p.gender != null) parts.push(`gender ${p.gender}`);
    if (parts.length) lines.push('Personal: ' + parts.join(', '));
  }
  lines.push('--- End Oura. Use the above to recommend: training intensity/volume, cardio type/duration, meal timing, and any food adjustments. ---');
  return lines.join('\n');
}

const MAX_ARCHIVED = 80;
const ACHIEVEMENTS = [
  { id: 'first_protocol', name: 'First Steps', description: 'Complete your first protocol', icon: '🎯' },
  { id: 'macro_precision', name: 'Macro Precision', description: 'Hit within 5% of all three macro targets in one protocol', icon: '📊' },
  { id: 'streak_3', name: 'On a Roll', description: 'Complete 3 protocols within 7 days', icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Complete 7 protocols within 14 days', icon: '💪' },
  { id: 'oura_synced', name: 'Data Driven', description: 'Connect Oura and complete a protocol', icon: '💍' },
  { id: 'consistent_5', name: 'Consistent', description: '5 protocols with 80%+ macro accuracy', icon: '✅' },
  { id: 'variety', name: 'All-Rounder', description: 'Complete push, pull, and individual workout types', icon: '🔄' },
  { id: 'stack_master', name: 'Stack Master', description: 'Complete all supplements in a single protocol', icon: '💊' },
  { id: 'early_bird', name: 'Early Bird', description: 'Finalize a protocol before 10:00', icon: '🌅' },
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'level_10', name: 'Veteran', description: 'Reach level 10', icon: '🏆' },
  { id: 'ten_protocols', name: 'Dedicated', description: 'Complete 10 protocols', icon: '📈' },
];

function checkAchievements(archivedProtocols, badges, state) {
  const now = new Date();
  const newUnlocks = [];
  for (const a of ACHIEVEMENTS) {
    if (badges.includes(a.id)) continue;
    let unlocked = false;
    switch (a.id) {
      case 'first_protocol': unlocked = archivedProtocols.length >= 1; break;
      case 'macro_precision': {
        const last = archivedProtocols[archivedProtocols.length - 1];
        if (!last?.targetMacros) break;
        const p = last.actualMacros?.p ?? 0, c = last.actualMacros?.c ?? 0, f = last.actualMacros?.f ?? 0;
        const tp = last.targetMacros.p || 1, tc = last.targetMacros.c || 1, tf = last.targetMacros.f || 1;
        unlocked = Math.abs(p - tp) / tp <= 0.05 && Math.abs(c - tc) / tc <= 0.05 && Math.abs(f - tf) / tf <= 0.05;
        break;
      }
      case 'streak_3': {
        const recent = archivedProtocols.slice(-10).map((x) => new Date(x.date).toDateString());
        const uniq = [...new Set(recent)];
        if (uniq.length < 3) break;
        const sorted = uniq.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
        for (let i = 0; i <= sorted.length - 3; i++) {
          if (sorted[i + 2] - sorted[i] <= 7 * 24 * 60 * 60 * 1000) { unlocked = true; break; }
        }
        break;
      }
      case 'streak_7': {
        const recent = archivedProtocols.slice(-20).map((x) => new Date(x.date).toDateString());
        const uniq = [...new Set(recent)];
        if (uniq.length < 7) break;
        const sorted = uniq.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
        for (let i = 0; i <= sorted.length - 7; i++) {
          if (sorted[i + 6] - sorted[i] <= 14 * 24 * 60 * 60 * 1000) { unlocked = true; break; }
        }
        break;
      }
      case 'oura_synced': unlocked = archivedProtocols.some((x) => x.ouraUsed) && (archivedProtocols[archivedProtocols.length - 1]?.ouraUsed); break;
      case 'consistent_5': {
        const withAccuracy = archivedProtocols.filter((p) => {
          const tp = p.targetMacros || {}; const ap = p.actualMacros || {};
          const pp = tp.p ? (Math.min(1, (ap.p || 0) / tp.p)) : 0;
          const pc = tp.c ? (Math.min(1, (ap.c || 0) / tp.c)) : 0;
          const pf = tp.f ? (Math.min(1, (ap.f || 0) / tp.f)) : 0;
          return (pp + pc + pf) / 3 >= 0.8;
        });
        unlocked = withAccuracy.length >= 5;
        break;
      }
      case 'variety': {
        const types = new Set(archivedProtocols.map((x) => x.workoutType).filter(Boolean));
        unlocked = types.has('push') && types.has('pull') && types.has('individual');
        break;
      }
      case 'stack_master': unlocked = archivedProtocols.some((x) => x.completedSuppsCount >= (x.totalSuppsCount || 1)); break;
      case 'early_bird': unlocked = now.getHours() < 10; break;
      case 'level_5': unlocked = state.level >= 5; break;
      case 'level_10': unlocked = state.level >= 10; break;
      case 'ten_protocols': unlocked = archivedProtocols.length >= 10; break;
      default: break;
    }
    if (unlocked) newUnlocks.push(a.id);
  }
  return newUnlocks;
}

function buildArchiveSummaryForCoach(archivedProtocols) {
  if (!archivedProtocols?.length) return '';
  const last = archivedProtocols.slice(-15);
  const lines = ['--- USER PROTOCOL HISTORY (learn from this for progression and variety) ---'];
  last.forEach((p, i) => {
    const d = p.date ? new Date(p.date).toISOString().slice(0, 10) : '?';
    const title = p.title || 'Protocol';
    const type = p.workoutType || '?';
    const macros = p.targetMacros ? `P${p.targetMacros.p}C${p.targetMacros.c}F${p.targetMacros.f}` : '';
    const hit = p.actualMacros && p.targetMacros
      ? `${Math.round((((p.actualMacros.p || 0) / (p.targetMacros.p || 1)) + ((p.actualMacros.c || 0) / (p.targetMacros.c || 1)) + ((p.actualMacros.f || 0) / (p.targetMacros.f || 1))) / 3 * 100)}% macro`
      : '';
    const exercises = p.exerciseNames?.slice(0, 5).join(', ') || '';
    const feedback = p.coachFeedback ? ` Feedback: ${p.coachFeedback.slice(0, 80)}...` : '';
    lines.push(`${d} | ${title} (${type}) ${macros} ${hit} | ${exercises}${feedback}`);
  });
  lines.push('--- Use history to suggest progression (weights/reps), avoid repeating same exercises too often, and reference past feedback. ---');
  return lines.join('\n');
}

const INITIAL_STATE = {
  step: 'checkin', 
  isSenolyticDay: false,
  retatrutideStatus: { on: false, dosage: 1 }, 
  hghStatus: { on: false, dosage: 1 }, 
  dayType: 'workout', 
  workoutType: 'push', 
  workoutCategories: [], 
  cardio: 'none', 
  energyLevel: 50,
  ouraData: null,
  ouraConnected: false,
  ouraLoading: false,
  ouraError: null,
  xp: 0,
  level: 1,
  dailyWorkout: null,
  completedSupps: [],
  actualMacros: { p: '', c: '', f: '' },
  weightUnit: 'kg',
  setLogs: {},
  exercisePhotos: {},
  coachFeedback: null,
  archivedProtocols: [],
  badges: [],
  newBadgesThisSession: [],
  view: null,
  selectedArchiveId: null
};

const STORAGE_KEY = 'ironmind_v7_state';
const ARCHIVE_KEY = 'ironmind_archive_v1';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const archiveRaw = localStorage.getItem(ARCHIVE_KEY);
    const archive = archiveRaw ? JSON.parse(archiveRaw) : [];
    return { xp: data.xp ?? 0, level: data.level ?? 1, badges: data.badges ?? [], archivedProtocols: Array.isArray(archive) ? archive.slice(-MAX_ARCHIVED) : [] };
  } catch {
    return { xp: 0, level: 1, badges: [], archivedProtocols: [] };
  }
}

function savePersisted({ xp, level, badges, archivedProtocols }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp, level, badges }));
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archivedProtocols || []));
}

const fetchGemini = async (prompt, systemInstruction, imageBase64 = null, imageMimeType = 'image/png') => {
  const payload = {
    contents: [{ 
      parts: [
        { text: prompt },
        ...(imageBase64 ? [{ inlineData: { mimeType: imageMimeType, data: imageBase64 } }] : [])
      ] 
    }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    const msg = result?.error?.message || result?.error?.status || response.statusText || 'API request failed';
    throw new Error(msg);
  }
  if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error(result?.promptFeedback?.blockReasonMessage || "Invalid response from AI");
  }
  return JSON.parse(result.candidates[0].content.parts[0].text);
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [swappingId, setSwappingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { xp, level, badges, archivedProtocols } = loadPersisted();
    setState(prev => ({ ...prev, xp, level, badges, archivedProtocols }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oura = params.get('oura');
    if (oura) {
      window.history.replaceState({}, '', window.location.pathname || '/');
      if (oura === 'error') {
        const msg = params.get('message') || 'Oura connection failed';
        setState(prev => ({ ...prev, ouraError: msg, ouraConnected: false }));
      }
    }
  }, []);

  const fetchOuraStatus = async () => {
    setState(prev => ({ ...prev, ouraLoading: true, ouraError: null }));
    try {
      const statusRes = await fetch('/api/oura/status');
      const status = await statusRes.json();
      if (!status.connected) {
        setState(prev => ({ ...prev, ouraConnected: false, ouraData: null, ouraLoading: false }));
        return;
      }
      const dataRes = await fetch('/api/oura/data');
      const data = await dataRes.json();
      if (dataRes.status === 401) {
        setState(prev => ({ ...prev, ouraConnected: false, ouraData: null, ouraLoading: false }));
        return;
      }
      if (!dataRes.ok) throw new Error(data.error || 'Failed to load Oura data');
      const latest = data.readiness?.[data.readiness.length - 1];
      setState(prev => ({
        ...prev,
        ouraConnected: true,
        ouraData: data,
        ouraLoading: false,
        ouraError: null,
        energyLevel: latest?.score ?? prev.energyLevel,
      }));
    } catch (e) {
      setState(prev => ({ ...prev, ouraLoading: false, ouraError: e.message }));
    }
  };

  useEffect(() => {
    if (state.step === 'checkin') fetchOuraStatus();
  }, [state.step]);

  const saveGlobalState = (xpUpdate, newBadges = [], archiveEntry = null) => {
    const persisted = loadPersisted();
    let { xp, level, badges, archivedProtocols } = persisted;
    xp = xp + (xpUpdate || 0);
    level = Math.floor(xp / 1000) + 1;
    badges = [...new Set([...badges, ...newBadges])];
    if (archiveEntry) {
      archivedProtocols = [...archivedProtocols, archiveEntry].slice(-MAX_ARCHIVED);
    }
    savePersisted({ xp, level, badges, archivedProtocols });
    setState(prev => ({ ...prev, xp, level, badges, archivedProtocols }));
  };

  const generatePlan = async () => {
    setError(null);
    setLoading(true);
    if (!apiKey?.trim()) {
      setError('Add your Gemini API key in src/App.jsx (get one at aistudio.google.com/apikey)');
      setLoading(false);
      return;
    }
    try {
      const oura = state.ouraData && typeof state.ouraData === 'object' && state.ouraData.readiness
        ? state.ouraData
        : null;
      const ouraContext = buildOuraContextForCoach(oura);
      const archiveContext = buildArchiveSummaryForCoach(state.archivedProtocols);
      const prompt = `
        Session Config:
        Goal: 1800 kcal EXACTLY. Focus on fat loss while preserving lean mass.
        Food List ONLY: ${FOOD_LIST}
        Pharma: ${state.retatrutideStatus.on ? `Retatrutide ${state.retatrutideStatus.dosage}mg` : state.hghStatus.on ? `HGH ${state.hghStatus.dosage}IU` : 'None'}
        Focus: ${state.workoutType === 'individual' ? state.workoutCategories.join(', ') : state.workoutType}
        User-reported energy: ${state.energyLevel}%
        Cardio preference for today: ${state.cardio}
        Equipment: ${EQUIPMENT_LIST}
        ${ouraContext ? `\n${ouraContext}\n` : ''}
        ${archiveContext ? `\n${archiveContext}\n` : ''}
        Task: Create a professional bodybuilding plan. Use ALL available Oura data above to tailor:
        - Training: volume, intensity, suggested weights (e.g. "start conservative" or "push hard"), rest between sets.
        - Cardio: type (e.g. LISS, elliptical, steps) and duration based on recovery and activity.
        - Nutrition: 1800 kcal with exact gram weights; meal timing tips (e.g. when to eat relative to workout given sleep/readiness).
        Requirements:
        1. Nutrition total: 1800 kcal. High Protein (~45-50% of calories). Exact WEIGHTS in grams for every solid food.
        2. Meal 1: Whey. Meal 2: Lunch. Meal 3: Dinner. Meal 4: Casein.
        3. In "reasoning" briefly explain how Oura/recovery influenced this plan. In "cardioRecommendation", "nutritionTimingTips", and "intensityNote" give specific, contextual advice.
        
        Return JSON (all string fields required; use empty string if no specific tip):
        {
          "title": "Title",
          "reasoning": "2-3 sentences: how recovery/Oura data shaped this plan.",
          "cardioRecommendation": "Specific cardio for today: type, duration, intensity. Reference Oura if available.",
          "nutritionTimingTips": "When to eat meals relative to workout; any food timing or hydration tips from recovery.",
          "intensityNote": "How to approach today's weights: intensity, RPE, rest, progression.",
          "targetMacros": { "p": 215, "c": 125, "f": 40, "cals": 1800 },
          "nutrition": { 
            "whey": "Timing & g portion", 
            "casein": "Timing & g portion", 
            "meals": ["Specific weights for Lunch", "Specific weights for Dinner"] 
          },
          "exercises": [{ "name": "Ex", "group": "Muscle", "sets": "3", "reps": "12", "notes": "tip", "id": "1" }]
        }
      `;
      const plan = await fetchGemini(prompt, "You are a top-tier bodybuilding coach. Use Oura data to personalize weights, cardio, and nutrition. Precision 1800kcal is mandatory. Return only valid JSON.");
      setState(prev => ({ ...prev, dailyWorkout: plan, step: 'workout', setLogs: {}, exercisePhotos: {} }));
    } catch (err) {
      const message = err?.message || err?.error?.message || String(err);
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSetLogForExercise = (exIdx, ex) => {
    const numSets = Math.max(1, parseInt(ex.sets, 10) || 3);
    const existing = state.setLogs[exIdx] || [];
    const logs = [...existing];
    while (logs.length < numSets) logs.push({ weight: '', reps: '' });
    return logs;
  };

  const updateSetLog = (exIdx, setIdx, field, value) => {
    const ex = state.dailyWorkout?.exercises[exIdx];
    if (!ex) return;
    const logs = getSetLogForExercise(exIdx, ex);
    logs[setIdx] = { ...logs[setIdx], [field]: value };
    setState(prev => ({ ...prev, setLogs: { ...prev.setLogs, [exIdx]: logs } }));
  };

  const setExercisePhoto = (exIdx, file) => {
    if (!file) {
      setState(prev => ({ ...prev, exercisePhotos: { ...prev.exercisePhotos, [exIdx]: null } }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      const base64 = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : null;
      if (base64) setState(prev => ({ ...prev, exercisePhotos: { ...prev.exercisePhotos, [exIdx]: base64 } }));
    };
    reader.readAsDataURL(file);
  };

  const swapExercise = async (idx) => {
    setSwappingId(idx);
    try {
      const ex = state.dailyWorkout.exercises[idx];
      const photoBase64 = state.exercisePhotos[idx] || null;
      const prompt = photoBase64
        ? `The user provided a photo of equipment they have or want to use. Suggest ONE alternative exercise for the same muscle group (${ex.group}) that can be done with the equipment in the photo. Original exercise: ${ex.name}. Return JSON: { "name": "Name", "group": "${ex.group}", "sets": "${ex.sets}", "reps": "${ex.reps}", "notes": "Notes", "id": "${Date.now()}" }`
        : `Swap exercise: ${ex.name} (${ex.group}). Available: ${EQUIPMENT_LIST}. Provide ONE alternative. Return JSON: { "name": "Name", "group": "${ex.group}", "sets": "Sets", "reps": "Reps", "notes": "Notes", "id": "${Date.now()}" }`;
      const newEx = await fetchGemini(prompt, "Exercise swap specialist. Return only valid JSON.", photoBase64, 'image/jpeg');
      const updated = [...state.dailyWorkout.exercises];
      updated[idx] = newEx;
      setState(prev => ({ ...prev, dailyWorkout: { ...prev.dailyWorkout, exercises: updated }, exercisePhotos: { ...prev.exercisePhotos, [idx]: null } }));
    } catch (err) {
      console.error(err);
    } finally {
      setSwappingId(null);
    }
  };

  const connectOura = async () => {
    setState(prev => ({ ...prev, ouraError: null }));
    try {
      const res = await fetch('/api/oura/auth-url');
      const { url, error } = await res.json();
      if (error || !url) throw new Error(error || 'Server not configured');
      window.location.href = url;
    } catch (e) {
      setState(prev => ({ ...prev, ouraError: e.message }));
    }
  };

  const disconnectOura = async () => {
    try {
      await fetch('/api/oura/disconnect', { method: 'POST' });
      setState(prev => ({ ...prev, ouraConnected: false, ouraData: null }));
    } catch (e) {
      setState(prev => ({ ...prev, ouraError: e.message }));
    }
  };

  const toggleSupp = (id) => {
    setState(prev => ({
      ...prev,
      completedSupps: prev.completedSupps.includes(id) 
        ? prev.completedSupps.filter(s => s !== id) 
        : [...prev.completedSupps, id]
    }));
  };

  const buildWorkoutDiary = () => {
    const plan = state.dailyWorkout;
    if (!plan?.exercises) return [];
    return plan.exercises.map((ex, idx) => {
      const numSets = Math.max(1, parseInt(ex.sets, 10) || 3);
      const logs = state.setLogs[idx] || [];
      const sets = Array.from({ length: numSets }, (_, i) => ({
        set: i + 1,
        weight: logs[i]?.weight ? `${logs[i].weight} ${state.weightUnit}` : null,
        reps: logs[i]?.reps || null
      }));
      return { name: ex.name, group: ex.group, targetSets: ex.sets, targetReps: ex.reps, sets };
    });
  };

  const getTotalSuppsCount = () => {
    let n = 0;
    Object.entries(SUPPLEMENT_DATA).forEach(([time, items]) => {
      const filtered = state.isSenolyticDay ? (time === 'senolyticOnly' ? items : items.filter(i => !i.pauseOnSenolytic)) : (time === 'senolyticOnly' ? [] : items);
      n += filtered.length;
    });
    return n;
  };

  const finalizeWithFeedback = async () => {
    const diary = buildWorkoutDiary();
    const hasLogs = diary.some(entry => entry.sets.some(s => s.weight || s.reps));
    if (!hasLogs || !apiKey?.trim()) {
      const archiveEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        title: state.dailyWorkout?.title || 'Protocol',
        workoutType: state.dayType === 'workout' ? state.workoutType : 'rest',
        targetMacros: state.dailyWorkout?.targetMacros,
        actualMacros: { p: state.actualMacros.p, c: state.actualMacros.c, f: state.actualMacros.f },
        exerciseNames: state.dailyWorkout?.exercises?.map(e => e.name) || [],
        coachFeedback: null,
        ouraUsed: state.ouraConnected && !!state.ouraData && typeof state.ouraData === 'object',
        completedSuppsCount: state.completedSupps.length,
        totalSuppsCount: getTotalSuppsCount(),
        setLogsSummary: state.setLogs,
      };
      const persisted = loadPersisted();
      const archivedProtocols = [...persisted.archivedProtocols, archiveEntry].slice(-MAX_ARCHIVED);
      const newBadges = checkAchievements(archivedProtocols, persisted.badges, { ...state, level: Math.floor((persisted.xp + 150) / 1000) + 1 });
      saveGlobalState(150, newBadges, archiveEntry);
      setState(prev => ({ ...prev, step: 'recap', coachFeedback: null, newBadgesThisSession: newBadges }));
      return;
    }
    try {
      const prompt = `You are a bodybuilding coach. Review this workout diary (weights in ${state.weightUnit}) and give brief, actionable feedback: what went well, one or two concrete suggestions to improve next time (progression, form, or load). Keep it under 4 sentences. Return JSON: { "feedback": "Your feedback text here." }
Workout diary:
${JSON.stringify(diary, null, 2)}`;
      const res = await fetchGemini(prompt, "You are a concise, supportive coach. Return only valid JSON.");
      const coachFeedback = res?.feedback || null;
      const archiveEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        title: state.dailyWorkout?.title || 'Protocol',
        workoutType: state.dayType === 'workout' ? state.workoutType : 'rest',
        targetMacros: state.dailyWorkout?.targetMacros,
        actualMacros: { p: state.actualMacros.p, c: state.actualMacros.c, f: state.actualMacros.f },
        exerciseNames: state.dailyWorkout?.exercises?.map(e => e.name) || [],
        coachFeedback,
        ouraUsed: state.ouraConnected && !!state.ouraData && typeof state.ouraData === 'object',
        completedSuppsCount: state.completedSupps.length,
        totalSuppsCount: getTotalSuppsCount(),
        setLogsSummary: state.setLogs,
      };
      const persisted = loadPersisted();
      const archivedProtocols = [...persisted.archivedProtocols, archiveEntry].slice(-MAX_ARCHIVED);
      const newBadges = checkAchievements(archivedProtocols, persisted.badges, { ...state, level: Math.floor((persisted.xp + 150) / 1000) + 1 });
      saveGlobalState(150, newBadges, archiveEntry);
      setState(prev => ({ ...prev, step: 'recap', coachFeedback, newBadgesThisSession: newBadges }));
    } catch {
      const archiveEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        title: state.dailyWorkout?.title || 'Protocol',
        workoutType: state.dayType === 'workout' ? state.workoutType : 'rest',
        targetMacros: state.dailyWorkout?.targetMacros,
        actualMacros: { p: state.actualMacros.p, c: state.actualMacros.c, f: state.actualMacros.f },
        exerciseNames: state.dailyWorkout?.exercises?.map(e => e.name) || [],
        coachFeedback: null,
        ouraUsed: state.ouraConnected && !!state.ouraData && typeof state.ouraData === 'object',
        completedSuppsCount: state.completedSupps.length,
        totalSuppsCount: getTotalSuppsCount(),
        setLogsSummary: state.setLogs,
      };
      const persisted = loadPersisted();
      const archivedProtocols = [...persisted.archivedProtocols, archiveEntry].slice(-MAX_ARCHIVED);
      const newBadges = checkAchievements(archivedProtocols, persisted.badges, { ...state, level: Math.floor((persisted.xp + 150) / 1000) + 1 });
      saveGlobalState(150, newBadges, archiveEntry);
      setState(prev => ({ ...prev, step: 'recap', coachFeedback: null, newBadgesThisSession: newBadges }));
    }
  };

  // --- UI Renders ---

  if (state.step === 'checkin') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 font-sans select-none pb-24">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 uppercase leading-none">IronMind</h1>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Precision Fat Loss: 1800 KCAL</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setState(prev => ({ ...prev, view: 'achievements' }))} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-amber-400 hover:bg-neutral-800 transition-colors" title="Achievements">
              <Trophy size={18} />
            </button>
            <button type="button" onClick={() => setState(prev => ({ ...prev, view: 'history' }))} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sky-400 hover:bg-neutral-800 transition-colors" title="History">
              <History size={18} />
            </button>
            <div className="bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl min-w-[88px]">
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-0.5">
                <Award size={14} /> <span className="text-sm font-black italic">LVL {state.level}</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${((state.xp % 1000) / 1000) * 100}%` }} />
              </div>
              <p className="text-[8px] font-black text-neutral-500 mt-0.5">{state.xp % 1000}/1000 XP</p>
            </div>
          </div>
        </header>

        {state.view === 'achievements' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Trophy size={20} className="text-amber-400" /> Achievements</h2>
              <button type="button" onClick={() => setState(prev => ({ ...prev, view: null }))} className="text-[10px] font-black text-neutral-500 hover:text-white uppercase">Back</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = state.badges.includes(a.id);
                return (
                  <div key={a.id} className={`p-4 rounded-2xl border ${unlocked ? 'bg-amber-500/10 border-amber-500/40' : 'bg-neutral-900/50 border-neutral-800'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{unlocked ? a.icon : '🔒'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black uppercase ${unlocked ? 'text-amber-400' : 'text-neutral-500'}`}>{a.name}</p>
                        <p className="text-[10px] text-neutral-500">{a.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {state.view === 'history' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><History size={20} className="text-sky-400" /> Protocol history</h2>
              <button type="button" onClick={() => setState(prev => ({ ...prev, view: null, selectedArchiveId: null }))} className="text-[10px] font-black text-neutral-500 hover:text-white uppercase">Back</button>
            </div>
            {state.selectedArchiveId ? (() => {
              const p = state.archivedProtocols.find((x) => x.id === state.selectedArchiveId);
              if (!p) return null;
              return (
                <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 space-y-4">
                  <p className="text-[10px] font-black text-neutral-500 uppercase">{new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                  <h3 className="text-xl font-black uppercase">{p.title}</h3>
                  <p className="text-[10px] font-black text-sky-400 uppercase">{p.workoutType} • {p.ouraUsed ? 'Oura synced' : ''}</p>
                  {p.targetMacros && <p className="text-sm text-neutral-400">Target: P{p.targetMacros.p} C{p.targetMacros.c} F{p.targetMacros.f}g</p>}
                  {p.actualMacros && <p className="text-sm text-neutral-400">Logged: P{p.actualMacros.p} C{p.actualMacros.c} F{p.actualMacros.f}g</p>}
                  {p.exerciseNames?.length > 0 && <p className="text-[10px] font-black text-neutral-500 uppercase mt-2">Exercises</p>}
                  <ul className="list-disc list-inside text-sm text-neutral-400">{p.exerciseNames?.map((name, i) => <li key={i}>{name}</li>)}</ul>
                  {p.coachFeedback && <div className="pt-4 border-t border-neutral-800"><p className="text-[10px] font-black text-orange-400 uppercase mb-1">Coach feedback</p><p className="text-sm text-neutral-300">{p.coachFeedback}</p></div>}
                  <button type="button" onClick={() => setState(prev => ({ ...prev, selectedArchiveId: null }))} className="text-[10px] font-black text-sky-400 uppercase">← List</button>
                </div>
              );
            })() : (
              <div className="space-y-3">
                {state.archivedProtocols.length === 0 ? <p className="text-neutral-500 text-sm">No protocols yet. Complete one to see it here.</p> : [...state.archivedProtocols].reverse().map((p) => (
                  <button key={p.id} type="button" onClick={() => setState(prev => ({ ...prev, selectedArchiveId: p.id }))} className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-800/50 transition-colors">
                    <p className="text-sm font-black text-white">{p.title}</p>
                    <p className="text-[10px] text-neutral-500">{new Date(p.date).toLocaleDateString()} • {p.workoutType}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {state.view === null && <div className="space-y-6 max-w-lg mx-auto">
          
          <section className={`p-6 rounded-[2.5rem] border-2 transition-all ${state.isSenolyticDay ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-900/10' : 'bg-neutral-900/50 border-neutral-800'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${state.isSenolyticDay ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}><Dna size={24} /></div>
                <div>
                  <h2 className={`text-sm font-black uppercase tracking-widest ${state.isSenolyticDay ? 'text-red-400' : 'text-neutral-400'}`}>Senolytic Reset?</h2>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Fisetin / Quercetin Mode</p>
                </div>
              </div>
              <button 
                onClick={() => setState(prev => ({ ...prev, isSenolyticDay: !prev.isSenolyticDay, dayType: !prev.isSenolyticDay ? 'rest' : 'workout' }))}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all ${state.isSenolyticDay ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}
              >
                {state.isSenolyticDay ? 'ACTIVE' : 'INACTIVE'}
              </button>
            </div>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-[2rem] space-y-6 shadow-xl">
            <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Activity size={14} /> Pharma Status</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Retatrutide?</span>
              <button 
                onClick={() => setState(prev => ({ ...prev, retatrutideStatus: { on: !prev.retatrutideStatus.on, dosage: 1 }, hghStatus: { on: false, dosage: 1 } }))}
                className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${state.retatrutideStatus.on ? 'bg-blue-600 shadow-md shadow-blue-900/20' : 'bg-neutral-800 text-neutral-500'}`}
              >
                {state.retatrutideStatus.on ? 'ON' : 'OFF'}
              </button>
            </div>
            {state.retatrutideStatus.on && (
              <div className="animate-in fade-in slide-in-from-top-2 p-2 bg-neutral-800/30 rounded-2xl border border-neutral-800">
                <div className="flex justify-between text-[10px] font-black text-neutral-500 uppercase mb-2"><span>1mg</span><span className="text-blue-400 text-lg italic">{state.retatrutideStatus.dosage}mg</span><span>8mg</span></div>
                <input type="range" min="1" max="8" step="1" value={state.retatrutideStatus.dosage} onChange={(e) => setState(prev => ({ ...prev, retatrutideStatus: { ...prev.retatrutideStatus, dosage: Number(e.target.value) } }))} className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none accent-blue-500 cursor-pointer" />
              </div>
            )}

            {!state.retatrutideStatus.on && (
              <div className="pt-4 border-t border-neutral-800 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">HGH Cycle?</span>
                  <button onClick={() => setState(prev => ({ ...prev, hghStatus: { on: !prev.hghStatus.on, dosage: 1 } }))} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${state.hghStatus.on ? 'bg-indigo-600 shadow-md shadow-indigo-900/20' : 'bg-neutral-800 text-neutral-500'}`}>{state.hghStatus.on ? 'ON' : 'OFF'}</button>
                </div>
                {state.hghStatus.on && (
                  <div className="animate-in fade-in slide-in-from-top-2 p-2 bg-neutral-800/30 rounded-2xl border border-neutral-800">
                    <div className="flex justify-between text-[10px] font-black text-neutral-500 uppercase mb-2"><span>1IU</span><span className="text-indigo-400 text-lg italic">{state.hghStatus.dosage}IU</span><span>10IU</span></div>
                    <input type="range" min="1" max="10" step="1" value={state.hghStatus.dosage} onChange={(e) => setState(prev => ({ ...prev, hghStatus: { ...prev.hghStatus, dosage: Number(e.target.value) } }))} className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                  </div>
                )}
              </div>
            )}
          </section>

          {!state.isSenolyticDay && (
            <section className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-[2rem] space-y-6">
              <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2"><Flame size={14} /> Activity</h2>
              <div className="grid grid-cols-2 gap-2">
                {['workout', 'rest'].map(t => (
                  <button key={t} onClick={() => setState(prev => ({ ...prev, dayType: t }))}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${state.dayType === t ? 'bg-orange-600 border-orange-400' : 'bg-neutral-800 border-transparent text-neutral-500'}`}>{t}</button>
                ))}
              </div>

              {state.dayType === 'workout' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-2">
                    {['push', 'pull', 'individual'].map(type => (
                      <button key={type} onClick={() => setState(prev => ({ ...prev, workoutType: type, workoutCategories: [] }))}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${state.workoutType === type ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'}`}>{type}</button>
                    ))}
                  </div>
                  {state.workoutType === 'individual' && (
                    <div className="flex flex-wrap gap-2">
                      {['Chest', 'Back', 'Shoulders', 'Quads', 'Hams', 'Biceps', 'Triceps', 'Abs'].map(cat => (
                        <button key={cat} onClick={()=>{
                          const cats = state.workoutCategories.includes(cat) ? state.workoutCategories.filter(x => x !== cat) : [...state.workoutCategories, cat];
                          setState(prev => ({ ...prev, workoutCategories: cats }));
                        }} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${state.workoutCategories.includes(cat) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>{cat}</button>
                      ))}
                    </div>
                  )}
                  <div className="pt-4 border-t border-neutral-800">
                    <p className="text-[10px] font-black text-neutral-500 uppercase mb-3"><Clock size={12} className="inline mr-1"/> Cardio Block</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['none', 'morning', 'evening', 'both'].map(c => (
                        <button key={c} onClick={() => setState(prev => ({ ...prev, cardio: c }))} className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${state.cardio === c ? 'bg-blue-600 border-blue-400' : 'bg-neutral-800 border-transparent text-neutral-500'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-[2rem] space-y-4">
            <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2"><Zap size={14} /> Readiness</h2>
            <div className="flex justify-between items-end mb-2"><span className="text-3xl font-black text-purple-400 italic">{state.energyLevel}%</span></div>
            <input type="range" min="0" max="100" value={state.energyLevel} onChange={(e) => setState(prev => ({ ...prev, energyLevel: Number(e.target.value) }))} className="w-full h-2 bg-neutral-800 rounded-full appearance-none accent-purple-500 cursor-pointer" />
            <div className="space-y-3">
              {state.ouraError && <p className="text-[10px] font-bold text-red-400 uppercase">{state.ouraError}</p>}
              {state.ouraLoading && <p className="text-[10px] font-black text-neutral-500 uppercase">Checking Oura…</p>}
              {!state.ouraConnected && !state.ouraLoading && (
                <button type="button" onClick={connectOura} className="w-full flex flex-col items-center justify-center border-2 border-dashed border-purple-500/50 rounded-[2rem] p-6 hover:bg-purple-950/20 transition-colors">
                  <HeartPulse className="text-purple-500 mb-1" size={28} />
                  <span className="text-[10px] font-black text-purple-400 uppercase">Connect Oura (real-time)</span>
                  <span className="text-[9px] text-neutral-500 mt-1">Uses readiness, sleep & activity</span>
                </button>
              )}
              {state.ouraConnected && state.ouraData && typeof state.ouraData === 'object' && (
                <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-purple-400 uppercase">Oura connected — coach will use this</span>
                    <button type="button" onClick={disconnectOura} className="text-[9px] font-black text-neutral-500 hover:text-red-400 uppercase">Disconnect</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {state.ouraData.readiness?.length > 0 && (() => {
                      const r = state.ouraData.readiness[state.ouraData.readiness.length - 1];
                      return (
                        <div key="r" className="bg-neutral-900/50 rounded-xl p-3">
                          <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest">Readiness</p>
                          <p className="text-xl font-black text-purple-400">{r?.score ?? '—'}</p>
                          <p className="text-[8px] text-neutral-500">{r?.day ?? ''}</p>
                        </div>
                      );
                    })()}
                    {state.ouraData.sleep?.length > 0 && (() => {
                      const s = state.ouraData.sleep[state.ouraData.sleep.length - 1];
                      const dur = s?.total_sleep_duration ?? s?.sleep_duration;
                      const mins = typeof dur === 'number' ? Math.round(dur / 60) : null;
                      return (
                        <div key="s" className="bg-neutral-900/50 rounded-xl p-3">
                          <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Sleep</p>
                          <p className="text-xl font-black text-sky-400">{s?.score ?? '—'}</p>
                          <p className="text-[8px] text-neutral-500">{mins != null ? `${mins} min` : s?.day ?? ''}</p>
                        </div>
                      );
                    })()}
                    {state.ouraData.activity?.length > 0 && (() => {
                      const a = state.ouraData.activity[state.ouraData.activity.length - 1];
                      const steps = a?.steps ?? a?.daily_movement ?? '—';
                      return (
                        <div key="a" className="bg-neutral-900/50 rounded-xl p-3">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Activity</p>
                          <p className="text-xl font-black text-emerald-400">{a?.score ?? '—'}</p>
                          <p className="text-[8px] text-neutral-500">{typeof steps === 'number' ? `${steps} steps` : steps}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              {!state.ouraConnected && (
                <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-[2rem] p-4 cursor-pointer hover:bg-neutral-900">
                  <Upload className="text-neutral-700 mb-1" size={20} />
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Or upload Oura screenshot (fallback)</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (f) => setState(prev => ({ ...prev, ouraData: f.target?.result?.split(',')[1] }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              )}
            </div>
          </section>

          {error && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/50 text-red-300 text-sm font-medium flex items-start gap-3">
              <span className="shrink-0">⚠️</span>
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-white font-black text-xs uppercase">Dismiss</button>
            </div>
          )}

          <button onClick={generatePlan} disabled={loading} className="w-full bg-white text-black py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] active:scale-95 transition-all disabled:opacity-50 shadow-2xl">
            {loading ? 'Initializing Protocol...' : 'Launch Coach AI'}
          </button>
        </div>}
      </div>
    );
  }

  if (state.step === 'workout') {
    const plan = state.dailyWorkout;
    const targets = plan.targetMacros;
    const actuals = { 
      p: parseInt(state.actualMacros.p, 10) || 0, 
      c: parseInt(state.actualMacros.c, 10) || 0, 
      f: parseInt(state.actualMacros.f, 10) || 0 
    };
    
    const remaining = {
      p: targets.p - actuals.p,
      c: targets.c - actuals.c,
      f: targets.f - actuals.f
    };

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-40">
        <header className="p-8 bg-neutral-900 border-b border-neutral-800 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{plan.title}</h1>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-emerald-500">Target: 1800 KCAL Precision</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setState(prev => ({ ...prev, step: 'checkin', view: 'achievements' }))} className="p-2.5 bg-neutral-800 rounded-xl text-amber-400" title="Achievements"><Trophy size={16} /></button>
              <button type="button" onClick={() => setState(prev => ({ ...prev, step: 'checkin', view: 'history' }))} className="p-2.5 bg-neutral-800 rounded-xl text-sky-400" title="History"><History size={16} /></button>
              <button onClick={() => setState(prev => ({ ...prev, step: 'checkin' }))} className="p-3 bg-neutral-800 rounded-2xl text-neutral-400" title="Back to check-in"><RefreshCw size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-800 p-4 rounded-3xl border border-neutral-700/50">
              <p className="text-[9px] font-black text-neutral-500 uppercase mb-1 tracking-widest">KCAL Limit</p>
              <p className="text-2xl font-black text-white">1800</p>
            </div>
            <div className="bg-neutral-800 p-4 rounded-3xl border border-neutral-700/50">
              <p className="text-[9px] font-black text-neutral-500 uppercase mb-1 tracking-widest">Protein Floor</p>
              <p className="text-2xl font-black text-emerald-400">{targets.p}G</p>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-12">
          {[plan.reasoning, plan.cardioRecommendation, plan.nutritionTimingTips, plan.intensityNote].some((x) => x && String(x).trim()) && (
            <section className="bg-purple-950/30 border border-purple-500/30 p-6 rounded-[3rem] space-y-5 shadow-xl">
              <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2"><HeartPulse size={14} /> Coach insights (from your Oura data)</h2>
              {plan.reasoning?.trim() && (
                <div>
                  <p className="text-[9px] font-black text-purple-500/80 uppercase tracking-widest mb-1">Context</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{plan.reasoning}</p>
                </div>
              )}
              {plan.intensityNote?.trim() && (
                <div>
                  <p className="text-[9px] font-black text-orange-400/90 uppercase tracking-widest mb-1">Training intensity</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{plan.intensityNote}</p>
                </div>
              )}
              {plan.cardioRecommendation?.trim() && (
                <div>
                  <p className="text-[9px] font-black text-sky-400/90 uppercase tracking-widest mb-1">Cardio today</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{plan.cardioRecommendation}</p>
                </div>
              )}
              {plan.nutritionTimingTips?.trim() && (
                <div>
                  <p className="text-[9px] font-black text-emerald-400/90 uppercase tracking-widest mb-1">Food timing</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{plan.nutritionTimingTips}</p>
                </div>
              )}
            </section>
          )}

          <section className="bg-neutral-900 border border-neutral-800 p-8 rounded-[3rem] space-y-8 shadow-2xl">
            <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2"><TrendingUp size={14} /> Live Tracker (Remaining)</h2>
            <div className="grid grid-cols-3 gap-4">
              {['p', 'c', 'f'].map(k => (
                <div key={k} className="space-y-3">
                  <div className="text-center">
                    <p className={`text-lg font-black italic ${remaining[k] < 0 ? 'text-red-500' : 'text-neutral-100'}`}>{remaining[k]}g</p>
                    <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Left</p>
                  </div>
                  <input type="number" value={state.actualMacros[k]} onChange={(e) => setState(prev => ({ ...prev, actualMacros: { ...prev.actualMacros, [k]: e.target.value } }))}
                    className="w-full bg-neutral-800 border-none rounded-xl p-3 text-center font-black text-sm" placeholder="Logged" />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-neutral-900 border border-neutral-800 p-8 rounded-[3rem] space-y-8 shadow-2xl">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Utensils size={14} /> Feeding Protocol (Simple Food)</h2>
            <div className="space-y-6">
              <div className="p-5 bg-neutral-800/50 rounded-2xl border border-neutral-700/20">
                <p className="text-[9px] font-black text-neutral-500 uppercase mb-2 tracking-widest">Meal 1: Fasted / Pre-Workout</p>
                <p className="text-base font-black text-white italic">{plan.nutrition.whey}</p>
              </div>
              <div className="space-y-4">
                {plan.nutrition.meals.map((m, i) => (
                  <div key={i} className="flex gap-4 p-5 bg-neutral-800/20 rounded-2xl border border-neutral-800">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-black text-neutral-500 shrink-0">{i+2}</div>
                    <p className="text-sm text-neutral-300 font-bold leading-relaxed">{m}</p>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-neutral-800/50 rounded-2xl border border-neutral-700/20">
                <p className="text-[9px] font-black text-neutral-500 uppercase mb-2 tracking-widest">Meal 4: Pre-Sleep Reset</p>
                <p className="text-base font-black text-indigo-400 italic">{plan.nutrition.casein}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center gap-2"><Dumbbell size={14} className="text-orange-500" /> Training Execution</h2>
              <div className="flex rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800 p-0.5">
                <button type="button" onClick={() => setState(prev => ({ ...prev, weightUnit: 'kg' }))} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.weightUnit === 'kg' ? 'bg-orange-500 text-black' : 'text-neutral-500'}`}>kg</button>
                <button type="button" onClick={() => setState(prev => ({ ...prev, weightUnit: 'lbs' }))} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.weightUnit === 'lbs' ? 'bg-orange-500 text-black' : 'text-neutral-500'}`}>lbs</button>
              </div>
            </div>
            <div className="space-y-4">
              {plan.exercises.map((ex, idx) => {
                const numSets = Math.max(1, parseInt(ex.sets, 10) || 3);
                const logs = getSetLogForExercise(idx, ex);
                const muscleStyle = getMuscleGroupStyle(ex.group);
                return (
                  <div key={ex.id || idx} className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 relative group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${state.isSenolyticDay ? 'bg-red-500' : muscleStyle.bar} rounded-l-[2rem] opacity-80`}></div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`inline-block px-3 py-1 text-[8px] font-black uppercase rounded-lg mb-2 ${muscleStyle.badge} ${muscleStyle.text}`}>{ex.group}</span>
                        <h3 className="text-xl font-black uppercase tracking-tight">{ex.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="p-3 bg-neutral-800 rounded-2xl text-neutral-500 cursor-pointer hover:text-orange-400 transition-colors">
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setExercisePhoto(idx, f || null); e.target.value = ''; }} />
                          {state.exercisePhotos[idx] ? <ImagePlus size={16} className="text-orange-400" title="Change photo" /> : <Camera size={16} title="Take photo of equipment" />}
                        </label>
                        <button onClick={() => swapExercise(idx)} disabled={swappingId === idx} className="p-3 bg-neutral-800 rounded-2xl text-neutral-500 hover:text-orange-400 transition-colors" title={state.exercisePhotos[idx] ? 'Replace using equipment photo' : 'Replace exercise'}><RefreshCw size={16} className={swappingId === idx ? 'animate-spin' : ''} /></button>
                      </div>
                    </div>
                    {state.exercisePhotos[idx] && (
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-[9px] font-black text-orange-400 uppercase">Photo attached for swap</span>
                        <button type="button" onClick={() => setExercisePhoto(idx, null)} className="text-[9px] font-black text-neutral-500 hover:text-red-400 uppercase">Clear</button>
                      </div>
                    )}
                    <div className="flex gap-4 mb-4 font-black">
                      <div className="bg-neutral-800/50 px-3 py-1 rounded-lg text-xs tracking-widest">{ex.sets} SETS</div>
                      <div className="bg-neutral-800/50 px-3 py-1 rounded-lg text-xs tracking-widest">{ex.reps} REPS</div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-3">Set diary ({state.weightUnit})</p>
                      <div className="space-y-2">
                        {logs.map((log, setIdx) => (
                          <div key={setIdx} className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-neutral-600 w-10">Set {setIdx + 1}</span>
                            <input type="number" inputMode="decimal" placeholder={`Weight (${state.weightUnit})`} value={log.weight} onChange={(e) => updateSetLog(idx, setIdx, 'weight', e.target.value)} className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold placeholder:text-neutral-600" />
                            <input type="number" inputMode="numeric" placeholder="Reps" value={log.reps} onChange={(e) => updateSetLog(idx, setIdx, 'reps', e.target.value)} className="w-20 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold placeholder:text-neutral-600 text-center" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-800 pt-3">{ex.notes}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center gap-2"><HeartPulse size={14} className="text-emerald-500" /> Bio-Stack Checklist</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden">
              {Object.entries(SUPPLEMENT_DATA).map(([time, items]) => {
                let filtered = state.isSenolyticDay 
                  ? (time === 'senolyticOnly' ? items : items.filter(i => !i.pauseOnSenolytic))
                  : (time === 'senolyticOnly' ? [] : items);
                if (filtered.length === 0) return null;
                return (
                  <div key={time} className="border-b last:border-0 border-neutral-800">
                    <div className="bg-neutral-800/50 px-6 py-3 text-[10px] font-black uppercase text-neutral-500 tracking-widest">{time}</div>
                    {filtered.map(item => (
                      <div key={item.id} onClick={() => toggleSupp(item.id)} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all ${state.completedSupps.includes(item.id) ? 'bg-emerald-500/5' : ''}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${state.completedSupps.includes(item.id) ? 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-900/40' : 'border-neutral-700'}`}>
                          {state.completedSupps.includes(item.id) && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${state.completedSupps.includes(item.id) ? 'text-neutral-600 line-through' : ''}`}>{item.name}</p>
                          <p className="text-[9px] font-black text-neutral-500 uppercase">{item.dose} • {item.notes || ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <div className="fixed bottom-10 left-6 right-6 flex items-center justify-center pointer-events-none">
          <button onClick={finalizeWithFeedback}
            className="w-full max-w-sm bg-emerald-600 text-white py-6 rounded-full font-black uppercase tracking-[0.4em] shadow-2xl pointer-events-auto flex items-center justify-center gap-3">
            <Save size={20} /> Finalize Protocol
          </button>
        </div>
      </div>
    );
  }

  if (state.step === 'recap') {
    const targets = state.dailyWorkout.targetMacros;
    const actuals = { p: parseInt(state.actualMacros.p, 10) || 0, c: parseInt(state.actualMacros.c, 10) || 0, f: parseInt(state.actualMacros.f, 10) || 0 };
    const actualCals = (actuals.p * 4) + (actuals.c * 4) + (actuals.f * 9);
    
    const MacroBar = ({ label, cur, tar, col }) => (
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-black uppercase text-neutral-500 tracking-widest"><span>{label}</span><span>{cur}/{tar}g</span></div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden shadow-inner"><div className={`h-full ${col} shadow-lg shadow-black/20`} style={{ width: `${Math.min((cur/tar)*100, 100)}%` }}></div></div>
      </div>
    );

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="max-w-md w-full space-y-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="inline-block p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500 shadow-2xl animate-bounce"><CheckCircle2 size={64} /></div>
          <div><h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none mb-4">Day Logged</h1><p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.5em]">Neuro-Muscular Log Synced</p></div>
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[3.5rem] space-y-8 text-left shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2"><Target size={14} /> Protocol Accuracy</h2>
            <div className="space-y-6">
              <MacroBar label="Protein" cur={actuals.p} tar={targets.p} col="bg-emerald-500" />
              <MacroBar label="Carbohydrates" cur={actuals.c} tar={targets.c} col="bg-blue-500" />
              <MacroBar label="Fats" cur={actuals.f} tar={targets.f} col="bg-orange-500" />
            </div>
            <div className="pt-8 border-t border-neutral-800 flex justify-between items-center">
              <div><p className="text-[10px] font-black text-neutral-600 uppercase mb-1 tracking-widest">Energy Balance</p><p className="text-3xl font-black italic tracking-tighter">{actualCals} KCAL</p></div>
              <div className={`px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest ${actualCals <= 1800 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
                {actualCals <= 1800 ? 'Precision Deficit' : 'Growth Surplus'}
              </div>
            </div>
          </div>
          {state.coachFeedback && (
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-[2.5rem] space-y-4 text-left">
              <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] flex items-center gap-2">Coach feedback</h2>
              <p className="text-sm text-neutral-300 leading-relaxed">{state.coachFeedback}</p>
            </div>
          )}
          {state.newBadgesThisSession?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-[2.5rem] space-y-3">
              <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2"><Sparkles size={14} /> New achievements</h2>
              {state.newBadgesThisSession.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                return a ? <div key={id} className="flex items-center gap-3"><span className="text-2xl">{a.icon}</span><div><p className="text-sm font-black text-amber-400">{a.name}</p><p className="text-[10px] text-neutral-500">{a.description}</p></div></div> : null;
              })}
            </div>
          )}
          <button onClick={() => setState({ ...INITIAL_STATE, xp: state.xp, level: state.level, badges: state.badges, archivedProtocols: state.archivedProtocols })} className="w-full bg-neutral-800 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] border border-neutral-700 shadow-xl active:scale-95 transition-all">Start New Protocol</button>
        </div>
      </div>
    );
  }

  return null;
}
