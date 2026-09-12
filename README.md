# LearnX Premium Learning OS

GitHub Pages-ready static learning dashboard.

## Media map
- `assets/intro.mp4` — INTRO 9:16, shown only after biometric simulation.
- `assets/dashboard-base.mp4` — dashboard base animation (blonde anime visual), shown only inside Dashboard.
- `assets/intro-poster.jpg` and `assets/dashboard-base-poster.jpg` — loading posters.

## Flow
1. Simulated fingerprint gate.
2. 9:16 intro video.
3. `Berikutnya` appears only after intro ends.
4. Dashboard opens.
5. Soft welcome voice: `Hello everyone, welcome to LearnX`.
6. Dashboard animation is already playing muted during the greeting, then its own audio is enabled after the greeting to avoid overlap.

## IQ
Each session generates a new set of randomized questions and stores recent question signatures locally to reduce repeats across sessions. The result is a reasoning practice score, not a clinical IQ measurement.
