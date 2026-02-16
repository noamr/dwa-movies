import {tmdb_get, image_path, get_movie_list} from "./helpers.js";

import { DOMGEN, Start } from "./domgen.js";

const {div, li, article, img, p, section, h1, h2, ul, a, span} = DOMGEN;

export async function render_movie({ id, current_list, write_patch, step, show_skeleton }) {
  const skeleton = tmdb_get(`/movie/${id}`).then(({ backdrop_path, title, overview, poster_path }) =>
        write_patch("main", 
          ul({class: "movie-carousel"},
            li({marker: "prev-movie", class: "prev"}, Start("prev-movie")),
            li({class: "default-item"}, 
              article({class: "movie-details"},
                img({class: "backdrop", src: image_path(backdrop_path, 1280)}),
                h1(title),
                img({class: "hero", src: image_path(poster_path, 300), "data-poster-for": `movie-${id}`}),
                p({class: "overview"}, overview),
                section({class: "mini-carousel", marker: "cast"}, Start("cast")),
                section({class: "movies"}, 
                  h2("Related"),
                  div({marker: "list-similar"}, Start("list-similar"))
                ),
                section({class: "movies"}, 
                  h2("Recommended"),
                  div({marker: "list-recommendations"}, Start("list-recommendations"))
                )
              )
            ),
            li({class: "next", marker: "next-movie"}, Start("next-movie"))
          )
        ));
  const write_after_skeleton = (...args) => skeleton.then(() => write_patch(...args));

    step(tmdb_get(`/movie/${id}/credits`).then(({ cast }) =>
        write_after_skeleton("cast", ul({class: "cast"}, 
          ...cast.map(({ id: person_id, name, character, profile_path }) => 
            li({class: "cast"}, 
              a({href: `/person/${person_id}?list=${encodeURIComponent(`/movie/${id}/credits`)}`}, 
                img({class: "person thumb", "data-poster-for": `person-${person_id}`, src: image_path(profile_path, 300), width: 80, height: 120}),
                span(name), " as ", span(character)
              )
            ))))));

    get_movie_list(step, `/movie/${id}/similar`, "similar", write_after_skeleton);
    get_movie_list(step, `/movie/${id}/recommendations`, "recommendations", write_after_skeleton);
    if (!current_list)
        return;
    step(tmdb_get(current_list).then(async (data) => {
        const results = data.results || data.cast || [];
        const index = results.findIndex(r => r.id == id);
        console.log(results, index);
        
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
            await write_after_skeleton("next-movie", movie_slide(next));
        }
        if (index > 0) {
            const prev = results[index - 1];
            await write_after_skeleton("prev-movie", movie_slide(prev));
        }
    }));
    await skeleton;
}


