import type { CommentResponse } from "../types";

export function preprocessArticleContent(html: string, coverImageUrl?: string): string {
  if (typeof window === "undefined" || !html) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const videos = doc.querySelectorAll("video");
    videos.forEach((video) => {
      const src = video.getAttribute("src");
      const videoId = video.getAttribute("id");

      // Sky Sports / Brightcove: empty <video id="id_{uuid}"> — convert to iframe embed
      if (!src && videoId && videoId.startsWith("id_")) {
        const uuid = videoId.substring(3); // strip "id_"
        const iframe = doc.createElement("iframe");
        iframe.setAttribute(
          "src",
          `https://players.brightcove.net/6057984924001/DESF5xFjJ_default/index.html?videoId=ref:${uuid}`
        );
        iframe.setAttribute("width", "100%");
        iframe.setAttribute("height", "400");
        iframe.setAttribute("allowfullscreen", "true");
        iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
        iframe.setAttribute("style", "border:0;border-radius:12px;display:block;margin:1.5rem 0;");
        video.parentNode?.replaceChild(iframe, video);
        return;
      }

      if (src) {
        const isDirect = src.toLowerCase().endsWith(".mp4")
          || src.toLowerCase().endsWith(".webm")
          || src.toLowerCase().endsWith(".ogg")
          || src.toLowerCase().endsWith(".mov")
          || src.toLowerCase().endsWith(".m3u8")
          || src.toLowerCase().includes(".mp4?")
          || src.toLowerCase().includes(".m3u8?");
        if (!isDirect) {
          const iframe = doc.createElement("iframe");
          iframe.setAttribute("src", src);
          iframe.setAttribute("width", "100%");
          iframe.setAttribute("height", "400");
          iframe.setAttribute("allowfullscreen", "true");
          if (video.className) iframe.className = video.className;
          video.parentNode?.replaceChild(iframe, video);
        }
      }
    });

    // Remove leftover Brightcove / Sky Sports video wrapper elements that are now
    // empty or contain only whitespace after the <video> was replaced with an <iframe>.
    // These divs have classes like sdc-site-video__content, sdc-site-video__inner, etc.
    doc.querySelectorAll(
      ".sdc-site-video__content, .sdc-site-video__inner, .sdc-site-video__accessibility-message, .sdc-site-video__bridge-message, .sdc-site-video__loader, .sdc-site-video__poster"
    ).forEach((el) => el.remove());

    // Remove empty <p>, <span>, <div> elements that contribute to whitespace gaps
    // Repeat twice to catch nested empties
    for (let pass = 0; pass < 2; pass++) {
      doc.querySelectorAll("p, span, div, li").forEach((el) => {
        if (!el.hasChildNodes() || el.textContent?.trim() === "") {
          // Keep if it's an img or iframe or has media children
          const hasMedia = el.querySelector("img, iframe, video, audio");
          if (!hasMedia) el.remove();
        }
      });
    }

    return doc.body.innerHTML;
  } catch (e) {
    return html;
  }
}

export function buildCommentTree(flatComments: any[]): CommentResponse[] {
  const map = new Map<number, CommentResponse>();
  const roots: CommentResponse[] = [];

  flatComments.forEach((c) => {
    map.set(c.id, {
      id: c.id,
      content: c.content,
      username: c.author || "Anonymous",
      likes: c.likeCount || 0,
      liked: !!c.liked,
      publishedAt: c.createdAt,
      parentId: c.parentId,
      replies: [],
    });
  });

  flatComments.forEach((c) => {
    const mapped = map.get(c.id)!;
    if (c.parentId) {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.replies.push(mapped);
      } else {
        roots.push(mapped);
      }
    } else {
      roots.push(mapped);
    }
  });

  return roots;
}

// Main component
