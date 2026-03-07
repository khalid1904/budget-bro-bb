

## Plan: Update Avatar Emojis to Mixed Fun & Professional Set

**File: `src/lib/types.ts`** — Replace `AVATAR_PRESETS` array with:

```ts
export const AVATAR_PRESETS = [
  '👨‍💼', '👩‍💻', '👨‍⚕️', '👩‍🔬', '👨‍🎨', '👩‍🚀',
  '🧑‍🍳', '👷', '🕵️', '🦸', '👨‍✈️', '👩‍🎤',
  '🧑‍🎓', '👩‍⚖️', '🥷', '🧙', '👨‍🏫', '👩‍🚒',
  '🧑‍🔧', '👨‍🌾', '🤵', '👰', '🏃', '🧘',
];
```

No other files need changes — the `Profile.tsx` page already reads from this constant.

