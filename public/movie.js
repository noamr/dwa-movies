import { tmdb_get, image_path, get_movie_list } from "./helpers.js";
import { DOMGEN } from "./domgen.js";

const { div, li, article, img, p, section, h1, h2, ul, a, span } = DOMGEN;

export async function render_movie({ id, current_list, write_patch, Async }) {

  const { backdrop_path, title, overview, poster_path } = await tmdb_get(`/movie/${id}`);

  const get_nav_movie = async (direction) => {
    if (!current_list)
      return "";
    const movie_slide = ({ id, title, poster_path, overview, backdrop_path }) =>
      article({ class: "movie-details" },
        img({ class: "backdrop", src: image_path(backdrop_path, 1280), hidden: true }),
        h1(title),
        img({ class: "hero", src: image_path(poster_path, 300), "data-poster-for": `movie-${id}`, width: 300 }),
        p({ class: "overview" }, overview),
        a({ href: `/movie/${id}?list=${current_list}`, class: "snap-to-activate" }, "&nbsp;")
      );

    const data = await tmdb_get(current_list);
    const results = data.results || data.cast || [];
    const index = results.findIndex(r => r.id == id);
    if (direction === "next" && index < results.length - 1) {
      return movie_slide(results[index + 1]);
    }
    if (direction === "prev" && index > 0) {
      return movie_slide(results[index - 1]);
    }
    return "";
  }

  return ul({ class: "movie-carousel" },
      li({ class: "prev" }, Async(get_nav_movie("prev"))),
      li({ class: "default-item" },
        article({ class: "movie-details" },
          img({ class: "backdrop", src: image_path(backdrop_path, 1280) }),
          h1(title),
          img({ class: "hero", src: image_path(poster_path, 300), "data-poster-for": `movie-${id}` }),
          p({ class: "overview" }, overview),
          section({ class: "mini-carousel" }, Async(tmdb_get(`/movie/${id}/credits`).then(({ cast }) =>
            ul({ class: "cast" },
              ...cast.map(({ id: person_id, name, character, profile_path }) =>
                li({ class: "cast" },
                  a({ href: `/person/${person_id}?list=${encodeURIComponent(`/movie/${id}/credits`)}` },
                    img({ class: "person thumb", "data-poster-for": `person-${person_id}`, src: image_path(profile_path, 300), width: 80, height: 120 }),
                    span(name), " as ", span(character)
                  )
                )))
          ))),
          section({ class: "movies" },
            h2("Related"),
            div(Async(get_movie_list(`/movie/${id}/similar`), "list-similar"))
          ),
          section({ class: "movies" },
            h2("Recommended"),
            div(Async(get_movie_list(`/movie/${id}/recommendations`), "list-recommendations"))
          )
        )
      ),
      li({ class: "next" }, Async(get_nav_movie("next")))
    );
}


