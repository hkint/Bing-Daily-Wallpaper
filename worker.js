const resolutionMap = {
  "1080": "1920x1080.jpg",
  "4K": "UHD.jpg",
};

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduledEvent());
});

async function handleScheduledEvent() {
  try {
    const wallpaper = await fetchBingWallpaper('cn', '4K');
    await sendToTelegram(wallpaper);
    await triggerGitHubWorkflow();
  } catch (error) {
    console.error(`Error: `, error);
  }
}

async function sendToTelegram(wallpaper) {
  const botToken = TG_BOT_TOKEN;
  const chatId = TG_CHAT_ID;
  const message = `${wallpaper.title}\n\n${wallpaper.copyright}\n\n原图：${wallpaper.imageUrl}`;

  await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

async function handleRequest(request) {
  try {
    const params = new URL(request.url).searchParams;
    const region = params.get("region") || "cn";
    const resolution = params.get("resolution") || "4K";

    const wallpaper = await fetchBingWallpaper(region, resolution);

    return new Response(JSON.stringify({
      "text": wallpaper.title + wallpaper.copyright.split(' \(©')[0],
      "img": wallpaper.imageUrl
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error handling request:`, error);
    return new Response("Error handling request", { status: 500 });
  }
}

async function fetchBingWallpaper(region, resolution) {
  const languagePreferences = ['en-US', 'zh-CN'];
  const headers = new Headers({
    'Accept-Language': languagePreferences.join(', ')
  });

  const response = await fetch(
    `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&cc=${region}`,
    { headers }
  );
  const data = await response.json();
  if (data.images.length === 0) {
    throw new Error('No wallpaper available');
  }
  return {
    imageUrl: "https://www.bing.com" + data.images[0].urlbase + "_" + resolutionMap[resolution],
    date: data.images[0].enddate,
    title: data.images[0].title,
    copyright: data.images[0].copyright,
  };
}

async function triggerGitHubWorkflow() {
  const owner = OWNER;
  const repo = REPO;
  const workflowId = WORKFLOW_ID;
  const token = GH_TOKEN;

  const data = JSON.stringify({
    "ref": "master",
    "inputs": {
      "info": "Cloudflare Workers"
    }
  });

  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare Workers'
    },
    body: data
  };

  await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, options);
}
