exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { call, imageData } = body;

    // CALL 1: Generate the artwork image
    if (call === "image") {
      const prompt = `Create a highly believable fictional song release from any year between 1960 and today.

This is NOT an album cover.

The artwork should represent:
- a hit single
- radio single
- 7-inch release
- cassette single
- CD single
- maxi-single
- promo single
- remix single
- digital single
- underground white-label release
or another single-release format appropriate to the era.

Randomly determine:
- release year
- country or regional music scene
- genre and subgenre
- commercial success level
- intended audience demographic
- release format
- production budget aesthetic
- emotional tone
- label type (major, indie, underground, regional, vanity label, etc.)

Randomly select a release year with roughly equal probability across all decades from 1960–2025.

Target approximate decade distribution across repeated generations:
- 1960s: 10%
- 1970s: 15%
- 1980s: 20%
- 1990s: 20%
- 2000s: 20%
- 2010s: 10%
- 2020s: 5%

Randomly select a release year with roughly equal probability across all decades from 1960–2025.

Target approximate geographic distribution across repeated generations:
- Europe: 40%
- North America: 25%
- South America: 15%
- Oceania: 5%
- Afria: 5%
- Asia: 5%

Do not favor earlier decades simply because they are historically iconic or visually distinctive.

Actively avoid overusing:
- late-60s psychedelic aesthetics
- 70s soft rock imagery
- nostalgic neon sunsets
- synthwave-inspired retro visuals
- canonical "classic album" compositions

Treat all eras as equally culturally significant.

Favor underrepresented decades, scenes, and visual styles over repeated ones.

Invent:
- a realistic artist or band name
- a believable song title
- a release year
- a convincing genre/style description

The names and titles must feel genuinely human-created and culturally authentic to the era.

Avoid:
- generic AI-sounding wording
- fake poetic phrases
- cliché adjective+noun combinations
- fantasy-style naming
- overly cinematic wording
- statistically obvious indie-band names
- repetitive retro aesthetics

STRICT VOCABULARY RESTRICTIONS — do NOT use these words or close variations anywhere:

neon, static, echoes, shadow, shadows, hollow, midnight, electric, flicker, silhouette, embers, crimson, chrome, porcelain, fractured, drowning, pulse, gravity, void, fever dream, smoke, haze, moonlight, starlight, fading, haunted, broken, lost, aching, shattered, empty, untamed, unspoken, infinite, eternal, destiny, chaos, universe, oblivion, transcend, paradox, illusion, salvation, soul, memory, burning, bleeding, whisper, phantom, ashes, scars, darkness, wildfire, storm, tempest, velvet, cyanide, reverie, lucid, collapse, decay, spiral, venom, frozen, gasoline, cathedral, satellite, eclipse, afterglow, heartbeat, poison, paradise, apocalypse, insomnia, delirium, magnetic, ultraviolet, sacred, sinner, runaway, blacklight, skyline, daydream, nightmare, labyrinth, mirrorball, bittersweet, cosmic, hypnotic, reckless, restless, numb, gasoline tears, electric heart, broken halo, silent screams, paper-thin, shattered dreams, fading light.

Favor:
- ordinary language
- culturally specific wording
- realistic slang
- accidental awkwardness
- mundane phrasing
- commercial realism
- concrete imagery
- specific places, things, actions
- understated naming
- era-authentic wording
- imperfect human choices

The artwork should look authentic to its era and single-release format.

Include era-appropriate:
- typography
- printing techniques
- media packaging
- photography style
- illustration methods
- color palette
- fashion/styling
- layout conventions
- label logos
- catalog numbers
- hype stickers
- radio promo markings
- chart stickers
- remix text
- physical wear
- scan artifacts
- media-specific imperfections

IMPORTANT VISUAL PRIORITY RULES:

Do NOT treat artist photography as the default solution.

Most generations should avoid:
- centered artist portraits
- glamour photography
- cinematic character shots
- artist standing and looking at camera compositions
- modern AI-beautified faces
- symmetrical poster-style framing

For overall output distribution, prioritize:
- 65% graphic/illustrated/art-driven covers
- 25% mixed-media or partially photographic covers
- 10% photography-dominant covers

Many outputs should contain:
- no visible humans
- tiny or obscured figures
- abstract compositions
- graphic-only layouts
- purely typographic covers
- symbolic imagery
- illustrated scenes
- surreal visuals
- environmental imagery
- object-based compositions
- chaotic flyer-style design
- texture-focused artwork

When photography is used, it should feel:
- cheap
- candid
- badly lit
- overprocessed
- awkwardly cropped
- documentary-like
- disposable

Allow genuinely flawed commercial design trends:
- ugly gradients
- awkward fonts
- bad kerning
- overcompressed imagery
- cheap Photoshop effects
- badly cropped art
- low-budget layouts
- excessive text
- generic stock graphics
- bargain-bin aesthetics
- amateur local-label design

Avoid repeating:
- centered portraits
- purple synthwave lighting
- palm trees
- sports cars
- chrome typography
- cinematic neon nostalgia
- moody sunset imagery

The release should feel like:
- a real Discogs listing
- a thrift-store cassette single
- a used CD single bin discovery
- a radio-station promo copy
- a local record-shop find
- a forgotten streaming upload
- an authentic historical single release

The final image should be indistinguishable from a genuine historical single release from its era.

Generate the cover artwork now. One image only. No metadata panels or text boxes below the artwork.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || "Gemini error" }) };
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p) => p.inlineData);
      const textPart = parts.find((p) => p.text);

      if (!imagePart) {
        return { statusCode: 500, body: JSON.stringify({ error: "No image returned" }) };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
          text: textPart?.text || null,
        }),
      };
    }

    // CALL 2: Extract metadata from the image
    if (call === "metadata") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: imageData.mimeType,
                      data: imageData.data,
                    },
                  },
                  {
                    text: `Look at this single cover artwork and extract or infer the metadata. Return ONLY a valid JSON object with no markdown, no backticks, no explanation. Use exactly these keys:

{
  "artist": "",
  "title": "",
  "year": "",
  "country": "",
  "genre": "",
  "instruments": ""
}

Read any text visible on the cover for artist and title. Infer year, country, and genre from the visual style, design era, typography, and any other clues in the artwork.

For genre, be historically specific and era-appropriate. Use subgenre combinations where possible. Examples of good specificity:
- Sophisti-pop / blue-eyed soul
- Baggy / Madchester dance-rock
- Eurodance / Italo house
- Alternative R&B / neo-soul
- Freestyle / Latin electro-pop
- Post-grunge / radio hard rock
- Deep house / progressive trance
- College rock / jangle pop

For instruments, list the most notable or distinctive instruments audible or implied by the genre and era. Be specific where possible — e.g. "Roland TR-808, Juno-106 synthesizer, fretless bass" rather than just "drums, guitar, bass".`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || "Gemini error" }) };
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: text }),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid call type" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
