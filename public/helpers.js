const tmdb_cache = new Map();
const csrf_token_promise = (async () => {
    const session_res = await fetch("/api/session");
    const { csrfToken } = await session_res.json();
    return csrfToken;
})();

export async function tmdb_get(path) {
    if (tmdb_cache.has(path)) {
      await scheduler.yield();
        return tmdb_cache.get(path);
    }
    const response = await fetch('/api/tmdb-proxy', {
        headers: { "x-csrf-token": await csrf_token_promise, "x-tmdb-path": path }
    });
    const data = await response.json();
    if (!path.includes("/auth"))
        tmdb_cache.set(path, data);
    return data;
}

export function image_path(path, width = null) {
    return `https://image.tmdb.org/t/p/${width ? `w${width}` : 'original'}/${path}`;
}

export function get_movie_list(step, url, outlet, write_patch) {
    step(tmdb_get(url).then(({ results }) => write_patch("div", `list-${outlet}`, `
        <ul class=movie-list>
        ${results.map(({ id, poster_path, title }) => `
            <li>
                <a href="/movie/${id}?list=${encodeURIComponent(url)}" class="movie-thumb">
                    <img class=thumb src="${image_path(poster_path, 200)}">
                    <span class=title>${title}</span>
                </a>
            </li>
        `).join("")}
        </ul>
    `)));
}
