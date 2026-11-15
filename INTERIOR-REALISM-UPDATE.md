# Interior realism update — 15 November 2026

The interactive scene now includes a fitted TV feature wall with display shelves, books, ceramics and lower storage; woven carpet with a border and fringe; dining place settings; kitchen quartz counters, backsplash, preparation jars, crockery, hob cookware and a stainless mixer/sink; and bathroom shower controls, overhead shower, soap holder, bucket, mug and drain. Kitchen base cabinets have hinged doors. Original procedural assets and maps require no paid asset subscription.

The TV unit width follows the actual selected solid wall. A shower wet zone is placed only when it fits outside door swings and the vanity/WC footprints. Small bathrooms that cannot fit a wet zone omit it rather than overlap fittings. Bathroom tiles now line the wet side of shared walls, preserving painted bedroom walls.

Polished dry floors use original large-format porcelain PBR maps. Bathroom floors use a less glossy finish; wet walls, carpet, polished worktops, fabric, wood and chrome have distinct roughness. Live planar reflections show the room in its vanity mirror and lightly on polished floors. They activate in the occupied room to bound render cost; the viewer includes a Live reflections switch. Mirror reflection planes and interaction markers are omitted from GLB export; the actual metallic mirror surface remains for physical Blender rendering.

One additional interior shadow light follows the occupied room, with a soft local fill. This bounds the number of shadow maps as the building grows. Daylight, environment lighting and contact shadows remain available. Room views now aim at the TV wall, bed, kitchen counter, vanity, or shower fittings. These are views of the actual model.

## Pixabay

Official API documentation: https://pixabay.com/api/docs/
Content licence: https://pixabay.com/service/license-summary/

The supplied key was tested successfully and stored in the local database using the application's encrypted provider storage. It is not in source code, the client bundle, or this report. Admin can configure a different key under Settings → Connections → Photo references. Photo searches are under Asset library.

The integration uses authenticated, permission-protected server requests to the fixed Pixabay endpoint; 12 safe-search photographs per request; 24-hour PostgreSQL caching; bounded cache retention and an additional application request limit. Responses expose source links, contributors and previews, never the API key. Search previews expire and are cleared rather than used as permanent project textures. There is no automatic model training or bulk crawling.

A small, focused research set was examined for TV joinery, kitchen details and bathroom fittings. Stock-search regional tags were often inaccurate; generic interiors, landscapes and unrelated photos also appeared. These results are not evidence of verified architectural styles for every Indian state. The existing regional atlas and user-supplied plan references remain separate, attributed research.

The hosted key was not configured through the browser: Computer Use stopped when it could not confidently determine the current URL. The hosted app's admin must enter it in Photo references. Local key/configuration tests succeeded, including a 24-hour cache hit.

## Quality and verification

This is an improved real-time architectural concept viewer, not a claim of reference-photo quality. Synthetic materials, some simple furniture geometry, approximate indirect lighting and a single planar floor reflection still limit realism. Blender Cycles can render the exported geometry with physical reflections and bounced lighting, but a GPU alone does not repair a poor design or turn every asset into a photo-quality object. No paid GPU or AI generation was started.

Automated checks cover shower/fixture/door clearance, TV feature-wall bounds, reference search validation, safe result links, redacted provider errors and fixed-host requests. Existing floor planning, navigation, metre-scale export and access control checks are retained. Actual browser views are checked separately because passing geometry tests does not establish visual quality.

