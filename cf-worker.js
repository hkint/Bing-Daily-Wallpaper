const botToken = ""; // Telegram Bot Token
const chatId = ""; // Telegram Channel/Chat ID

const regionMap = {
  "en-US": "United States",
  "zh-CN": "China",
  "ja-JP": "Japan",
  "de-DE": "Germany",
  "en-CA": "Canada",
  "en-GB": "United Kingdom",
  "en-IN": "India",
  "fr-FR": "France",
  "it-IT": "Italy",
};

const resolutionMap = {
  "1080": "1920x1080.jpg",
  "4K": "UHD.jpg",
}

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduledEvent());
});

async function handleScheduledEvent() {
  const regions = Object.keys(regionMap);
  const region = regions[Math.floor(Math.random() * regions.length)];
  console.log('region: ', region);
  try {
    const wallpaper = await fetchBingWallpaper(region, '4K');
    await sendToTelegram(wallpaper);
  } catch (error) {
    console.error(`Error processing region ${regionMap[region]}:`, error);
    // handle error
  }
}

/**
 * @param {{ imageUrl: string; region: string; date: any; title: string; copyright: string; }} wallpaper
 */
async function sendToTelegram(wallpaper) {
  const message = `${wallpaper.title}\n${wallpaper.copyright}`;

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: wallpaper.imageUrl,
        caption: message,
      }),
    }
  );
  return response.json();
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const params = new URL(request.url).searchParams;
    const region = params.get("region") || "en-US";
    const resolution = params.get("resolution") || "4K";
    
    const wallpaper = await fetchBingWallpaper(region, resolution);

    const imageResponse = await fetch(wallpaper.imageUrl);
    const imageData = await imageResponse.arrayBuffer();

    return new Response(imageData, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  } catch (error) {
    console.error(`Error handling request:`, error);
    return new Response("Error handling request", { status: 500 });
  }
}

/**
 * @param {string} region
 * @param {string} resolution
 */
async function fetchBingWallpaper(region, resolution) {
  const response = await fetch(
    `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=${region}`
  );
  const data = await response.json();
  if (data.images.length === 0) {
    throw new Error('No wallpaper available');
  }
  return {
    imageUrl: "https://www.bing.com" + data.images[0].urlbase + "_" + resolutionMap[resolution],
    region: regionMap[region],
    date: data.images[0].enddate,
    title: data.images[0].title,
    copyright: data.images[0].copyright,
  };
}
