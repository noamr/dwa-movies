import { tmdb_get, image_path, get_movie_list } from "./helpers.js";
import { DOMGEN } from "./domgen.js";

const { div, li, article, img, p, section, h1, h2, ul, a } = DOMGEN;

export async function render_person({ id, current_list, Async }) {
    const { name, biography, profile_path } = await tmdb_get(`/person/${id}`);

    const person_slide = ({ id, name, profile_path, biography }) => 
      article({ class: "person-details" },
        h1(name),
        img({ class: "hero", src: image_path(profile_path, 300), "data-poster-for": `person-${id}`, width: 300 }),
        p({ class: "overview" }, biography),
        a({ href: `/person/${id}?list=${current_list}`, class: "snap-to-activate" }, "&nbsp;")
      );

    const get_nav_person = async (direction) => {
        if (!current_list) return "";
        const data = await tmdb_get(current_list);
        const results = data.results || data.cast || [];
        const index = results.findIndex(r => r.id == id);
        if (direction === "next" && index < results.length - 1) {
            return person_slide(results[index + 1]);
        }
        if (direction === "prev" && index > 0) {
            return person_slide(results[index - 1]);
        }
        return "";
    }

    return ul({ class: "person-carousel" },
        li({ class: "prev" }, Async(get_nav_person("prev"), "prev-person")),
        li({ class: "default-item" },
          article({ class: "person-details" },
            h1(name),
            img({ class: "hero", src: image_path(profile_path, 300), "data-poster-for": `person-${id}`, width: 300 }),
            p({ class: "overview" }, biography),
            section({ class: "movies" },
              h2("Credits"),
              div(Async(get_movie_list(`/person/${id}/credits`), "credits"))
            )
          )
        ),
        li({ class: "next" }, Async(get_nav_person("next"), "next-person"))
      );
}

