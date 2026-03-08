# Key Insights: Spotify

## Insight 1: Multi-CDN Over Own CDN -- When File Size Dictates Architecture

**Category:** Cost Optimization
**One-liner:** Audio files averaging ~4 MB make multi-CDN (Akamai, Fastly, GCP CDN) economically rational, unlike video platforms where 100x larger files justify building a private CDN.

**Why it matters:** Netflix invested $1B+ in Open Connect because video files are gigabytes and bandwidth costs at their scale make third-party CDNs prohibitively expensive. Spotify's audio files are three orders of magnitude smaller (~4 MB per song vs ~2 GB per video episode), making CDN transit costs far lower per stream. Multi-CDN provides CDN-level redundancy (failover from Akamai to Fastly on timeout), geographic flexibility, and zero hardware investment -- all without the operational burden of managing custom appliances in ISP networks. The decision framework is clear: when content_size * daily_streams * cdn_cost_per_gb exceeds the amortized cost of building and operating your own CDN, build your own. Spotify's arithmetic lands firmly on the "buy" side. This insight generalizes to any system deciding between building custom infrastructure versus composing third-party services.

---

## Insight 2: CRDT for Playlist Sync -- Choosing Data Preservation Over Simplicity

**Category:** Distributed Transactions
**One-liner:** Use Conflict-free Replicated Data Types (CRDTs) with version vectors for collaborative playlists because last-write-wins would silently discard offline edits.

**Why it matters:** Spotify playlists are edited offline (on planes, in subways) and collaboratively (shared playlists with friends), creating a problem space where changes from multiple sources must merge without data loss. Last-write-wins would silently drop Alice's offline additions when Bob's later edit arrives. Operational Transform (Google Docs approach) requires a centralized server and real-time connectivity. CRDTs solve both constraints: each client maintains a version vector, operations are commutative and associative, and merging is deterministic regardless of arrival order. The trade-off is eventual consistency -- a playlist might briefly show different orderings on different devices before converging. For playlists (not financial transactions), this is acceptable. The conflict resolution rules (remove wins over concurrent add, position conflicts resolved by timestamp then user_id) are deliberately conservative, preferring a slightly surprising order over lost tracks.

---

## Insight 3: Track-Boundary Quality Switching Over Mid-Stream ABR

**Category:** Streaming
**One-liner:** Switch audio quality at track boundaries (every 3-5 minutes) rather than mid-stream, because mid-track quality shifts are far more perceptible in audio than in video.

**Why it matters:** Video ABR (HLS/DASH) aggressively switches quality mid-stream using 2-10 second segments because visual quality changes during fast-motion scenes are barely noticeable. Audio is fundamentally different: a bitrate drop from 320 kbps to 96 kbps mid-song produces an immediately jarring artifact -- like switching from a concert hall to a phone speaker. Spotify's approach is simpler and better suited to its medium: select quality at track start based on current bandwidth, then download the whole track (~4 MB). If bandwidth drops during download, the 30-second buffer target provides time to complete the transfer. Prefetching the next track (starting when 30 seconds remain in the current track) enables seamless transitions with ~0 gap. The lesson is that ABR strategies must be adapted to the perception characteristics of the medium, not blindly copied from video.

---

## Insight 4: Jittered Key Expiry to Prevent DRM Refresh Storms

**Category:** Traffic Shaping
**One-liner:** Add a random offset of plus or minus 3 days to the 30-day DRM key expiry to prevent millions of users from hitting the key refresh endpoint simultaneously.

**Why it matters:** If all users who downloaded tracks in the same week have keys expire on the same day, the DRM service faces a thundering herd of refresh requests when those users come online. The fix is elegant: instead of a fixed 30-day TTL, use 27-33 days (uniform random). This spreads the refresh load across a 6-day window, reducing peak refresh QPS by approximately 6x. Additionally, keys are refreshed silently in the background when the app is open (not triggered by expiry), and a batch API refreshes all keys in a single request rather than per-track. These three mitigations (jittered expiry, background refresh, batch API) transform a predictable thundering herd into smooth, continuous background load. This pattern applies to any system with periodic token/certificate renewal at scale.

---

## Insight 5: Ogg Vorbis as a Licensing and Quality Optimization

**Category:** Cost Optimization
**One-liner:** Choose Ogg Vorbis over MP3 because it delivers equivalent perceived quality at 20% lower bitrate with zero licensing fees -- a compounding cost advantage at 713M MAU.

