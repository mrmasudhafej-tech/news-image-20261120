# THE WORLD TODAY — Friday 20 November 2026

[![news-image-20261120](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/mrmasudhafej-tech/news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/mrmasudhafej-tech/news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120)

A newspaper front page that sums up the world's news of **Friday 20 November 2026** in one image, drawn from scratch in Node 22 (standard library only) — a hand-written 5×7 bitmap font, a small canvas library, and a from-scratch PNG encoder.

## The day's stories

- **Russia rains missiles on Kyiv** — overnight mass missile attack; fires in homes in Obolonskyi and Podilskyi, an infrastructure site hit in Holosiivskyi (Reuters, Kyiv Independent)
- **Cyclone Akvan slams Odisha** — landfall near Gopalpur at noon, winds to 110 km/h, over 120,000 people evacuated (NDTV / IMD)
- **Tanker ablaze after mine blast** — a tanker caught fire east of the Strait of Hormuz after striking a mine (Daily Baku)
- **Drones shut Genoa airport** — flights suspended after unidentified drones were seen over the airport (Daily Baku)
- **Houthis hit four Saudi targets** — drone and missile strikes claimed on four targets in Saudi Arabia (TASS)
- **Meta rethinks net-zero goal** — "reevaluating" its 2030 target as its AI buildout grows (Bangkok Post)
- **US auctions first deep-sea leases** — despite a court ruling (Bangkok Post)
- **Europe ready for Russia talks** — leaders in Berlin say they are ready for talks on Ukraine (BBC)

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/entry.png` (1024×1024, deterministic — two runs produce identical bytes). No network at runtime.

## License

MIT — see [LICENSE](LICENSE).
