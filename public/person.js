import { tmdb_get, image_path, cache_movie, cache_person } from "./helpers.js";

import { DOMGEN } from "./domgen.js";

const {div, li, article, img, p, section, h1, h2, ul, a, span} = DOMGEN;

export async function render_person({ id, current_list, write_patch, step }) {
    const {
        name,
        biography,
        profile_path,
    } = await tmdb_get(`/person/${id}`);

    cache_person(id, {name, profile_path});

    write_patch("main", "main", 
      ul({class: "person-carousel"},
        li({contentname: "prev-person", class: "prev"}),
        li({class: "default-item"},
          article({class: "person-details"},
            h1(name),
            img({class: "hero", src: image_path(profile_path, 300), "data-poster-for": `person-${id}`, width: 300}),
            p({class: "overview"}, biography),
            section({contentname: "cast", class: "mini-carousel"}),
            section({class: "movies"},
              h2("Credits"),
              div({contentname: "credits"})
            )
          )
        ),
        li({contentname: "next-person", class: "next"})
      )
    );

    step(tmdb_get(`/person/${id}/credits`).then(async ({ cast }) =>
        write_patch("section", "cast", 
          ul({class: "cast"}, 
            ...cast.map(({ title, poster_path, id, character }) =>
                li({class: "cast"}, 
                    a({href: `/movie/${id}?list=/person/${id}/credits`}, 
                        img({class: "movie thumb", "data-poster-for": `movie-${id}`, src: image_path(poster_path, 300), width: 80, height: 120}),
                        span(character), " in ", span(title)
                    )
                ))))));

    if (!current_list)
        return;

    step(tmdb_get(current_list).then(async ({ cast }) => {
        const results = cast;
        const index = results.findIndex(r => r.id == id);
        
        function person_slide({ id, name, profile_path }) {
            return article({class: "person-details"},
              h1(name),
              img({class: "hero", src: image_path(profile_path, 300), "data-poster-for": `person-${id}`, width: 300}),
              a({href: `/person/${id}?list=${current_list}`, class: "snap-to-activate"}, "&nbsp;")
            );
        }

        if (index < results.length - 1) {
            const next = results[index + 1];
            write_patch("li", "next-person", person_slide(next));
        }
        if (index > 0) {
            const prev = results[index - 1];
            write_patch("li", "prev-person", person_slide(prev));
        }
    }));
}
