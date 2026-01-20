import { render_person } from "./person.js";
import { tmdb_get } from "./helpers.js";
import { render_home } from "./home.js";
import { render_movie } from "./movie.js";

try {
    const result = await tmdb_get("/authentication/guest_session/new");
    self.guest_session_id = result.guest_session_id;
} catch (e) {
    alert("Could not log in");
}

console.log("Worker ready!");

postMessage("ready");

function create_patch(tagname, name, content, method="replace-children") {
    return `
        <template contentmethod="${method}"><${tagname} contentname="${name}">
            ${content}
        </${tagname}></template>
    `;
}

async function process_navigation({
    url, commit, finish, write_patch
}) {
    const home_pattern = new URLPattern("/", url.href);
    const movie_pattern = new URLPattern("/movie/:id", url.href);
    const person_pattern = new URLPattern("/person/:id", url.href);
    const current_list = url.searchParams.get("list");
    
    // Step queue
    const steps = [];
    const step = (promise) => steps.push(promise);

    if (home_pattern.test(url))
        await render_home({ write_patch, step });
    else if (movie_pattern.test(url))
        await render_movie({ id: movie_pattern.exec(url)?.pathname?.groups?.id, current_list, write_patch, step });
    else if (person_pattern.test(url))
        await render_person({ id: person_pattern.exec(url)?.pathname?.groups?.id, current_list, write_patch, step });

    commit();

    // Drain the step queue (handling new steps added during execution)
    while (steps.length > 0) {
        const batch = [...steps];
        steps.length = 0;
        await Promise.all(batch);
    }

    finish();
}

self.addEventListener("message", async e => {
    const writer = e.data.stream.getWriter();
    const port = e.data.port;
    const url = new URL(e.data.url);

    process_navigation({
        url,
        commit: () => port.postMessage("commit"),
        finish: () => port.postMessage("finish"),
        write_patch: (tagname, name, content) => writer.write(create_patch(tagname, name, content))
    });
});
