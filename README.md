# solmar-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/zelotadonia-lang/solmar-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/zelotadonia-lang/solmar-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Heat is a top-down open-world crime game set in Port Solmar, a sun-baked coastal city of your own. You play Rook, fresh out of prison and in debt. Work for Marina and Dario, or make your own money on the streets.

The city has 8 by 5 blocks of roads, buildings, a park, a beach, and a harbour, with traffic that stops at red lights and pedestrians who walk the sidewalks and run from danger. Steal cars and drive them, build a wanted level, and lose the police who come after you. Three story missions pay $150, $250, and $300: deliver a package for Marina, steal a yellow sedan guarded by an armed thug, then outrun a three-star police chase to the south beach. Taxi fares on the side pay by distance against the clock.

Combat is fists, a pistol with limited ammo, and whatever your car hits. The HUD shows money, health, armor, ammo, wanted stars, the clock, your current objective with its distance, and a live minimap of the whole city. Progress saves to the browser automatically, and every sound, from engines to sirens, is generated in code. Nothing is downloaded: the game is plain static files, no libraries, no network requests, and it runs offline.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## Controls

- WASD or arrow keys: walk. Shift: run.
- E: steal or leave a car.
- Space or F: punch. Mouse click: shoot.
- T: start a taxi fare near a waiting passenger.
- P or Esc: pause. Enter: confirm.

## Screenshots

- `screenshots/1-start.jpg` — title screen over the living city.
- `screenshots/2-drive.jpg` — driving with a two-star wanted level and police closing in.
- `screenshots/3-mission.jpg` — mission 1 in progress, with the objective, dialogue, and minimap.
- `screenshots/4-foot.jpg` — on foot in a busy street at midday.

---

<sub>Entered on [make.fun](https://make.fun/?ref=yk7ez00m&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
