const movie_cache = new Map();
const person_cache = new Map();

export function cache_movie(id, data) {
    movie_cache.set(id, data);
}

export function cache_person(id, data) {
    person_cache.set(id, data);
}

export function get_cached_movie(id) {
    return movie_cache.get(id) || {title: "", poster_path: ""};
}

export function get_cached_person(id) {
    return person_cache.get(id) || {name: "", profile_path: ""};
}

const csrf_token_promise = (async () => {
    const session_res = await fetch("/api/session");
    const { csrfToken } = await session_res.json();
    return csrfToken;
})();

export async function tmdb_get(path) {
    const response = await fetch('/api/tmdb-proxy', {
        headers: { "x-csrf-token": await csrf_token_promise, "x-tmdb-path": path }
    });
    return response.json();
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
