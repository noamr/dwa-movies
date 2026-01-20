import {tmdb_get, image_path, get_movie_list} from "./helpers.js";

import { DOMGEN } from "./domgen.js";

const {div, li, article, img, p, section, h1, h2, ul, a, span} = DOMGEN;

export async function render_movie({ id, current_list, write_patch, step }) {
  const initial_done = tmdb_get(`/movie/${id}`).then(({ backdrop_path, title, overview, poster_path }) =>
        write_patch("main", "main", 
          ul({class: "movie-carousel"},
            li({contentname: "prev-movie", class: "prev"}),
            li({class: "default-item"}, 
              article({class: "movie-details"},
                img({class: "backdrop", src: image_path(backdrop_path, 1280)}),
                h1(title),
                img({class: "hero", src: image_path(poster_path, 300), "data-poster-for": `movie-${id}`}),
                p({class: "overview"}, overview),
                section({class: "mini-carousel", contentname: "cast"}),
                section({class: "movies"}, 
                  h2("Related"),
                  div({contentname: "list-similar"})
                ),
                section({class: "movies"}, 
                  h2("Recommended"),
                  div({contentname: "list-recommendations"})
                )
              )
            ),
            li({class: "next", contentname: "next-movie"})
          )
        ));

    step(tmdb_get(`/movie/${id}/credits`).then(({ cast }) =>
        write_patch("section", "cast", ul({class: "cast"}, 
          ...cast.map(({ id: person_id, name, character, profile_path }) => 
            li({class: "cast"}, 
              a({href: `/person/${person_id}?list=${encodeURIComponent(`/movie/${id}/credits`)}`}, 
                img({class: "person thumb", "data-poster-for": `person-${person_id}`, src: image_path(profile_path, 300), width: 80, height: 120}),
                span(name), " as ", span(character)
              )
            ))))));

    get_movie_list(step, `/movie/${id}/similar`, "similar", write_patch);
    get_movie_list(step, `/movie/${id}/recommendations`, "recommendations", write_patch);
    if (!current_list)
        return;
    step(tmdb_get(current_list).then(async (data) => {
        const results = data.results || data.cast || [];
        const index = results.findIndex(r => r.id == id);
        
        const movie_slide = ({ id, title, poster_path, overview, backdrop_path }) => 
          article({class: "movie-details"},
            img({class: "backdrop", src: image_path(backdrop_path, 1280), hidden: true}),
            h1(title),
            img({class: "hero", src: image_path(poster_path, 300), "data-poster-for": `movie-${id}`, width: 300}),
            p({class: "overview"}, overview),
            a({href: `/movie/${id}?list=${current_list}`, class: "snap-to-activate"}, "&nbsp;")
          );

        if (index < results.length - 1) {
            const next = results[index + 1];
            await write_patch("li", "next-movie", movie_slide(next));
        }
        if (index > 0) {
            const prev = results[index - 1];
            await write_patch("li", "prev-movie", movie_slide(prev));
        }
    }));
    await initial_done;
}


