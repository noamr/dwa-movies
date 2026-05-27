import { tmdb_get, get_movie_list } from "./helpers.js";
import { DOMGEN } from "./domgen.js";
const { section, h2, div } = DOMGEN;
export async function render_home({ Async, search }) {
    const lists = {
        now_playing: "Now Playing",
        popular: "Popular",
        top_rated: "Top Rated",
        upcoming: "Upcoming"
    }
    const q = search.get("q");
    console.log(q)
    if (q) {
        return section({ class: "movies" },
            h2("Search Results"),
            div(await get_movie_list(`/search/movie?query=${q}`)));
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
