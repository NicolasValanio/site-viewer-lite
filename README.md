# Site Viewer Lite — starter kit

Data for the take-home. Read the brief first; it has the full task and the rules.

```
data/users.json            three users and their bearer tokens (one staff, two clients)
data/projects.json         three projects; `internal` must NEVER leave the server
data/spaces/<id>.json      rooms as boxes: x, y, z = min corner in metres (Z up), w, d, h = size
tools/make-cloud.js        writes data/clouds/<id>.pts in the PTS1 format below
```

Generate the clouds once (Node 18+):

```
node tools/make-cloud.js 1201-30001            # 2,000,000 points, ~30 MB
node tools/make-cloud.js 1201-30002 400000
node tools/make-cloud.js 1201-30001 2000000 --truncate   # a cut-off file, for your error handling
```

## PTS1 format (little-endian)

| Bytes | Type | Meaning |
|---|---|---|
| 0–3 | ASCII | magic `PTS1` |
| 4–7 | uint32 | point count N |
| 8–11 | float32 | point spacing in metres |
| 12–15 | uint32 | reserved |
| then N × 16 | float32 x, y, z · uint8 r, g, b, intensity | one point |

Authentication: `Authorization: Bearer <token>` from `users.json`. No login screen is needed; a token picker is fine.
