document.documentElement.dataset.supported = ("patchAll" in document) && ("routeMap" in document);

const worker = new Worker("/worker.js", {type: "module"});
let current_navigation = Promise.resolve();
let did_snap_by_user = false;
/**
 *
 * @param {Request} request
 */
async function patch_navigation(url) {
    await current_navigation;
    const {promise, resolve} = Promise.withResolvers();
    document.startViewTransition(() => promise);
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
    console.log({e, snapped})
    if (snapped)
        snapped.click();
}, {capture: true})

window.navigation.addEventListener("navigate", e => {
    if (e.canIntercept) {
        e.intercept({
            async precommitHandler() {
                await patch_navigation(e.destination.url);
            }
        })
    }
});