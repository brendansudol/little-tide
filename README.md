# Little Tide

Eleven playful 3D worlds to explore in your browser, built with Three.js.

- **[Beach World](https://brendansudol.github.io/little-tide/)** — walk along the shore, swim with shrimp, and pet friendly stingrays.
- **[Candy World](https://brendansudol.github.io/little-tide/candy/)** — explore lollipop forests and bounce on marshmallows.
- **[Impossible Golf](https://brendansudol.github.io/little-tide/golf/)** — six holes connected by underground tubes, with a spinning golf-club windmill that sends you flying.

- **[Pepperoni Panic](https://brendansudol.github.io/little-tide/pepperoni/)** — slide across tomato sauce on a giant pizza while pepperoni walls close in and open again.

- **[Triple Basket](https://brendansudol.github.io/little-tide/gym/)** — climb the gym walls and chase three moving hoops; a cannon scores a basket, then the ball bumps you back to the court.

- **[Tissue World](https://brendansudol.github.io/little-tide/tissue/)** — drive a rolled-tissue car, cross a flowing tissue river, outrun Sniffles, and take a giant hand’s flick-and-catch ride.

- **[Math World](https://brendansudol.github.io/little-tide/math/)** — meet six friendly 3D numbers, solve elementary math puzzles, and collect little prizes with confetti celebrations.

- **[Halloween World](https://brendansudol.github.io/little-tide/halloween/)** — explore a haunted house with friendly ghosts, jump over the scarecrow’s rolling pumpkins, and nibble a giant pumpkin pie.

- **[Bakery World](https://brendansudol.github.io/little-tide/bakery/)** — become the head baker: catch flying cookies, decorate cakes to order, taste five pastries, bounce on magical dough, and get whisked into the mixer for a flight out of the bakery.

- **[Space World](https://brendansudol.github.io/little-tide/space/)** — steer your jetpack freely between eight walkable toy planets and touch down anywhere, collect stardust, dodge New Moon’s meteors, and take a silly, scorching detour to the sun. A cooling comet brings you safely back. Fly to and land on New Moon to aim his asteroids at the sun: eight hits shrink it into darkness. Explore by helmet light, then bring back the sunshine to play again.

- **[Car World](https://brendansudol.github.io/little-tide/car/)** — hop in a peach convertible, weave through a timed cone course, splash through mud and a bubbly car wash, wave to friendly drivers, and stop for a vegan breakfast sandwich. Hop out anytime to explore on foot.

## Play

Use **WASD / arrow keys** to move, **drag** to look, **scroll / pinch** to zoom, and **Space** to jump. Press **E** for nearby interactions. On a phone, use the joystick, jump button, and contextual action button. Open **Menu** for controls, world navigation, and optional map/progress panels.

In Car World, **tap or click the ground** to drive to a destination along a dotted route. The car goes around the café and wash walls and parks on arrival. **Stop here**, the brake, or manual controls cancel the route; dragging/pinching still controls the view. To drive yourself, point the **joystick, WASD, or arrow keys** where you want to go on the screen. The car turns automatically, slows for tight turns, and stops when you let go. Push the joystick gently to creep along. **Space** is an extra brake, **E** enters/exits the car, and **H** honks or waves.

## Run locally

No install or build step is required. Serve the static directory:

```sh
python3 -m http.server 5173 --directory dist
```

Open http://localhost:5173/ in a browser with WebGL enabled.

## Check game logic

```sh
node --test tests/*.test.mjs
```

## Deployment

GitHub Actions publishes `dist/` to GitHub Pages after each push to `main`. You can also run the deployment manually from the Actions tab. The workflow checks game rules, including movement, rides, cannon shots, and math answers and rewards before publishing.

The files use relative paths so the same site works at a domain root or beneath a repository path. `.openai/hosting.json` supports the separate OpenAI Sites deployment.

## Third-party code

Three.js is vendored in `dist/vendor/`. Its MIT license is included in `dist/vendor/THREE-LICENSE.txt`.
