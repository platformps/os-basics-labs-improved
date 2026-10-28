# Operating Systems Basics: Accessible Labs (improved version)

Test copy of the accessible Operating Systems Basics labs with two improvements over the main site at https://platformps.github.io/os-basics-labs/:

1. Steps lists no longer trap screen reader arrow keys (reported by a learner in Lab 2.0.4).
2. Every simulation opens with a "Current step" panel that shows the step the learner is on, with Previous step and Next step buttons, so a screen reader user can stay in the simulation from the first step to the last.

**Test site:** https://platformps.github.io/os-basics-labs-improved/

Published from the `docs` folder of the `main` branch. Progress is stored separately from the main site (key `osb-improved`). Pages carry a `noindex` tag.

Rebuild with `GUIDED=improved BASE=/os-basics-labs-improved/ OUT=docs python3 build.py`. Once the learner approves, the same two changes are applied to the main repository (`guided.js` and `guided.css` become part of the standard build).

Course content is based on the Cisco Networking Academy Operating Systems Basics course. Cisco and Networking Academy are trademarks of Cisco Systems, Inc.
