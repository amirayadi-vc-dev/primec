(function () {
  function secureUrl(raw) {
    try {
      const url = new URL(String(raw).trim());
      return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
    } catch { return null; }
  }

  function normalizeProfile(platform, raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const url = secureUrl(value);
    if (platform === 'facebook') {
      if (!url || !/^(www\.|m\.)?facebook\.com$/.test(url.hostname) || url.pathname === '/') return null;
      url.hostname = 'www.facebook.com';
      url.hash = '';
      return url.href;
    }
    if (!['instagram', 'tiktok'].includes(platform)) return null;
    let username = value.replace(/^@/, '');
    if (url) {
      if (!new RegExp(`^(www\\.|m\\.)?${platform}\\.com$`).test(url.hostname)) return null;
      const match = url.pathname.match(platform === 'tiktok' ? /^\/@([\w.]+)\/?$/ : /^\/([\w.]+)\/?$/);
      if (!match) return null;
      username = match[1];
    }
    const maxLength = platform === 'tiktok' ? 24 : 30;
    return new RegExp(`^[\\w.]{1,${maxLength}}$`).test(username) ? username : null;
  }

  function profileUrl(platform, raw) {
    const profile = normalizeProfile(platform, raw);
    if (!profile) return '';
    if (platform === 'facebook') return profile;
    return `https://www.${platform}.com/${platform === 'tiktok' ? '@' : ''}${profile}/`;
  }

  function parseSocialUrl(raw) {
    const url = secureUrl(raw);
    if (!url) return null;
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    if (host === 'instagram.com') {
      const match = url.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)\/?$/);
      if (!match) return null;
      const type = match[1] === 'p' ? 'p' : 'reel';
      return { platform: 'instagram', type: type === 'p' ? 'post' : 'reel', url: `https://www.instagram.com/${type}/${match[2]}/`, embed: `https://www.instagram.com/${type}/${match[2]}/embed` };
    }
    if (host === 'tiktok.com') {
      const match = url.pathname.match(/^\/@([\w.]{1,24})\/video\/(\d{1,25})\/?$/);
      if (!match) return null;
      return { platform: 'tiktok', type: 'video', url: `https://www.tiktok.com/@${match[1]}/video/${match[2]}`, embed: `https://www.tiktok.com/player/v1/${match[2]}` };
    }
    if (host === 'facebook.com' || host === 'fb.watch') {
      const query = new URLSearchParams();
      for (const key of ['story_fbid', 'id', 'v']) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key));
      const clean = `https://${host === 'fb.watch' ? 'fb.watch' : 'www.facebook.com'}${url.pathname}${query.size ? '?' + query : ''}`;
      const pageMatch = host === 'facebook.com' && url.pathname.match(/^\/([\w.-]+)\/?$/);
      if (pageMatch && !['plugins', 'watch', 'reel', 'events', 'groups', 'login', 'help'].includes(pageMatch[1].toLowerCase())) {
        const pageUrl = `https://www.facebook.com/${pageMatch[1]}/`;
        const embed = new URL('https://www.facebook.com/plugins/page.php');
        for (const [key, value] of Object.entries({ href: pageUrl, tabs: 'timeline', width: '500', height: '600', small_header: 'true', adapt_container_width: 'true', hide_cover: 'false', show_facepile: 'false' })) embed.searchParams.set(key, value);
        return { platform: 'facebook', type: 'page', url: pageUrl, embed: embed.href };
      }
      const isVideo = host === 'fb.watch' || /\/(videos|reel|watch)\b/.test(url.pathname);
      return { platform: 'facebook', type: isVideo ? 'reel' : 'post', url: clean, embed: `https://www.facebook.com/plugins/${isVideo ? 'video.php' : 'post.php'}?href=${encodeURIComponent(clean)}&show_text=${isVideo ? 'false' : 'true'}&width=500` };
    }
    return null;
  }

  const links = { normalizeProfile, profileUrl, parseSocialUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = links;
  else window.SocialLinks = links;
}());
