const csrf_token_promise = (async () => {
    const session_res = await fetch("/api/session");
    const { csrfToken } = await session_res.json();
    return csrfToken;
})();

async function tmdb_get(path) {
    const response = await fetch('/api/tmdb-proxy', {
        headers: { "x-csrf-token": await csrf_token_promise, "x-tmdb-path": path }
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
    const writer = e.data.stream.getWriter();
    const url = new URL(e.data.url);
    const all = [];

    function write_patch(targetTagname, targetName, content) {
        return writer.write(`
            <template contentmethod="replace-children"><${targetTagname} contentname="${targetName}">
                ${content}
            </${targetTagname}></template>
        `);
    }

    function get_movie_list(url, outlet) {
        return tmdb_get(url).then(async ({ results, success }) => {
            await write_patch("div", `list-${outlet}`, `
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
    `
            );
        });
    }
    if (new URLPattern("/", url.href).test(url)) {
        write_patch("main", "main", `
    <section class=movies>
      <h2>Now Playing</h2>
      <div contentname="list-now_playing"></div>
    </section>
    <section class=movies>
      <h2>Popular</h2>
      <div contentname="list-popular"></div>
    </section>
    <section class=movies>
      <h2>Top Rated</h2>
      <div contentname="list-top_rated"></div>
    </section>
    <section class=movies>
      <h2>Upcoming</h2>
      <div contentname="list-upcoming"></div>
    </section>
    <section contentname=genres>
    </section>
        `);
        for (const list of ["top_rated", "popular", "upcoming", "now_playing"]) {
            all.push(get_movie_list(`/movie/${list}`, list));
        }

        all.push(tmdb_get("/genre/movie/list").then(async ({ genres }) => {
            write_patch("section", "genres", `
                ${genres.map(({ id, name }) => `<section class=movies contentname=genre-${id}>
                    <h2>${name}</h2>
                    <div contentname="list-genre-${id}"></div>
                </section>`).join("")}
            `);

            await Promise.all(genres.map(async ({ id }) => get_movie_list(`/discover/movie?with_genres=${id}`, `genre-${id}`)))
        }));

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
            write_patch("main", "main", `
        <ul class="movie-carousel">
        <li contentname="prev-movie"></li>
            <li class="default-item">
                <article class="movie-details">
                    <img class="backdrop" src="${image_path(backdrop_path, 1280)}" />
                    <h1>${title}</h1>
                    <img class="hero" src="${image_path(poster_path, 300)}" data-poster-for="movie-${current_movie}" width="300" />
                    <p class="overview">${overview}</p>
                    <section contentname="cast">
                    </section>
                    <section class=movies>
                    <h2>Related</h2>
                    <div contentname="list-similar"></div>
                    </section>
                    <section class=movies>
                    <h2>Recommended</h2>
                    <div contentname="list-recommendations"></div>
                    </section>
                </article>
            </li>
            <li contentname="next-movie"></li>
        </ul>
    `)
        });


        all.push(tmdb_get(`/movie/${current_movie}/credits`).then(({ cast }) => {
            write_patch("section", "cast", `
        <ul class=cast>
            ${cast.map(({ id, name, character, profile_path }) => `
                <li class=cast>
                    <a href="/person/${id}?list=${encodeURIComponent(`/movie/${current_movie}/credits`)}">
                        <img class="person thumb" data-poster-for="person-${id}" src="${image_path(profile_path, 300)}" width=80 height=120>
                        <span>${name}</span> as <span>${character}</span>
                    </a>
                </li>
            `).join("")}
        </ul>
    `);
        }));


        const current_list = url.searchParams.get("list");
        if (current_list) {
            function movie_slide({ id, title, poster_path, overview, backdrop_path }) {
                return `<article class="movie-details">
                        <img class="backdrop" src="${image_path(backdrop_path, 1280)}" hidden>
                        <h1>${title}</h1>
                        <img class="hero" src="${image_path(poster_path, 300)}" data-poster-for="movie-${id}" width="300">
                        <p class="overview">${overview}</p>
                        <a href="/movie/${id}?list=${current_list}" class="snap-to-activate">&nbsp;</a>
                    </article>
            `;
            }
            console.log(current_list)
            all.push(tmdb_get(current_list).then(async (data) => {
                const results = data.results || data.cast;
                const index = results.findIndex(r => r.id == current_movie);
                if (index < results.length - 1) {
                    const next = results[index + 1];
                    console.log({ next })
                    write_patch("li", "next-movie", movie_slide(next));
                }
                if (index > 0) {
                    const prev = results[index - 1];
                    write_patch("li", "prev-movie", movie_slide(prev));
                }
            }));
        }
        all.push(get_movie_list(`/movie/${current_movie}/similar`, "similar"));
        all.push(get_movie_list(`/movie/${current_movie}/recommendations`, "recommendations"));
    }

    const current_person = new URLPattern("/person/:id", url.href).exec(url)?.pathname?.groups?.id;
    if (current_person) {
        const {
            name,
            biography,
            profile_path
        } = await tmdb_get(`/person/${current_person}`);

        write_patch("main", "main", `
        <ul class="person-carousel">
            <li contentname="prev-person"></li>
            <li class="default-item">
                <article class="person-details">
                    <h1>${name}</h1>
                    <img class="hero" src="${image_path(profile_path, 300)}" data-poster-for="person-${current_person}" width="300">
                    <p class="overview">${biography}</p>
                    <section contentname="cast" class=mini-carousel>
                    </section>
                    <section class=movies>
                    <h2>Credits</h2>
                    <div contentname="credits"></div>
                    </section>
                </article>
            </li>
            <li contentname="next-person"></li>
        </ul>
    `);


        all.push(tmdb_get(`/person/${current_person}/credits`).then(async ({ cast }) => {
            write_patch("section", "cast", `
        <ul class=cast>
            ${cast.map(({ title, poster_path, id, character }) => `
                <li class=cast>
                    <a href="/movie/${id}?list=/person/${current_person}/credits">
                        <img class="movie thumb" data-poster-for="movie-${id}" src="${image_path(poster_path, 300)}" width=80 height=120>
                        <span>As ${character}</span> in <span>${title}</span>
                    </a>
                </li>
            `).join("")}
        </ul>
    `);
        }));


        const current_list = url.searchParams.get("list");
        if (current_list) {
            function person_slide({ id, name, profile_path }) {
                return `<article class="person-details">
                        <h1>${name}</h1>
                        <img class="hero" src="${image_path(profile_path, 300)}" data-poster-for="person-${id}" width="300">
                        <a href="/person/${id}?list=${current_list}" class="snap-to-activate">&nbsp;</a>
                    </article>
            `;
            }
            all.push(tmdb_get(current_list).then(async ({ cast }) => {
                const results = cast;
                const index = results.findIndex(r => r.id == current_person);
                if (index < results.length - 1) {
                    const next = results[index + 1];
                    console.log({ next })
                    write_patch("li", "next-person", person_slide(next));
                }
                if (index > 0) {
                    const prev = results[index - 1];
                    write_patch("li", "prev-person", person_slide(prev));
                }
            }));
        }
    }

    Promise.all(all).then(() => {
        writer.close();
    });
});
