document.documentElement.dataset.supported = ("streamAppendHTMLUnsafe" in document.body);

const worker = new Worker("/worker.js", {type: "module"});
async function patch_navigation(url) {
    const {readable, writable} = new TransformStream();
    worker.postMessage({url, stream: writable}, [writable]);
    await readable.pipeTo(document.body.streamAppendHTMLUnsafe());
}

await new Promise(resolve => worker.addEventListener("message", () => {
    resolve();
}));

patch_navigation(location.href);

document.addEventListener("scrollsnapchange", e => {
    const snapped = e.snapTargetInline.querySelector(".snap-to-activate");
    if (snapped)
        snapped.click();
}, {capture: true})

window.navigation.addEventListener("navigate", e => {
    if (e.canIntercept) {
        e.intercept({
            async handler() {
                await new Promise(resolve => requestAnimationFrame(resolve));
                const {promise, resolve} = Promise.withResolvers();
                return document.startViewTransition(async () => {
                    resolve();
                    await patch_navigation(e.destination.url)
                }).finished;
            }
        })
    }
});