# Little Tide

Four playful 3D worlds to explore in your browser, built with Three.js.

- **[Beach World](https://brendansudol.github.io/little-tide/)** — walk along the shore, swim with shrimp, and pet friendly stingrays.
- **[Candy World](https://brendansudol.github.io/little-tide/candy/)** — explore lollipop forests and bounce on marshmallows.
- **[Impossible Golf](https://brendansudol.github.io/little-tide/golf/)** — six holes connected by underground tubes, with a spinning golf-club windmill that sends you flying.

- **[Pepperoni Panic](https://brendansudol.github.io/little-tide/pepperoni/)** — slide across tomato sauce on a giant pizza while pepperoni walls close in and open again.

## Play

Use **WASD / arrow keys** to move, **drag** to look, **scroll / pinch** to zoom, and **Space** to jump. Press **E** for nearby interactions. On a phone, use the joystick, jump button, and contextual action button. Open **Menu** for controls, world navigation, and optional map/progress panels.

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

GitHub Actions publishes `dist/` to GitHub Pages after each push to `main`. You can also run the deployment manually from the Actions tab. The workflow checks golf movement, tube routes, re-entry, and windmill launches before publishing.

The files use relative paths so the same site works at a domain root or beneath a repository path. `.openai/hosting.json` supports the separate OpenAI Sites deployment.

## Third-party code

Three.js is vendored in `dist/vendor/`. Its MIT license is included in `dist/vendor/THREE-LICENSE.txt`.