**Why it matters:** MP3 was historically burdened with patent licensing fees (expired 2017 but Spotify chose Vorbis in 2008), while Ogg Vorbis is fully open source. More importantly, Vorbis achieves perceptually equivalent quality to MP3 at lower bitrates: Vorbis at 128 kbps matches MP3 at 160 kbps, and Vorbis performs significantly better at low bitrates (<96 kbps) critical for data-saver modes in bandwidth-constrained markets like India and Southeast Asia. The trade-off is device compatibility -- MP3 plays everywhere while Ogg Vorbis requires a decoder (which Spotify bundles in its app). Since Spotify controls the playback client on every platform, universal codec support is irrelevant; what matters is quality-per-byte and cost-per-stream. For web playback (where bundling a decoder is harder), Spotify falls back to AAC at 256 kbps.

---

## Insight 6: BaRT -- Treating Recommendations as Multi-Armed Bandits

**Category:** Data Structures
**One-liner:** Frame each recommendation slot as a bandit arm with Thompson Sampling to continuously balance exploration (surfacing unknown tracks) against exploitation (recommending known preferences).

**Why it matters:** Traditional recommendation systems train a model offline and serve static rankings until the next retraining cycle. BaRT (Bandits for Recommendations as Treatments) treats the problem as online learning: each recommendation is a "treatment" with an uncertain reward, and Thompson Sampling draws from posterior distributions to decide what to recommend. This naturally balances exploration and exploitation -- a track with high uncertainty (few observations) gets sampled occasionally even if its expected reward is lower than a well-known track. The multi-task model predicts multiple reward signals (play, skip, save) simultaneously, and the 150K candidates are funneled through collaborative filtering, content-based features, and popularity signals before BaRT scores them. The key advantage over static models is adaptation speed -- BaRT responds to shifting user preferences within sessions, not training cycles.

---

## Insight 7: Pre-Warming CDN for Predictable Demand Spikes

**Category:** Caching
**One-liner:** Push high-profile album releases to CDN edges 24 hours before the drop to convert a thundering herd cache miss storm into a cache hit.

**Why it matters:** When Taylor Swift drops an album at midnight, millions of users request the same new tracks simultaneously. Without pre-warming, every request is a cache miss that hits the origin (Cloud Storage), creating a cascade: origin overload, latency spikes, timeouts, retry storms. Pre-warming pushes the encoded audio files to all CDN edge nodes 24 hours before release, so the first real user request is a cache hit. The challenge is knowing which releases to pre-warm -- Spotify solves this with release calendar data from labels plus social media signal analysis. For releases that aren't pre-warmed, the origin shield layer (intermediate cache) coalesces concurrent misses into a single origin fetch, and graceful degradation serves lower-quality encodings if the highest bitrate isn't yet cached. This is the audio equivalent of Netflix's proactive caching, but applied selectively rather than catalog-wide.

---

## Insight 8: Device-Bound DRM with Three-Layer Key Hierarchy

**Category:** Security
**One-liner:** Encrypt content with a per-track Content Encryption Key, wrap it with the device's public key for transport, then wrap it again with a hardware-derived key for local storage -- ensuring tracks are unplayable on any other device.

**Why it matters:** Offline mode is a premium feature that must prevent download-and-share piracy while remaining frictionless for legitimate users. The three-layer key hierarchy achieves this: (1) a master key in an HSM generates per-track Content Encryption Keys (CEKs), (2) each CEK is encrypted with the target device's RSA public key for secure transport, and (3) the device wraps the decrypted CEK with a hardware-derived key (iOS Keychain, Android TEE) for local storage. Extracting the key requires compromising the device's hardware security module -- a far higher bar than extracting an unprotected file. The 30-day re-authentication window forces periodic subscription verification while being long enough for vacations and flights. The 5-device and 10,000-track limits prevent abuse while accommodating typical usage patterns.

---

## Insight 9: Loudness Normalization at -14 LUFS

**Category:** Streaming
**One-liner:** Normalize all audio to -14 LUFS during ingestion so that users never need to adjust volume between tracks, regardless of how the original was mastered.

**Why it matters:** Without normalization, a quietly mastered jazz track followed by a loudness-war-compressed pop track would cause a jarring volume jump, forcing the user to reach for volume controls. Normalizing to -14 LUFS (the EBU R128 broadcast standard) during the encoding pipeline ensures consistent perceived loudness across all 100M+ tracks. This is done per-track at ingest time, not at playback, meaning the encoded files already have the correct loudness level. The -14 LUFS target is a deliberate choice: it's high enough for comfortable listening but low enough to preserve dynamic range in well-mastered content. This preprocessing step is invisible to users but fundamentally shapes the listening experience -- it's why Spotify playlists mixing genres and decades sound cohesive without manual intervention.
