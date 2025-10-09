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
    if (e.canIntercept) {
        if (e.sourceElement) {
            e.sourceElement.classList.add("nav-source");
        }
        e.intercept({
            precommitHandler() {
                const {promise, resolve} = Promise.withResolvers();
                document.startViewTransition(() => {
                    resolve();
                    return navigation.transition.finished;
                });
                return promise;
            },

            async handler() {
                await patch_navigation(e.destination.url);
            }
        })
        const cleanup = () => {
            if (e.sourceElement)
                e.sourceElement.classList.remove("nav-source");
         }
         navigation.addEventListener("navigateerror", cleanup, {once: true});
         navigation.addEventListener("navigatesuccess", cleanup, {once: true});
    }
});