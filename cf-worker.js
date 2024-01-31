const botToken = ""; // Telegram Bot Token
const chatId = ""; // Telegram Channel/Chat ID

const regionMap = {
  "us": "United States",
  "cn": "China",
  "jp": "Japan",
  "de": "Germany",
};

const resolutionMap = {
  "1080": "1920x1080.jpg",
  "4K": "UHD.jpg",
}

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduledEvent());
});

/**
 * Asynchronously handles a scheduled event by fetching a random Bing wallpaper 
 * based on a region, and sends it to Telegram. Catches and logs errors.
 *
 * @return {Promise<void>} A promise that resolves when the function completes.
 */
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
 * Asynchronously sends the provided wallpaper information to Telegram.
 *
 * @param {Object} wallpaper - the wallpaper object containing title, copyright, and image URL
 */
async function sendToTelegram(wallpaper) {
  const message = `${wallpaper.title}\n${wallpaper.copyright}`;

  await fetch(
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
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handles the incoming request by fetching a Bing wallpaper based on the specified region and resolution. 
 *
 * @param {Request} request - The incoming request to be handled.
 * @return {Promise<Response>} A Promise that resolves to the image data of the fetched Bing wallpaper.
 */
async function handleRequest(request) {
  try {
    const params = new URL(request.url).searchParams;
    const region = params.get("region") || "us";
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
 * Fetches the latest Bing daily wallpaper for the given region and resolution.
 * 
 * @param {string} region - The region to fetch the wallpaper for, e.g. "en-US"
 * @param {string} resolution - The desired wallpaper resolution, e.g. "4K"
 * @returns {Promise<{imageUrl: string, region: string, date: string, title: string, copyright: string}>} 
 *    A promise that resolves to an object containing the wallpaper URL and metadata.
 */
async function fetchBingWallpaper(region, resolution) {
  const languagePreferences = ['en-US', 'zh-CN'];

  const headers = new Headers({
    'Accept-Language': languagePreferences.join(', ') 
  });

  const response = await fetch(
    `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&cc=${region}`,
    {
      headers: headers
    }
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
