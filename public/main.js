document.documentElement.dataset.supported = ("patchAll" in document) && ("routeMap" in document);

const worker = new Worker("/worker.js", {type: "module"});
let current_navigation = Promise.resolve();
let did_snap_by_user = false;
/**
 *
 * @param {Request} request
 */
async function patch_navigation(url) {
    const {promise, resolve} = Promise.withResolvers();
    current_navigation = promise;
    const {readable, writable} = new TransformStream();
    worker.postMessage({request: {
        url
    }, stream: writable}, [writable]);
    await readable.pipeTo(document.patchAll());
    for (const item of document.querySelectorAll(".default-item"))
        item.parentElement.scrollLeft = item.offsetLeft;

    did_snap_by_user = false;
    resolve();
}

await new Promise(resolve => worker.addEventListener("message", () => {
    resolve();
}));

patch_navigation(location.href);

document.addEventListener("scrollsnapchange", e => {
    if (!did_snap_by_user) {
        did_snap_by_user = true;
        return;
    }
    const snapped = e.snapTargetInline.querySelector(".snap-to-activate");
    if (snapped)
        snapped.click();
}, {capture: true})

window.navigation.addEventListener("navigate", e => {
    const from = location.href;
    const links_to_cleanup = new Set();
    if (e.canIntercept) {
        if (e.sourceElement) {
            e.sourceElement.classList.add("nav-trigger");
            links_to_cleanup.add(e.sourceElement);
        }
        for (const a of document.querySelectorAll("a[href]")) {
            if (a.href === e.destination.url) {
                a.classList.add("nav-dest");
                a.classList.add("nav");
                links_to_cleanup.add(a);
            }
        }
        e.intercept({
            precommitHandler() {
                const {promise, resolve} = Promise.withResolvers();
                const transition = document.startViewTransition(() => {
                    resolve();
                    return navigation.transition.finished;
                });
                Promise.allSettled([transition.finished]).then(() => {
                    for (const a of links_to_cleanup) {
                        a.classList.remove("nav");
                        a.classList.remove("nav-source");
                        a.classList.remove("nav-dest");
                        a.classList.remove("nav-trigger");
                    }
                });
                return promise;
            },

            async handler() {
                await patch_navigation(e.destination.url);
                for (const a of document.querySelectorAll("a[href]")) {
                    if (a.href === from) {
                        a.classList.add("nav-dest");
                        a.classList.add("nav");
                        links_to_cleanup.add(a);
                        break;
                    }
                }
            }
        })
    }
});