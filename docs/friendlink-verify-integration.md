# Friend-link verification integration

The exchange page submits to `https://verify.081531.xyz/api/submissions` and reads public records from the same endpoint with `?public=1`.

The deployed verify service must allow CORS for the Astro site's production origin on both the public GET and submission POST responses. This repository is a static Astro site and does not proxy the request. If browsers report a CORS error, update the separate `friendlink-verify` deployment's allowed-origin configuration to include the site's canonical origin, then redeploy that service.
