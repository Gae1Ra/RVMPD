# VITALIS Companion (native Android)

Phone companion for a **real Samsung Galaxy Watch**. Reads watch-synced vitals through **official Health Connect** (not Samsung private APIs) and POSTs aggregates to FastAPI `POST /api/ingest/watch`.

**Decision support, not a medical diagnosis.**

UI mockups (generated for docs; open the project in Android Studio for a live build):

| Idle | Syncing |
|---|---|
| See store `media/android-companion/companion-ui-idle.jpg` | See store `media/android-companion/companion-ui-syncing.jpg` |

## Requirements

| Item | Value |
|---|---|
| Min SDK | **28** (Android 9) |
| Target / compile SDK | 35 |
| Language | Kotlin |
| Health API | `androidx.health.connect:connect-client` |
| Backend | VITALIS FastAPI with Galaxy Watch ingest (PR #8 / `galaxy_watch` scenario) |

**Hardware:** Samsung Galaxy Watch (Wear OS) paired to an Android phone that can run Health Connect + this app.

## Phone-only Health Connect path (preferred)

```
Galaxy Watch ──BT──► Samsung Health (phone)
                           │  (user enables Health Connect sharing)
                           ▼
                    Health Connect
                           │  READ_HEART_RATE (+ SpO₂ / skin temp / HRV when present)
                           ▼
                 VITALIS Companion (this app)
                           │  POST /api/ingest/watch
                           ▼
                 FastAPI ──WS /ws──► VITALIS UI (Galaxy Watch demo mode)
```

No on-watch Wear module is required for the contest path when Samsung Health already writes HR (and occasional SpO₂ / temp) into Health Connect.

### When a Wear OS on-watch app *would* be needed

Add a minimal `wear` module **only if** you need continuous / higher-rate HR that Health Connect does not receive from Samsung Health (OEM sync gaps, battery modes that stop phone writes, or demo without Samsung Health sharing). Wear Health Services can sample on-device and push via the Data Layer to the phone companion. This repo ships the **working phone companion first** and intentionally omits a Wear module until that gap is proven on your watch model.

## Open in Android Studio

1. Install [Android Studio](https://developer.android.com/studio) (Ladybug+ recommended).
2. **File → Open** → select `android/vitalis-companion/` (this folder).
3. Let Gradle sync. If prompted, create `local.properties` from `local.properties.example` with your `sdk.dir`.
4. Connect a physical phone (USB debugging) or an emulator **with Play Store** (Health Connect needs a real provider on device).
5. Run the `app` configuration.

First sync downloads the Android Gradle Plugin and dependencies; an Android SDK + platform 35 must be installed via SDK Manager.

## Health Connect setup (phone + watch)

1. **Pair** the Galaxy Watch with the phone (Galaxy Wearable / Watch app).
2. Install / open **Samsung Health** on the phone; confirm the watch is syncing heart rate.
3. Install **Health Connect** (Play Store) if the phone does not ship it as a system app (Android 14+ often does).
4. In Samsung Health (or Health Connect “App permissions” / “Data and access”): allow Samsung Health to **write** heart rate (and SpO₂ / skin temperature when offered) to Health Connect.
5. Open **VITALIS Companion** → **Grant Health Connect** → allow at least **Heart rate** read. SpO₂ / skin temp / HRV are optional and stay `null` when missing.
6. Wear the watch for a minute so a recent HR sample exists.

## Point at your PC backend

1. On the PC, start VITALIS so the phone can reach it on the LAN:

   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. Find the PC LAN IP (`ipconfig` / `ip a`), e.g. `192.168.1.42`.
3. In the companion UI, set **Backend base URL** to `http://192.168.1.42:8000` (saved in SharedPreferences).
4. Phone and PC must be on the same Wi‑Fi; allow port 8000 through the PC firewall.
5. Tap **Start sync**. The foreground service polls Health Connect ~1 Hz and POSTs JSON matching the ingest contract.

### Ingest body shape

```json
{
  "device": "galaxy_watch",
  "t_device": "2026-11-15T19:20:00Z",
  "hr": 72.0,
  "spo2": null,
  "temp": null,
  "hrv_rmssd": null,
  "sqi": { "hr": 0.9, "spo2": null, "temp": null, "hrv_rmssd": null },
  "artifact": false,
  "permissions": ["READ_HEART_RATE"]
}
```

Missing sensors are **`null`** — never invented.

## See data in the VITALIS Galaxy Watch demo UI

1. Keep the companion syncing (notification: “VITALIS watch sync”).
2. Open the frontend (same LAN or on the PC): enable **Galaxy Watch demo** (or `?source=galaxy_watch` / scenario `galaxy_watch`).
3. Confirm `GET http://<PC>:8000/api/ingest/watch/status` shows `"connected": true` and a recent `last_sync`.
4. The UI should show last HR (and SpO₂ / skin temp when the watch actually provided samples). ECG/PPG scopes stay blanked in this mode by design.

## Honest limits

| Claim | Reality |
|---|---|
| Raw ECG / PPG waveforms | **Not available** to third-party apps; we never invent them |
| Continuous SpO₂ | Often **occasional** only; UI shows a value only when Health Connect has a sample |
| Clinical BP / RR from watch | **Out of scope** |
| Diagnosis | **No** — VITALIS is decision support only |
| Samsung private APIs | **Not used** |
| Samsung Health Data SDK | Optional later for Samsung-only metrics Health Connect lacks; not required for HR demo |

## Project layout

```
android/vitalis-companion/
  app/src/main/java/com/vitalis/companion/
    ui/MainActivity.kt          # status, last HR, last sync, start/stop, base URL
    service/WatchSyncService.kt # foreground Health Connect → POST loop
    health/HealthConnectReader.kt
    net/IngestClient.kt
    data/CompanionPrefs.kt      # SharedPreferences base URL
  README.md
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Health Connect not installed | Play Store → Health Connect; Android 14+ may need Settings → Health Connect |
| No samples | Watch worn; Samsung Health sync; HC write permissions for Samsung Health |
| POST failed | PC `--host 0.0.0.0`, correct LAN IP, same Wi‑Fi, firewall |
| UI still on simulator | Toggle **Galaxy Watch demo** / scenario `galaxy_watch` |

Design reference: project store doc `docs/samsung-watch-bridge.md` and repo `docs/CONTRACT.md` (Galaxy Watch ingest appendix).
