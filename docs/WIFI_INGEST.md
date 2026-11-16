# WiFi live ingest (LAN)

Point a phone companion, watch bridge, or mock generator at the PC so VITALIS receives vitals over WiFi. The phone UI shows a **WiFi / Live** reception indicator that pulses when packets arrive.

## 1. Bind the API for LAN clients

On the PC (same Wi‑Fi as the phone):

```bash
cd backend
source .venv/bin/activate   # or your venv
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` is required so devices on the LAN can reach the PC. Find the PC IP (e.g. `ip addr` / `ifconfig` / Windows `ipconfig`), e.g. `192.168.1.42`.

Start the frontend as usual (`npm run dev` in `frontend/`). On a phone browser you can open the Vite URL with the PC IP, or keep the UI on the PC and only send ingest from the phone.

## 2. Post vitals

`POST http://<PC_IP>:8000/api/ingest/watch`

```json
{
  "device": "galaxy_watch",
  "hr": 72.0,
  "spo2": null,
  "temp": 36.5,
  "hrv_rmssd": 44.0,
  "artifact": false
}
```

Missing sensors stay **`null`** — the bridge never invents ECG, continuous SpO₂, BP, or respiration.

Status: `GET http://<PC_IP>:8000/api/ingest/watch/status` → `connected`, `receiving`, `source`, `last_sync`, `receive_count`.

## 3. Demo without a watch

```bash
cd backend
python scripts/watch_mock_generator.py
# or from another machine on the LAN:
python scripts/watch_mock_generator.py --url http://192.168.1.42:8000/api/ingest/watch
```

Within about a second the UI indicator switches from **Simulator** to **WiFi · Live** and pulses while packets keep arriving. When the generator stops, the stream falls back to the local simulator.

## 4. What you should see

- Compact reception chip near the status bar (not a stats dump in the hero).
- Pulse / “Receiving” while `receiving` is true.
- Last sync time when a packet has landed.
- ECG/PPG scope blanked while WiFi is live (honest: no fake wrist waveforms).
