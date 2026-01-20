import {tmdb_get, image_path, get_movie_list} from "./helpers.js";

export async function render_movie({ id, current_list, write_patch, step }) {
    const movie_data = await tmdb_get(`/movie/${id}`);
    const {
        backdrop_path,
        title,
        overview,
        poster_path
    } = movie_data;

    write_patch("main", "main", `
        <ul class="movie-carousel">
        <li contentname="prev-movie" class=prev></li>
            <li class="default-item">
                <article class="movie-details">
                    <img class="backdrop" src="${image_path(backdrop_path, 1280)}" />
                    <h1>${title}</h1>
                    <img class="hero" src="${image_path(poster_path, 300)}" data-poster-for="movie-${id}" width="300" />
                    <p class="overview">${overview}</p>
                    <section contentname="cast" class="mini-carousel">
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
            <li contentname="next-movie" class=next></li>
        </ul>
    `);

    step(tmdb_get(`/movie/${id}/credits`).then(({ cast }) => {
        write_patch("section", "cast", `
    <ul class=cast>
        ${cast.map(({ id: person_id, name, character, profile_path }) => `
            <li class=cast>
                <a href="/person/${person_id}?list=${encodeURIComponent(`/movie/${id}/credits`)}">
                    <img class="person thumb" data-poster-for="person-${person_id}" src="${image_path(profile_path, 300)}" width=80 height=120>
                    <span>${name}</span> as <span>${character}</span>
                </a>
            </li>
        `).join("")}
    </ul>
`);
    }));

    get_movie_list(step, `/movie/${id}/similar`, "similar", write_patch);
    get_movie_list(step, `/movie/${id}/recommendations`, "recommendations", write_patch);
    if (!current_list)
        return;
    step(tmdb_get(current_list).then(async (data) => {
        const results = data.results || data.cast || [];
        const index = results.findIndex(r => r.id == id);
        
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

        if (index < results.length - 1) {
            const next = results[index + 1];
            write_patch("li", "next-movie", movie_slide(next));
        }
        if (index > 0) {
            const prev = results[index - 1];
            write_patch("li", "prev-movie", movie_slide(prev));
        }
    }));
}


