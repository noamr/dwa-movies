const csrf_token_promise = (async () => {
    const session_res = await fetch("/api/session");
    const {csrfToken} = await session_res.json();
    return csrfToken;
})();

async function tmdb_get(path) {
    const response = await fetch('/api/tmdb-proxy', {
        headers: {"x-csrf-token": await csrf_token_promise, "x-tmdb-path": path }
    });
    return response.json();
}

function image_path(path, width = null) {
    return `https://image.tmdb.org/t/p/${width ? `w${width}` : 'original'}/${path}`;
}

try {
    const result = await tmdb_get("/authentication/guest_session/new");
    self.guest_session_id = result.guest_session_id;
} catch (e) {
    alert("Could not log in");
}

console.log("Worker ready");

postMessage("ready");

self.addEventListener("message", async e => {
    const {request, stream} = e.data;
    const writer = stream.getWriter();
    const url = new URL(request.url);
    const genre = url.searchParams.get("genre") || "all";
    const all = [];

    function get_movie_list(url, outlet) {
        return tmdb_get(url).then(async ({results}) => {
           await writer.write(`
      <template patchfor="list-${outlet}">
         <ul class=movie-list>
        ${results.filter(({genre_ids}) => (genre === "all" ? true : genre_ids.includes(+genre))).map(({id, poster_path, title}) => `
            <li>
                <a href="/movie/${id}?list=${encodeURIComponent(url)}" class="movie-thumb">
                    <img class=thumb src="${image_path(poster_path, 200)}">
                    <span class=title>${title}</span>
                </a>
            </li>
        `).join("")}
        </ul>
  </template>
    `
);
        });
    }

    all.push(tmdb_get("/genre/movie/list").then(async ({genres}) => {
        await writer.write(`
            <template patchfor=genre-list>
                <li><a href="?genre=all" id="genre-all">All</a></li>
                ${genres.map(({id, name}) => `<li><a href=?genre=${id}>${name}</a></li>`).join("\n")}
            </template>
        `);
    }));

    if (new URLPattern("/", url.href).test(url)) {
        writer.write(`
  <template patchfor="main">
    <section class=movies>
      <h2>Now Playing</h2>
      <div id="list-now_playing"></div>
    </section>
    <section class=movies>
      <h2>Popular</h2>
      <div id="list-popular"></div>
    </section>
    <section class=movies>
      <h2>Top Rated</h2>
      <div id="list-top_rated"></div>
    </section>
    <section class=movies>
      <h2>Upcoming</h2>
      <div id="list-upcoming"></div>
    </section>
  </template>
        `);
    for (const list of ["top_rated", "popular", "upcoming", "now_playing"]) {
        all.push(get_movie_list(`/movie/${list}`, list));
    }
}

const current_movie = new URLPattern("/movie/:id", url.href).exec(url)?.pathname?.groups?.id;
if (current_movie) {
    await tmdb_get(`/movie/${current_movie}`).then(async ({
        backdrop_path,
        genres,
        homepage,
        imdb_id,
        title,
        overview,
        poster_path
    }) => {
        await writer.write(`
    <template patchfor="main">
        <ul class="movie-carousel">
        <li id="prev-movie"></li>
            <li class="default-item">
                <article class="movie-details">
                    <h1>${title}</h1>
                    <img class="hero" src="${image_path(poster_path, 300)}" width="300" />
                    <p class="overview">${overview}</p>
                    <section id="cast">
                    </section>
                    <section class=movies>
                    <h2>Related</h2>
                    <div id="list-similar"></div>
                    </section>
                    <section class=movies>
                    <h2>Recommended</h2>
                    <div id="list-recommendations"></div>
                    </section>
                </article>
            </li>
            <li id="next-movie"></li>
        </ul>
    </template>
    `) });


   all.push(tmdb_get(`/movie/${current_movie}/credits`).then(({cast}) => {
    writer.write(`
    <template patchfor="cast">
        <ul class=cast>
            ${cast.map(({id, name, character, profile_path}) => `
                <li class=cast>
                    <a href="/person/${id}">
                        <img class="person thumb" src="${image_path(profile_path, 300)}" width=75>
                        <span>${name}</span> as <span>${character}</span>
                    </a>
                </li>
            `).join("")}
        </ul>
    </template>
        `);
   }));


    const current_list = url.searchParams.get("list");
    if (current_list) {
        function movie_slide({id,title, poster_path, overview}) {
            return `<article class="movie-details">
                        <h1>${title}</h1>
                        <img class="hero" src="${image_path(poster_path, 300)}" width="300">
                        <p class="overview">${overview}</p>
                        <a href="/movie/${id}?list=${current_list}" class="snap-to-activate">&nbsp;</a>
                    </article>
            `;
        }
        all.push(tmdb_get(current_list).then(async ({results}) => {
            const index = results.findIndex(r => r.id == current_movie);
            if (index < results.length - 1) {
                const next = results[index + 1];
                console.log({next})
                await writer.write(`
                    <template patchfor="next-movie">
                        ${movie_slide(next)}
                    </template>
                `);
            }
            if (index > 0) {
                const prev = results[index - 1];
                await writer.write(`
                    <template patchfor="prev-movie">
                        ${movie_slide(prev)}
                    </template>
                `);
            }
        }));
    }
    all.push(get_movie_list(`/movie/${current_movie}/similar`, "similar"));
    all.push(get_movie_list(`/movie/${current_movie}/recommendations`, "recommendations"));
}

Promise.all(all).then(() => {
    writer.close();
});
});
