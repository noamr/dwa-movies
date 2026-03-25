import { tmdb_get, get_movie_list } from "./helpers.js";
import { DOMGEN } from "./domgen.js";
const { section, h2, div } = DOMGEN;
export async function render_home({ Async }) {
    const lists = {
        now_playing: "Now Playing",
        popular: "Popular",
        top_rated: "Top Rated",
        upcoming: "Upcoming"
    }
    return Object.entries(lists).map(
        ([list_id, list_name]) => `
                ${section({ class: "movies" },
            h2(list_name),
            div(...Async(get_movie_list(`/movie/${list_id}`))))}
                ${section(
                Async(tmdb_get("/genre/movie/list").then(async ({ genres }) => `
                        ${genres.map(({ id, name }) =>
                    section({ class: "movies" },
                        h2(name),
                        div(Async(get_movie_list(`/discover/movie?with_genres=${id}`)))
                    )).join("")}`
                )))}`);
}
