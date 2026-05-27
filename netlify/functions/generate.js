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
      const prompt = `Generate a highly believable fictional HIT SINGLE artwork from any year between 1960 and today. The final output is a single image containing TWO panels arranged vertically.

PANEL 1: THE ARTWORK

The top panel is the front cover artwork of the single.

Randomly vary: release year, country or regional scene, genre and subgenre, commercial success level, release format, budget level, audience demographic, label type.

Favor underrepresented decades, scenes, and aesthetics over repeated ones.

Do not repeatedly default to: synthwave aesthetics, nostalgic neon imagery, cinematic retro styling, cool indie branding, centered artist portraits.

Treat all eras as equally likely and culturally significant.

Possible release formats include: 7-inch single, cassette single, CD single, maxi-single, remix release, promo pressing, white-label dance single, digital single.

Invent: a believable artist or band name, a believable single title, release year, country of origin, historically plausible genre/subgenre labels.

Names should feel culturally authentic, imperfect, commercially believable, and human-created.

Avoid: AI-style poetry, vague emotional abstraction, fake-cool indie naming, overly cinematic wording, moodboard aesthetics, generic retro clichés.

STRICT VOCABULARY RESTRICTIONS — do NOT use these words or close variations anywhere in the artwork: neon, static, echoes, shadow, shadows, hollow, midnight, electric, flicker, silhouette, embers, crimson, chrome, porcelain, fractured, drowning, pulse, gravity, void, smoke, haze, moonlight, starlight, fading, haunted, broken, lost, aching, shattered, empty, untamed, unspoken, infinite, eternal, destiny, chaos, universe, oblivion, transcend, paradox, illusion, salvation, soul, memory, burning, bleeding, whisper, phantom, ashes, scars, darkness, wildfire, storm, tempest, velvet, reverie, lucid, collapse, decay, spiral, frozen, cathedral, satellite, eclipse, afterglow, heartbeat, paradise, apocalypse, insomnia, delirium, magnetic, ultraviolet, sacred, runaway, skyline, daydream, nightmare, labyrinth, mirrorball, bittersweet, cosmic, hypnotic, reckless, restless, numb.

Favor: ordinary wording, realistic slang, regional specificity, mundane phrasing, awkward human choices, commercial realism, concrete imagery, historically believable naming.

The release should resemble one of: a forgotten chart single, a regional radio hit, a bargain-bin CD single, an underground dance release, a local-label promo, a one-hit wonder, a rediscovered cult track, an awkward commercial release, a real Discogs listing.

Not every release should feel iconic or timeless. Some should feel cheaply produced, disposable, overdesigned, corporate, low-budget, niche, commercially mediocre, or awkwardly marketed.

ARTWORK VISUAL RULES: Do NOT default to artist photography. Most generations should favor graphic design, illustration, collage, typography, abstract imagery, painted artwork, rave flyer aesthetics, vector graphics, low-budget desktop publishing, photocopy textures, hand-drawn imagery, object-focused compositions.

Many covers should contain no people, tiny or obscured figures, fragmented imagery, symbolic visuals, typography-only compositions, or environmental imagery.

When photography is used, it should feel candid, awkward, disposable, badly cropped, cheaply lit, documentary-like.

Allow and favor imperfect historical design trends: bad kerning, ugly gradients, cheap printing, overcompressed graphics, awkward typography, cluttered layouts, generic stock imagery, bargain-bin aesthetics, amateur local-label design.

Strongly vary visual composition. Avoid centered portraits, moody sunsets, chrome typography, palm trees, sports cars, synthwave lighting, cinematic nostalgia.

PANEL 2: THE INFO STRIP

Directly below the artwork, generate a second panel styled as a printed record sleeve reverse, CD inlay strip, or promo info block. The style must match the era, genre, and budget level of the artwork above.

Examples of appropriate styling by era:
- 1960s-70s: plain paper sleeve back, typewriter font, black ink on cream or white
- 1980s: dot-matrix or early desktop publishing typography, possibly on colored card
- 1990s: CD single inlay rear panel, small condensed sans-serif, catalogue number, barcode graphic
- 2000s: cheap glossy reverse, small print, JPEG-compressed feel
- Underground/dance: white-label stamp style, minimal stencil text, hand-stamped look

The panel must contain these fields printed clearly in era-appropriate typography:
Artist:
Single Title:
Release Year:
Country of Origin:
Genre:
Notable Instruments:

The field values must be consistent with the artwork above. The panel should feel like a physical part of the release — printed matter from the same era as the cover. Not a caption, not a subtitle, not a modern overlay.

Before generating, internally verify: the artwork does not look obviously AI-generated, the typography in both panels fits the era, the genre and artwork match historically, the info strip style matches the release format and budget, the text in the info strip is legible, banned-word aesthetics are avoided, the full image would convince a record collector, graphic designer, music historian, or Discogs user.

Generate the image now. Both panels are mandatory.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
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

      // Extract image and any text from response
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
                    text: `Read the info strip panel at the bottom of this image and extract the metadata fields. Return ONLY a valid JSON object with no markdown, no backticks, no explanation. Use exactly these keys:

{
  "artist": "",
  "title": "",
  "year": "",
  "country": "",
  "genre": "",
  "instruments": ""
}

Copy the values exactly as they appear in the image.`,
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
