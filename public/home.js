import { tmdb_get, get_movie_list } from "./helpers.js";

import { DOMGEN, Marker, Start, End } from "./domgen.js";
const {section, h2, div} = DOMGEN;
export async function render_home({ write_patch, step }) {
    const lists = {
        now_playing: "Now Playing",
        popular: "Popular",
        top_rated: "Top Rated",
        upcoming: "Upcoming"
    }
    write_patch("main", ` 
        ${Object.entries(lists).map(([key, value]) => `
          ${section({class: "movies"}, 
            h2(value),
            div(Start(`list-${key}`))
          )}
          ${section(Start("genres"))}
          `).join("")}
    `);

    for (const list of Object.keys(lists)) {
        get_movie_list(step, `/movie/${list}`, list, write_patch);
    }

    step(tmdb_get("/genre/movie/list").then(async ({ genres }) => {
        write_patch("genres", `
            ${genres.map(({ id, name }) => section({class: "movies"},
              Start(`genre-${id}`),
              h2(name),
              div(Start(`list-genre-${id}`)),
              End()
            )).join("")}
        `);

        // Schedule nested steps
        for (const { id } of genres) {
             get_movie_list(step, `/discover/movie?with_genres=${id}`, `genre-${id}`, write_patch);
        }
    }));
}
